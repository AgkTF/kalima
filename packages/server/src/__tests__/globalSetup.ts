import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export default function setup() {
  const prismaDir = resolve(import.meta.dirname, "../../prisma");
  const devDb = resolve(prismaDir, "dev.db");
  const testDb = resolve(prismaDir, "test.db");

  // Ensure dev.db exists (it's the source of truth for schema)
  if (!existsSync(devDb)) {
    throw new Error(
      `dev.db not found at ${devDb}. Run 'prisma migrate dev' first.`,
    );
  }

  // Copy dev.db → test.db for a clean test database
  copyFileSync(devDb, testDb);
}
