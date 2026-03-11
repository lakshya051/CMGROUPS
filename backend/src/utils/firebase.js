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
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        ?? path.join(__dirname, '..', ' serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    return admin.credential.cert(serviceAccount);
}

if (!admin.apps.length) {
    admin.initializeApp({ credential: getCredential() });
}

export default admin;
