import { execSync } from "node:child_process";

const maxRetries = Number(process.env.PRISMA_MIGRATE_MAX_RETRIES ?? 5);
const retryDelayMs = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS ?? 3000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrateDeploy() {
  const output = execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    encoding: "utf8",
  });
  if (output?.trim()) {
    console.log(output);
  }
}

async function main() {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      runMigrateDeploy();
      return;
    } catch (error) {
      const message = [
        error instanceof Error ? error.message : String(error ?? ""),
        error && typeof error === "object" && "stdout" in error
          ? String(error.stdout ?? "")
          : "",
        error && typeof error === "object" && "stderr" in error
          ? String(error.stderr ?? "")
          : "",
      ].join("\n");

      if (message.trim()) {
        console.error("[prisma-migrate-retry] migrate deploy failed:");
        console.error(message);
      }

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
