# Green Tea. — marketing site

The public marketing site for [Green Tea](https://green-tea.dev), a zen, opinionated, type-safe graph-pipeline HTTP
framework. Built with [Astro](https://astro.build) — the landing page, blog, and brand shell live here. The
framework's technical docs live in a separate repository and are only linked from this site, not rebuilt here.

## Stack

- [Astro](https://astro.build) (static output)
- [MDX](https://docs.astro.build/en/guides/integrations-guide/mdx/) for blog content
- [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) for `sitemap-index.xml`
- Plain CSS (custom properties for the brand palette), no CSS framework
- No CMS, no client-side JS framework, no analytics

## Requirements

- Node.js >= 22.12.0

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:4321`.

## Build

```bash
npm run build
```

Static output is written to `dist/`. Preview it locally with:

```bash
npm run preview
```

## Project structure

```
src/
  components/       — Header, Footer, GraphMotif, and landing sections
  content/blog/      — MDX blog posts (content collection)
  layouts/          — Base.astro (shell, SEO/OG), Post.astro (blog post layout)
  pages/            — index, blog/, 404, rss.xml
public/             — static assets (favicon, og.png, robots.txt)
```

## Deployment (manual — Cloudflare Pages)

There is no deploy CI configured for this repo. Deploys are triggered manually from the Cloudflare Pages
dashboard:

1. Create a new Pages project and connect this repository.
2. **Framework preset:** Astro
3. **Build command:** `npm run build`
4. **Build output directory:** `dist`
5. Deploy, then attach the custom domain `green-tea.dev` under the project's Custom Domains settings.

Re-run the same "Create deployment" flow from the dashboard for subsequent releases — pushes do not trigger an
automatic build.

## Placeholder links

The repository (`https://github.com/green-tea-dev/green-tea`) and npm package (`@green-tea/core`) referenced
throughout the site (Header, Footer, Hero, blog) are **placeholders** — the GitHub org/repo and the npm package are
not public yet. Before launch:

- Confirm the real GitHub org/repo and update every reference in `src/` if it differs from
  `https://github.com/green-tea-dev/green-tea`.
- Confirm `@green-tea/core` is the published npm package name and update links if it changes.
- Confirm `https://docs.green-tea.dev` resolves once the docs site is live.

## License

MIT
