import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getCredential() {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        return admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Firebase credentials must be provided via environment variables in production (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
    }
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        ?? path.join(__dirname, '..', 'serviceAccountKey.json');
    try {
        const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
        return admin.credential.cert(serviceAccount);
    } catch (err) {
        throw new Error(`Failed to load Firebase service account from ${keyPath}: ${err.message}`);
    }
}

if (!admin.apps.length) {
    admin.initializeApp({ credential: getCredential() });
}

export default admin;
