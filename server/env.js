const path = require('path');
const dotenv = require('dotenv');

const EXPECTED_PROJECT_IDS = Object.freeze({
  testing: 'univillage-testing-a640c',
  production: 'univillage-503009',
});

function fail(message) {
  throw new Error(`[env] ${message}`);
}

const requestedAppEnv = process.env.APP_ENV;

if (!requestedAppEnv) {
  fail('APP_ENV is required. Expected "testing" or "production".');
}

if (!Object.prototype.hasOwnProperty.call(EXPECTED_PROJECT_IDS, requestedAppEnv)) {
  fail('Unsupported APP_ENV. Expected "testing" or "production".');
}

const envFilePath = path.join(__dirname, `.env.${requestedAppEnv}`);
const loaded = dotenv.config({ path: envFilePath, override: true });

if (loaded.error && loaded.error.code !== 'ENOENT') {
  fail(`Failed to load .env.${requestedAppEnv}.`);
}

const appEnv = process.env.APP_ENV;

if (appEnv !== requestedAppEnv) {
  fail('APP_ENV in the selected environment file does not match the requested environment.');
}

const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();

if (!projectId) {
  fail('FIREBASE_PROJECT_ID is required.');
}

if (projectId !== EXPECTED_PROJECT_IDS[appEnv]) {
  fail(`Invalid FIREBASE_PROJECT_ID for ${appEnv}. Expected the configured ${appEnv} Firebase project.`);
}

if (!String(process.env.FIREBASE_STORAGE_BUCKET || '').trim()) {
  process.env.FIREBASE_STORAGE_BUCKET = `${projectId}.firebasestorage.app`;
}

const hasPrivateKey = Boolean(String(process.env.FIREBASE_PRIVATE_KEY || '').trim());
const hasClientEmail = Boolean(String(process.env.FIREBASE_CLIENT_EMAIL || '').trim());

if (hasPrivateKey !== hasClientEmail) {
  fail('FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL must be provided together.');
}

module.exports = {
  APP_ENV: appEnv,
  appEnv,
  projectId,
  EXPECTED_PROJECT_IDS,
};
