# SEO and performance improvement design

Date: 2026-08-02

## Goal

Make the public site easier for search engines to understand and faster on a cold mobile load. Preserve the current visual design, static Astro architecture, and two-forge release flow.

## Baseline

Lighthouse 13 measured the deployed home page at 96 performance, 96 accessibility, 100 best practices, and 100 SEO on mobile. The desktop scores were 95, 96, 100, and 100. Mobile FCP and LCP were 2.3 seconds, TBT was 0 milliseconds, and CLS was 0.001.

The audit found five material gaps:

- Google Fonts blocks rendering and accounts for about 990 milliseconds of estimated savings.
- Hashed CSS and SVG assets have no explicit browser cache lifetime.
- HTTP serves a second working copy instead of redirecting to HTTPS.
- Pages lack product and article structured data.
- Two text treatments fail WCAG color contrast checks.

The sitemap, canonical URLs, robots file, HTTPS pages, and real 404 status already work.

## Design

### Metadata and structured data

Extend `Base.astro` with explicit page type, robots, publication metadata, and JSON-LD inputs. The home page will describe Green Tea as a software application and website. Blog posts will emit `BlogPosting` data, `og:type=article`, publication and modification dates, author, and tags. The 404 page will emit `noindex, follow`.

Keep canonical URLs derived from `Astro.site`. Serialize structured data from trusted build-time objects and render it as an `application/ld+json` script.

### Font delivery and accessibility

Remove the Google Fonts stylesheet from the page and unused Starlight brand imports from the marketing site's global CSS. Host only the WOFF2 files required for Zen Maru Gothic weights 500 and 700 under `public/fonts`, declare them with `font-display: swap`, and preload only the heading face needed above the fold.

Adjust the muted runtime caveat and syntax-comment colors until Lighthouse reports sufficient contrast. Do not change layout, spacing, copy, or component structure.

### Apache behavior

Add `public/.htaccess` so Astro copies it to `dist/.htaccess`. It will:

- redirect HTTP requests to the same HTTPS URL;
- assign a long immutable cache lifetime to hashed `/_astro/` assets;
- assign shorter cache lifetimes to fonts and static images;
- enable compression when the host provides `mod_deflate` or `mod_brotli`;
- avoid changing routes or the existing 404 behavior.

Every directive that depends on an optional Apache module will use an `IfModule` guard. The release must remain compatible with the current cPanel Apache host.

### Release boundary

GitHub remains the only forge that packages a production artifact. `.github/workflows/release.yml` already restricts its package job to `github.com` and creates `green-tea-site-<tag>.tar.gz` with `tar -C dist .`, which includes dotfiles.

Add a release validation step after the build that fails unless `dist/.htaccess` exists. Gitea will continue to run the shared build gate and promotion workflow, but it will not package or publish a release artifact.

## Verification

Run a clean production build and verify:

- `dist/.htaccess` exists and appears in a locally created tar listing;
- every indexable page has one canonical URL, description, and valid JSON-LD;
- the 404 page has `noindex, follow`;
- the sitemap lists only indexable public pages;
- no generated page requests Google Fonts;
- internal production links return expected statuses;
- Lighthouse mobile and desktop improve or hold their baseline scores;
- Lighthouse reports no automated SEO or contrast failures.

The final report will separate local build results from behavior that requires the new artifact to be deployed on Apache.

## Non-goals

This change will not redesign the site, add analytics, create keyword-stuffed copy, submit the site to Search Console, modify the documentation build under `/docs`, or create release archives in Gitea.
