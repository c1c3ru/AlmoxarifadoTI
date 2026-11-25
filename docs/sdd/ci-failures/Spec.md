# CI failures — specification

1. MODIFY package.json: restore the compatible Drizzle ORM/Zod/Kit minor lines from main, permitting patches only. Keep Neon 0.10.4 and Zod 3; no application/schema changes.
2. MODIFY package-lock.json through npm install --package-lock-only, then verify with npm ci.
3. MODIFY .github/dependabot.yml: ignore incompatible Drizzle minor lines and Neon >=1 until a coordinated migration is tested; leave security handling and other updates unchanged.
4. Run npm run verify, inspect the diff, commit the minimal correction, update the existing dependency PR and check the new GitHub Actions result. No automatic merge.
