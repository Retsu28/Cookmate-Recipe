/**
 * Firebase Admin SDK initialization.
 *
 * Verifies Firebase ID tokens issued to the web/mobile clients and
 * exposes a single `verifyFirebaseIdToken(token)` helper used by
 * the auth controller's POST /api/auth/firebase exchange.
 *
 * Credentials are loaded in this order:
 *   1) FIREBASE_SERVICE_ACCOUNT  -- a JSON string (recommended for prod)
 *   2) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   3) ./firebase-service-account.json (relative to api/ root) for local dev
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

let cachedApp = null;
let initError = null;

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON: ' + err.message);
    }
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      project_id: FIREBASE_PROJECT_ID,
      client_email: FIREBASE_CLIENT_EMAIL,
      // Allow newline-escaped keys when the var is set via .env / hosting UIs.
      private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  const localPath = path.resolve(__dirname, '..', '..', 'firebase-service-account.json');
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  }

  const apiRoot = path.resolve(__dirname, '..', '..');
  const downloadedKey = fs
    .readdirSync(apiRoot)
    .find((file) => file.endsWith('.json') && file.includes('firebase-adminsdk'));
  if (downloadedKey) {
    return JSON.parse(fs.readFileSync(path.join(apiRoot, downloadedKey), 'utf8'));
  }

  return null;
}

function getApp() {
  if (cachedApp) return cachedApp;
  if (initError) throw initError;

  try {
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      throw new Error(
        'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT (JSON), ' +
          'or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, ' +
          'or place api/firebase-service-account.json next to package.json.'
      );
    }

    cachedApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key,
          }),
        });

    return cachedApp;
  } catch (err) {
    initError = err;
    throw err;
  }
}

async function verifyFirebaseIdToken(idToken) {
  const app = getApp();
  return app.auth().verifyIdToken(idToken, true);
}

function getFirebaseAuth() {
  return getApp().auth();
}

module.exports = { verifyFirebaseIdToken, getFirebaseAuth, getApp };
