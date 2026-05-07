/**
 * Verifies a Google ID token (JWT credential) issued to our OAuth Client ID.
 *
 * Expects env `GOOGLE_CLIENT_ID` — the Web OAuth Client ID from Google Cloud
 * Console. The same ID must be used on the frontend (GIS button).
 *
 * Returns the verified payload: { sub, email, email_verified, name, picture, ... }
 * or throws on invalid / expired / wrong-audience tokens.
 */
const { OAuth2Client } = require('google-auth-library');

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'GOOGLE_CLIENT_ID is not set. Add it to api/.env to enable Google Sign-In.'
    );
  }
  cachedClient = new OAuth2Client(clientId);
  return cachedClient;
}

async function verifyGoogleIdToken(idToken) {
  const client = getClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

module.exports = { verifyGoogleIdToken };
