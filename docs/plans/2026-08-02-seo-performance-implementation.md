# SEO and Performance Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve search-engine metadata, remove the render-blocking font dependency, fix automated contrast failures, and ship Apache redirects and caching inside the GitHub release artifact.

**Architecture:** Keep Astro's static output and extend the existing base layout with typed metadata and build-time JSON-LD. Vendor the two Latin WOFF2 font files, copy Apache configuration from `public/`, and verify generated HTML with a dependency-free Node script. Preserve the shared Gitea/GitHub build gate while keeping production packaging exclusive to GitHub.

**Tech Stack:** Astro 7, TypeScript, plain CSS, Node.js assertions, Apache `.htaccess`, GitHub Actions, Lighthouse 13.

---

### Task 1: Add a failing generated-site verifier

**Files:**
- Create: `scripts/verify-build.mjs`
- Modify: `package.json`

**Step 1: Create the verifier**

Write a Node script that reads `dist/index.html`, `dist/404.html`, the blog index, and every generated blog post. Use `node:assert/strict` to require:

- one canonical URL and one meta description per HTML page;
- parseable JSON-LD on the home page and each blog post;
- `SoftwareApplication` in the home JSON-LD graph;
- `BlogPosting`, article Open Graph metadata, dates, and author on each post;
- `noindex, follow` on the 404 page;
- no reference to `fonts.googleapis.com` or `fonts.gstatic.com`;
- a generated `dist/.htaccess` file.

The script should end with `Verified generated SEO and deploy metadata.` and exit nonzero on the first failed assertion.

**Step 2: Add build-check scripts**

Add these entries to `package.json`:

```json
"check": "npm run build && npm run verify:build",
"verify:build": "node scripts/verify-build.mjs"
```

**Step 3: Run the verifier against the current build**

Run: `npm run build && npm run verify:build`

Expected: FAIL because the current output has no JSON-LD and no `dist/.htaccess`.

**Step 4: Commit the failing verifier**

```bash
git add package.json scripts/verify-build.mjs
git commit -m "test: verify generated SEO metadata"
```

### Task 2: Add typed global and home-page SEO metadata

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`

**Step 1: Extend the base layout contract**

Add these optional props:

```ts
type OpenGraphType = 'website' | 'article';
type StructuredData = Record<string, unknown>;

interface Props {
  title?: string;
  description?: string;
  image?: string;
  ogType?: OpenGraphType;
  robots?: string;
  publishedTime?: Date;
  updatedTime?: Date;
  author?: string;
  tags?: string[];
  structuredData?: StructuredData;
}
```

Default `ogType` to `website` and `robots` to `index, follow`. Convert the canonical and image URLs to strings before using them in metadata.

Emit:

```astro
<meta name="robots" content={robots} />
<meta property="og:type" content={ogType} />
{
  ogType === 'article' && (
    <>
      {publishedTime && <meta property="article:published_time" content={publishedTime.toISOString()} />}
      {updatedTime && <meta property="article:modified_time" content={updatedTime.toISOString()} />}
      {author && <meta property="article:author" content={author} />}
      {tags?.map((tag) => <meta property="article:tag" content={tag} />)}
    </>
  )
}
{structuredData && (
  <script
    type="application/ld+json"
    set:html={JSON.stringify(structuredData).replace(/</g, '\\u003c')}
  />
)}
```

Keep the existing title, description, canonical, Open Graph image, Twitter card, RSS, favicon, and generator metadata.

**Step 2: Add home-page JSON-LD**

In `src/pages/index.astro`, construct a single `@context` object with an `@graph` containing:

- a `WebSite` node with the canonical URL, name, and page description;
- a `SoftwareApplication` node with name, description, application category, cross-platform operating system, canonical URL, repository URL, MIT license URL, and a zero-price `Offer`.

Pass that object through `structuredData` on `<Base>`.

**Step 3: Build and inspect the home page**

Run: `npm run build`

Expected: PASS. `dist/index.html` contains one canonical tag, `robots=index, follow`, and parseable JSON-LD containing `WebSite` and `SoftwareApplication`.

**Step 4: Commit global and home metadata**

```bash
git add src/layouts/Base.astro src/pages/index.astro
git commit -m "feat: add structured product metadata"
```

### Task 3: Add article metadata and exclude the 404 page

**Files:**
- Modify: `src/layouts/Post.astro`
- Modify: `src/pages/404.astro`

**Step 1: Construct article JSON-LD**

In `Post.astro`, derive absolute canonical and hero-image URLs from `Astro.url.pathname` and `Astro.site`. Create a `BlogPosting` object containing:

```ts
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: title,
  description,
  image: absoluteHeroImage,
  datePublished: pubDate.toISOString(),
  dateModified: (updatedDate ?? pubDate).toISOString(),
  author: { '@type': 'Person', name: author },
  publisher: { '@type': 'Organization', name: 'Expressive Tea Team' },
  mainEntityOfPage: canonicalURL,
  keywords: tags?.join(', '),
};
```

Pass `ogType="article"`, dates, author, tags, and `structuredData` to `Base`.

**Step 2: Mark the 404 page for exclusion**

Pass `robots="noindex, follow"` to `Base` in `src/pages/404.astro`.

**Step 3: Build and inspect posts and 404 output**

Run: `npm run build`

Expected: PASS. Each post contains article metadata and parseable `BlogPosting` JSON-LD. `dist/404.html` contains `noindex, follow` and no indexable structured-data entity.

**Step 4: Commit article and 404 metadata**

```bash
git add src/layouts/Post.astro src/pages/404.astro
git commit -m "feat: describe blog posts to search engines"
```

### Task 4: Self-host the heading font and fix contrast

**Files:**
- Create: `public/fonts/zen-maru-gothic-latin-500.woff2`
- Create: `public/fonts/zen-maru-gothic-latin-700.woff2`
- Create: `public/fonts/OFL.txt`
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/global.css`
- Modify: `src/components/sections/RunsEverywhere.astro`
- Modify: `src/components/sections/SeeIt.astro`

**Step 1: Vendor the exact Latin font files**

Download the Google Fonts v19 Latin WOFF2 assets and the Zen Maru Gothic OFL license. Record and verify these SHA-256 hashes:

```text
2c5953da616e5e6dcad34ae8b744f7e759f1647c041389681fa2360908508d55  zen-maru-gothic-latin-500.woff2
9d65f92a3e11edcef9d73694b5b73cb6888243aee54e8034b162eb368c6ff3ed  zen-maru-gothic-latin-700.woff2
```

**Step 2: Declare local font faces**

Remove `@import './brand.css';` from `src/styles/global.css`. Add two `@font-face` rules using the local files, `font-style: normal`, weights 500 and 700, `font-display: swap`, and the Latin unicode range supplied by Google Fonts.

The detached `src/styles/brand.css` belongs to the separate Starlight docs theme and must not load in this marketing build.

**Step 3: Remove the external font connection**

Delete the Google Fonts preconnect and stylesheet tags from `Base.astro`. Add one preload:

```astro
<link
  rel="preload"
  href="/fonts/zen-maru-gothic-latin-700.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

**Step 4: Fix both Lighthouse contrast findings**

Remove `opacity: 0.75` from `.runs__caveat` so it inherits the accessible `--dim` color at full opacity. Change the Astro `Code` theme in `SeeIt.astro` from `github-dark` to `github-dark-high-contrast`.

**Step 5: Build and check output dependencies**

Run: `npm run build && ! rg 'fonts\\.(googleapis|gstatic)\\.com' dist`

Expected: PASS. The font files exist under `dist/fonts`, and no generated page references Google-hosted fonts.

**Step 6: Commit font and contrast changes**

```bash
git add public/fonts src/layouts/Base.astro src/styles/global.css \
  src/components/sections/RunsEverywhere.astro src/components/sections/SeeIt.astro
git commit -m "perf: self-host heading fonts"
```

### Task 5: Ship Apache behavior in the static build

**Files:**
- Create: `public/.htaccess`

**Step 1: Add the canonical HTTPS redirect**

Use `mod_rewrite` under `IfModule`. When `%{HTTPS}` is not `on`, redirect with status 301 to `https://green-tea.expressive-tea.io%{REQUEST_URI}`. Use `NE` and `L` flags.

**Step 2: Add guarded caching and compression**

Under guarded `mod_expires` and `mod_headers` blocks:

- cache fingerprinted CSS, JavaScript, SVG, and image assets for one year with `immutable`;
- cache WOFF2 files for one year;
- cache ordinary images and icons for seven days;
- mark HTML as immediately stale with `public, max-age=0, must-revalidate`.

Use `mod_deflate` for HTML, CSS, JavaScript, JSON, XML, SVG, and plain text. Do not add rewrites for Astro routes.

**Step 3: Verify Astro copies the dotfile**

Run: `npm run check`

Expected: PASS and print `Verified generated SEO and deploy metadata.` Confirm `test -f dist/.htaccess` exits zero.

**Step 4: Commit Apache configuration**

```bash
git add public/.htaccess
git commit -m "perf: ship Apache caching and HTTPS redirect"
```

### Task 6: Keep packaging exclusive to GitHub and enforce the artifact contract

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`

**Step 1: Run generated-output checks in the shared build gate**

Replace `npm run build` with `npm run check` in `ci.yml`. This check may run on GitHub and Gitea; it creates no release artifact.

**Step 2: Verify the release archive in the GitHub-only job**

Keep the existing job condition:

```yaml
if: ${{ github.server_url == 'https://github.com' }}
```

Replace the release build command with `npm run check`. After packaging, add:

```yaml
- name: Verify package contents
  run: tar -tzf "green-tea-site-${{ github.ref_name }}.tar.gz" | grep -Fx './.htaccess'
```

Do not change `.github/workflows/promote.yml` and do not add a Gitea artifact job.

**Step 3: Inspect the workflow diff**

Run: `git diff --check && git diff -- .github/workflows/ci.yml .github/workflows/release.yml`

Expected: both workflows use `npm run check`; only `release.yml` contains `tar`, `softprops/action-gh-release`, and the `github.com` job guard.

**Step 4: Commit workflow verification**

```bash
git add .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "ci: verify the GitHub release artifact"
```

### Task 7: Run final build and Lighthouse verification

**Files:**
- Modify if needed: files changed in Tasks 1-6

**Step 1: Run repository checks**

Run:

```bash
npm run check
git diff --check
```

Expected: both commands pass.

**Step 2: Reproduce the GitHub archive locally**

Run:

```bash
tar -czf /tmp/green-tea-site-seo-audit.tar.gz -C dist .
tar -tzf /tmp/green-tea-site-seo-audit.tar.gz | grep -Fx './.htaccess'
```

Expected: `./.htaccess`.

**Step 3: Serve the production build**

Run: `npm run preview -- --host 127.0.0.1`

Keep the preview process running for the next two steps.

**Step 4: Run mobile Lighthouse**

Run Lighthouse 13 against `http://127.0.0.1:4321/` with mobile simulated throttling and JSON output.

Expected: 100 SEO, 100 best practices, no color-contrast failure, no Google Fonts request, TBT of 0 milliseconds, and performance at or above the deployed baseline of 96 when measured under equivalent settings.

**Step 5: Run desktop Lighthouse**

Run Lighthouse 13 with the desktop preset.

Expected: 100 SEO, 100 best practices, no color-contrast failure, and performance at or above the deployed baseline of 95 when measured under equivalent settings.

**Step 6: Inspect generated metadata and Git state**

Run:

```bash
rg -n 'application/ld\\+json|article:published_time|noindex, follow' dist/index.html dist/blog dist/404.html
git status --short --branch
```

Expected: all metadata is present and only intentional changes remain.

**Step 7: Commit any verification-driven correction**

If Lighthouse required a correction, stage only that correction and commit it with a focused message. Do not create an empty verification commit.
