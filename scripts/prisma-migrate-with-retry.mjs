import { execSync } from "node:child_process";

const maxRetries = Number(process.env.PRISMA_MIGRATE_MAX_RETRIES ?? 5);
const retryDelayMs = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS ?? 3000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrateDeploy() {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}

async function main() {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      runMigrateDeploy();
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      const isAdvisoryLockTimeout =
        message.includes("P1002") && message.includes("pg_advisory_lock");

      if (!isAdvisoryLockTimeout || attempt === maxRetries) {
        throw error;
      }

      console.warn(
        `[prisma-migrate-retry] advisory lock timeout. retry ${attempt}/${maxRetries} in ${retryDelayMs}ms`,
      );
      await sleep(retryDelayMs);
    }
  }
}

await main();
