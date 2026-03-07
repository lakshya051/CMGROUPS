import fs from 'fs';
import path from 'path';
import process from 'process';
import admin from 'firebase-admin';

let initAttempted = false;
let messagingInstance = null;
let initState = {
    enabled: false,
    available: false,
    reason: 'Push notifications are disabled.',
};

function parseServiceAccountJson(rawJson) {
    if (!rawJson || !rawJson.trim()) {
        return null;
    }

    try {
        return JSON.parse(rawJson);
    } catch (error) {
        console.error('[push] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
        return null;
    }
}

function readServiceAccountFile(filePath) {
    if (!filePath || !filePath.trim()) {
        return null;
    }

    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedPath)) {
        console.warn(`[push] Firebase service account file not found at ${resolvedPath}`);
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } catch (error) {
        console.error(`[push] Failed to read Firebase service account file at ${resolvedPath}:`, error.message);
        return null;
    }
}

function resolvePushConfig() {
    const enabledEnv = process.env.PUSH_NOTIFICATIONS_ENABLED?.trim().toLowerCase();
    const jsonConfig = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    const pathConfig = readServiceAccountFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const credential = jsonConfig || pathConfig;
    const enabled = enabledEnv ? enabledEnv === 'true' : Boolean(credential);

    if (!enabled) {
        return {
            enabled,
            credential: null,
            reason: 'Set PUSH_NOTIFICATIONS_ENABLED=true and provide Firebase service-account credentials to enable push notifications.',
        };
    }

    if (!credential) {
        return {
            enabled,
            credential: null,
            reason: 'Push notifications are enabled but Firebase credentials are missing.',
        };
    }

    return {
        enabled,
        credential,
        reason: '',
    };
}

function initializeFirebaseAdmin() {
    if (initAttempted) {
        return;
    }

    initAttempted = true;

    const config = resolvePushConfig();
    initState = {
        enabled: config.enabled,
        available: false,
        reason: config.reason,
    };

    if (!config.enabled || !config.credential) {
        console.warn(`[push] ${config.reason}`);
        return;
    }

    try {
        const app = admin.apps.length > 0
            ? admin.app()
            : admin.initializeApp({
                credential: admin.credential.cert(config.credential),
            });

        messagingInstance = admin.messaging(app);
        initState = {
            enabled: true,
            available: true,
            reason: '',
        };
        console.log('[push] Firebase Admin initialized successfully.');
    } catch (error) {
        initState = {
            enabled: true,
            available: false,
            reason: error.message,
        };
        console.error('[push] Firebase Admin initialization failed:', error.message);
    }
}

export function getFirebaseMessaging() {
    initializeFirebaseAdmin();
    return messagingInstance;
}

export function getPushState() {
    initializeFirebaseAdmin();
    return { ...initState };
}
