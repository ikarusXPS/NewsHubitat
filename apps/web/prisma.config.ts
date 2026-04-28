// Prisma 7+ config for the apps/web workspace package.
//
// This file MUST live in apps/web/ (alongside prisma/schema.prisma), NOT at the
// repository root. Phase 36.2-03 documented that a root-level prisma.config.ts
// resolves `schema:` relative to its own directory rather than cwd, which caused
// the ApiKey-drop incident when the stale root prisma/ duplicate was loaded
// instead of apps/web/prisma/. Phase 36.3-03 deleted the entire root prisma/
// tree along with the root prisma.config.ts, making this workspace-local
// config the sole source of truth for Prisma CLI invocations.
//
// Rationale for re-creating prisma.config.ts here (Rule 3 auto-fix during 36.3-03):
//   - apps/web/prisma/schema.prisma's datasource block intentionally has no
//     `url = env("DATABASE_URL")` line (per the existing comment "URL defined
//     in prisma.config.ts (Prisma 7+)"). Prisma 7 requires the datasource url
//     via either schema OR config; we honor the established team decision and
//     use this config.
//   - `schema: "prisma/schema.prisma"` resolves correctly because this config
//     lives in apps/web/, so the relative path lands on the canonical schema
//     no matter where the CLI is invoked from.
//   - This file is INSIDE apps/web/ — it is part of the workspace package, not
//     an orphan root duplicate. The 36.2-03 / 36.3-03 anti-pattern was
//     "prisma.config.ts at the REPO ROOT", not "prisma.config.ts anywhere".

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
