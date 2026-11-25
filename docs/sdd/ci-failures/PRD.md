# CI failures — research

2026-11-25. Base: Dependabot PR #41 (`e35c02c`), main `74667cd`.

- Run 45688095452 fails typecheck: drizzle-zod 0.8.3 generates Zod 4 schemas, while shared/schema.ts imports Zod 3. Build alone passes and does not validate types.
- Main lock uses drizzle-orm 0.39.3, drizzle-zod 0.7.0, drizzle-kit 0.30.6, Neon 0.10.4. This is the tested compatibility set; preserve schema/auth/storage contracts.
- Drizzle release notes: https://orm.drizzle.team/ (drizzle-zod 0.8.1 / Zod v4 support). The installed dependency types and CI diagnostics establish this project's incompatibility.
- PRs #37/#39/#40/#42 report existing UI defects while the stacked UI work progresses. Do not weaken assertions or mark those failures as passed.

Affected files: package.json, npm-generated package-lock.json, .github/dependabot.yml. Preserve unrelated Dependabot updates. Verify a clean npm ci and npm run verify before publishing the fix.
