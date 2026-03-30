import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasValidConfig =
    typeof firebaseConfig.apiKey === 'string' &&
    firebaseConfig.apiKey.length > 0 &&
    typeof firebaseConfig.appId === 'string' &&
    firebaseConfig.appId.length > 0;

let app = null;
let auth = null;
let appCheck = null;

if (hasValidConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey) {
        try {
            appCheck = initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                isTokenAutoRefreshEnabled: true,
            });
        } catch (e) {
            console.warn('Firebase App Check initialization failed:', e);
        }
    }
}

export { auth, appCheck };
export default app;
