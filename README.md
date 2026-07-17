# Green Tea. — marketing site

The public marketing site for [Green Tea](https://green-tea.expressive-tea.io), a zen, opinionated, type-safe graph-pipeline HTTP
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

The site is hosted on the **expressive-tea.io cPanel** under the subdomain `green-tea.expressive-tea.io`.
There is no deploy CI — you build locally and upload the static output.

1. `npm run build` → static output in `dist/`.
2. Upload the **contents** of `dist/` into the subdomain's document root
   (e.g. `public_html/green-tea/`) via the cPanel File Manager or SFTP.
3. The docs are a **separate build** served from `/docs` on the same subdomain — see the
   [core repo](https://github.com/Expressive-Tea/green-tea)'s `website/` (built with `base: '/docs'`);
   its `dist/` contents go into `public_html/green-tea/docs/`. Two independent builds, one subdomain,
   no nested sub-subdomain.

The `*.expressive-tea.io` AutoSSL certificate already covers `green-tea.expressive-tea.io`; `/docs` needs
no certificate of its own because it is a path, not a host.

## Links that don't resolve yet

Green Tea lives under the **Expressive-Tea** GitHub org — the same org as the framework it grew out of. The site
already points there (`https://github.com/Expressive-Tea/green-tea`, in Header, Footer, Hero, and HonestBeta), but
those targets are not public yet. Before launch, confirm each one actually resolves:

- The GitHub repo is public under that org.
- `@green-tea/core` is published to npm under that name.
- `https://green-tea.expressive-tea.io/docs` is live and serving the docs site.

Every one of these is a visible 404 on the landing page until it's true.

## License

MIT
