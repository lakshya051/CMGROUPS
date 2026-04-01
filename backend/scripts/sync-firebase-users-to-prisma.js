/**
 * Ensures every Firebase Auth user has a matching Prisma User row (so Admin → Users lists them).
 * Mirrors POST /api/auth/register linking rules: firebaseUid first, then email merge, then create.
 *
 * Usage:
 *   node --env-file=.env scripts/sync-firebase-users-to-prisma.js --report-only
 *   node --env-file=.env scripts/sync-firebase-users-to-prisma.js --apply
 *
 * Default (no flags) is report-only for safety.
 *
 * TLS / "self-signed certificate in certificate chain" (common behind corporate SSL inspection):
 *   Preferred: export NODE_EXTRA_CA_CERTS=/path/to/your-org-root-ca.pem
 *   Then run the script as usual.
 *   Dev-only workaround: FIREBASE_ADMIN_INSECURE_TLS=1 (disables TLS verification for this process).
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function loadFirebaseAdmin() {
    if (process.env.FIREBASE_ADMIN_INSECURE_TLS === '1') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        console.warn(
            '[sync-firebase-users] FIREBASE_ADMIN_INSECURE_TLS=1: TLS certificate verification is disabled for this run only. Prefer NODE_EXTRA_CA_CERTS with your corporate root CA.'
        );
    }
    return import('../src/utils/firebase.js').then((m) => m.default);
}

function generateReferralCode() {
    return 'TN' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function adminEmailSet() {
    const raw = process.env.ADMIN_EMAILS || 'lakshyavarshney2003@gmail.com';
    return new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

function isAdminEmail(email) {
    return Boolean(email && adminEmailSet().has(email.trim().toLowerCase()));
}

async function listAllFirebaseUsers(admin) {
    const out = [];
    let pageToken;
    do {
        const res = await admin.auth().listUsers(1000, pageToken);
        out.push(...res.users);
        pageToken = res.pageToken;
    } while (pageToken);
    return out;
}

async function ensureReferralCode(tx) {
    let code;
    let unique = false;
    while (!unique) {
        code = generateReferralCode();
        const found = await tx.user.findFirst({ where: { referralCode: code } });
        if (!found) unique = true;
    }
    return code;
}

async function syncOne(record, apply) {
    const uid = record.uid;
    const email = record.email?.trim() || null;
    const displayName = record.displayName?.trim() || null;
    const resolvedEmail = email || `firebase_${uid}@noemail.local`;

    const byUid = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (byUid) {
        return { action: 'already_linked', uid, dbId: byUid.id };
    }

    if (email) {
        const byEmail = await prisma.user.findUnique({ where: { email } });
        if (byEmail) {
            if (apply) {
                await prisma.user.update({
                    where: { id: byEmail.id },
                    data: {
                        firebaseUid: uid,
                        ...(isAdminEmail(email) ? { role: 'admin' } : {}),
                    },
                });
                return { action: 'linked_by_email', uid, dbId: byEmail.id, email };
            }
            return { action: 'would_link_by_email', uid, dbId: byEmail.id, email };
        }
    }

    const placeholderConflict = await prisma.user.findUnique({ where: { email: resolvedEmail } });
    if (placeholderConflict && placeholderConflict.firebaseUid && placeholderConflict.firebaseUid !== uid) {
        return {
            action: 'skip_email_conflict',
            uid,
            email: resolvedEmail,
            reason: 'email row owned by another firebaseUid',
        };
    }

    if (apply) {
        if (placeholderConflict) {
            await prisma.user.update({
                where: { id: placeholderConflict.id },
                data: {
                    firebaseUid: uid,
                    ...(displayName && !placeholderConflict.name ? { name: displayName } : {}),
                    ...(isAdminEmail(email) ? { role: 'admin' } : {}),
                },
            });
            return { action: 'updated_placeholder_row', uid, email: resolvedEmail, dbId: placeholderConflict.id };
        }
        const created = await prisma.$transaction(async (tx) => {
            const code = await ensureReferralCode(tx);
            return tx.user.create({
                data: {
                    firebaseUid: uid,
                    email: resolvedEmail,
                    name: displayName,
                    referralCode: code,
                    role: isAdminEmail(email) ? 'admin' : 'customer',
                },
            });
        });
        return { action: 'created', uid, email: resolvedEmail, dbId: created.id };
    }

    return {
        action: placeholderConflict ? 'would_update_placeholder' : 'would_create',
        uid,
        email: resolvedEmail,
    };
}

async function main() {
    const args = new Set(process.argv.slice(2));
    const apply = args.has('--apply');
    const reportOnly = args.has('--report-only') || !apply;

    const admin = await loadFirebaseAdmin();
    const firebaseUsers = await listAllFirebaseUsers(admin);
    const prismaUsers = await prisma.user.findMany({
        select: { id: true, firebaseUid: true, email: true },
    });

    const prismaByUid = new Map(prismaUsers.filter((u) => u.firebaseUid).map((u) => [u.firebaseUid, u]));
    const firebaseUids = new Set(firebaseUsers.map((u) => u.uid));

    const inFirebaseNotLinked = firebaseUsers.filter((u) => !prismaByUid.has(u.uid));

    const staleInDb = prismaUsers.filter((u) => u.firebaseUid && !firebaseUids.has(u.firebaseUid));

    console.log('--- Report ---');
    console.log(`Firebase users:        ${firebaseUsers.length}`);
    console.log(`Prisma users:            ${prismaUsers.length}`);
    console.log(`Firebase not linked yet: ${inFirebaseNotLinked.length}`);
    console.log(`Prisma firebaseUid stale (no Firebase account): ${staleInDb.length}`);

    if (staleInDb.length > 0 && staleInDb.length <= 30) {
        console.log('Stale rows:', staleInDb.map((u) => ({ id: u.id, email: u.email, firebaseUid: u.firebaseUid })));
    } else if (staleInDb.length > 30) {
        console.log(`(First 10 stale):`, staleInDb.slice(0, 10).map((u) => ({ id: u.id, email: u.email })));
    }

    if (reportOnly && !args.has('--apply')) {
        console.log('\nPlanned actions for unlinked Firebase users:');
        for (const rec of inFirebaseNotLinked) {
            const plan = await syncOne(rec, false);
            console.log(`  ${plan.action}`, plan.uid, plan.email || plan.dbId || '');
        }
        console.log('\nRe-run with --apply to write changes.');
        return;
    }

    if (apply) {
        console.log('\n--- Applying ---');
        let ok = 0;
        for (const rec of inFirebaseNotLinked) {
            const r = await syncOne(rec, true);
            console.log(r.action, r.uid, r.email || r.dbId || r.reason || '');
            if (r.action !== 'skip_email_conflict') ok += 1;
        }
        console.log(`\nProcessed ${ok} unlinked Firebase user(s).`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
