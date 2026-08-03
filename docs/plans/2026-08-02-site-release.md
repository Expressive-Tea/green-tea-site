# Green Tea Site 26.8.0-beta.0 Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish an accurate `26.8.0-beta.0` release post, align site claims with the core, remediate site dependency advisories, and enforce tag/package version agreement.

**Architecture:** Keep the existing Gitea-main-to-GitHub promotion unchanged. Add a small dependency-free release metadata guard, wire security gates into existing workflows, and rely on Astro's content collection plus the existing generated-site verifier for the new post.

**Tech Stack:** Astro 7, MDX, Node.js 22, `node:test`, npm, Gitea Actions, GitHub Actions.

---

### Task 1: Guard release version metadata

**Files:**
- Create: `scripts/verify-release-tag.mjs`
- Create: `scripts/verify-release-tag.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/release.yml`

**Step 1: Write failing tests**

Test that `assertReleaseTag('v26.8.0-beta.0', '26.8.0-beta.0')` succeeds and that missing `v`, a different version, a slash, or an empty tag throws an error naming the expected tag.

**Step 2: Verify RED**

Run: `node --test scripts/verify-release-tag.test.mjs`

Expected: FAIL because `verify-release-tag.mjs` does not exist.

**Step 3: Implement the guard**

Export `assertReleaseTag(tag, version)`, load `package.json` when run as a script, and require exact equality with `v${version}`. Add `verify:release` and `test` scripts, then replace the workflow's slash-only shell check with `npm run verify:release`.

**Step 4: Verify GREEN**

Run: `npm test`

Expected: all release-tag tests pass.

### Task 2: Remediate dependency advisories

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Capture the vulnerable baseline**

Run: `npm audit --audit-level=moderate`

Expected: FAIL with advisories for Astro, PostCSS, SVGO, and fast-xml-parser.

**Step 2: Apply compatible updates**

Update Astro to `^7.1.6` and `@astrojs/mdx` to `^7.0.5`, regenerating the lockfile without changing the site's CalVer.

**Step 3: Verify remediation**

Run: `npm audit --audit-level=moderate`

Expected: 0 vulnerabilities.

### Task 3: Align landing-page claims

**Files:**
- Modify: `src/components/sections/Hero.astro`
- Modify: `src/components/sections/Batteries.astro`
- Modify: `src/components/sections/RunsEverywhere.astro`

**Step 1: Replace over-broad claims**

Name Node, Deno, Bun, and Cloudflare Workers explicitly; say that validation adds no validator dependency to core; qualify native TLS as a Node-adapter capability.

**Step 2: Review against core documentation**

Compare every changed sentence with `../green-tea/README.md`, `CHANGELOG.md`, and runtime/security guides.

### Task 4: Publish the release post

**Files:**
- Create: `src/content/blog/green-tea-26-8-0-beta-0.mdx`

**Step 1: Write the release narrative**

Use English to match the site. Cover safe constrained parameters, static-to-catch-all precedence, rejected repeated slashes and malformed encoding, HEAD/OPTIONS behavior, OpenAPI patterns, four runtime targets, and dependency audit work.

**Step 2: State beta limits explicitly**

Document that constraints are a bounded safe subset rather than arbitrary regex, matching is still a linear scan, and a radix tree remains post-beta work.

**Step 3: Verify generated content**

Run: `npm run check`

Expected: the new post route builds and generated SEO/deploy metadata verifies.

### Task 5: Enforce supply-chain checks in automation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`

**Step 1: Add audit gates**

Run `npm audit --audit-level=moderate` after `npm ci` in CI and immediately before the release build.

**Step 2: Preserve forge boundaries**

Confirm CI remains dual-forge, promotion remains Gitea-only, and release remains GitHub-only on `v*` tags.

### Task 6: Final verification and handoff

**Files:**
- Review: all changed files

**Step 1: Run complete verification**

Run: `npm ci && npm test && npm audit --audit-level=moderate && npm run check`

Expected: clean install, all tests pass, 0 vulnerabilities, site and metadata checks pass.

**Step 2: Exercise tag validation**

Run: `RELEASE_TAG=v26.8.0-beta.0 npm run verify:release`

Expected: exact version accepted.

Run: `RELEASE_TAG=v26.8.0-beta.1 npm run verify:release`

Expected: non-zero exit and a message expecting `v26.8.0-beta.0`.

**Step 3: Review Git state**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors and only planned files changed.

**Step 4: Commit and publish branch**

Create focused commits without co-author trailers, push `feature/26.8.0-beta.0-release` to Gitea, and open a PR to `main`. Do not create the GitHub release tag until promotion completes.
