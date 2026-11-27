const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_BACKEND_URL",
] as const;

const EXPECTED_PROJECT_IDS = {
  testing: "univillage-testing-a640c",
  production: "univillage-503009",
} as const;

export function validateClientEnv(mode: string, env: Record<string, unknown>): void {
  if (mode !== "testing" && mode !== "production") {
    throw new Error("Unsupported Vite mode. Use --mode testing or --mode production.");
  }

  const readEnvValue = (key: string) => String(env[key] ?? "").trim();
  const missing = REQUIRED_ENV_KEYS.filter((key) => !readEnvValue(key));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for ${mode}: ${missing.join(", ")}.`
    );
  }

  const expectedProjectId = EXPECTED_PROJECT_IDS[mode];
  if (readEnvValue("VITE_FIREBASE_PROJECT_ID") !== expectedProjectId) {
    throw new Error(
      `Invalid VITE_FIREBASE_PROJECT_ID for ${mode}. Expected the configured ${mode} Firebase project.`
    );
  }
}
