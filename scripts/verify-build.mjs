import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const distDir = resolve('dist');

function readHtml(filePath) {
  assert.ok(existsSync(filePath), `Missing generated HTML: ${relative(distDir, filePath)}`);
  return readFileSync(filePath, 'utf8');
}

function tags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) ?? [];
}

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function metaTags(html, attributeName, attributeValue) {
  return tags(html, 'meta').filter(
    (tag) => attribute(tag, attributeName)?.toLowerCase() === attributeValue.toLowerCase(),
  );
}

function verifyPageMetadata({ label, html }) {
  const canonicals = tags(html, 'link').filter((tag) =>
    attribute(tag, 'rel')
      ?.toLowerCase()
      .split(/\s+/)
      .includes('canonical'),
  );
  assert.equal(canonicals.length, 1, `${label} must have exactly one canonical URL`);
  const canonicalUrl = attribute(canonicals[0], 'href');
  assert.ok(canonicalUrl, `${label} canonical URL must not be empty`);
  assert.doesNotThrow(() => new URL(canonicalUrl), `${label} canonical URL must be valid`);

  const descriptions = metaTags(html, 'name', 'description');
  assert.equal(descriptions.length, 1, `${label} must have exactly one meta description`);
  assert.ok(attribute(descriptions[0], 'content')?.trim(), `${label} meta description must not be empty`);
}

function findHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return findHtmlFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

function parseJsonLd(html, label) {
  const scripts = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;

  while ((match = scriptPattern.exec(html)) !== null) {
    if (attribute(`<script${match[1]}>`, 'type')?.toLowerCase() === 'application/ld+json') {
      scripts.push(match[2]);
    }
  }

  assert.ok(scripts.length > 0, `${label} must have parseable JSON-LD`);

  return scripts.map((source, index) => {
    try {
      return JSON.parse(source);
    } catch (error) {
      assert.fail(`${label} JSON-LD script ${index + 1} is invalid: ${error.message}`);
    }
  });
}

function containsType(value, expectedType) {
  if (Array.isArray(value)) return value.some((item) => containsType(item, expectedType));
  if (value === null || typeof value !== 'object') return false;

  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes(expectedType)) return true;
  return Object.values(value).some((item) => containsType(item, expectedType));
}

function requireSingleMeta(html, label, property, expectedContent) {
  const matching = metaTags(html, 'property', property);
  assert.equal(matching.length, 1, `${label} must have exactly one ${property} meta tag`);
  if (expectedContent !== undefined) {
    assert.equal(
      attribute(matching[0], 'content')?.toLowerCase(),
      expectedContent.toLowerCase(),
      `${label} ${property} must be ${expectedContent}`,
    );
  } else {
    assert.ok(attribute(matching[0], 'content')?.trim(), `${label} ${property} must not be empty`);
  }
}

const requiredPages = [
  { label: 'home page', path: join(distDir, 'index.html') },
  { label: '404 page', path: join(distDir, '404.html') },
  { label: 'blog index', path: join(distDir, 'blog', 'index.html') },
];

const blogDir = join(distDir, 'blog');
assert.ok(existsSync(blogDir), 'Missing generated blog directory');
const postPages = readdirSync(blogDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    label: `blog post ${entry.name}`,
    path: join(blogDir, entry.name, 'index.html'),
  }));
assert.ok(postPages.length > 0, 'Expected at least one generated blog post');

const pages = [...requiredPages, ...postPages].map((page) => ({
  ...page,
  html: readHtml(page.path),
}));

for (const page of pages) verifyPageMetadata(page);

const home = pages.find((page) => page.label === 'home page');
const homeJsonLd = parseJsonLd(home.html, home.label);
assert.ok(
  containsType(homeJsonLd, 'SoftwareApplication'),
  'home page JSON-LD must contain SoftwareApplication',
);

for (const post of pages.filter((page) => page.label.startsWith('blog post '))) {
  const jsonLd = parseJsonLd(post.html, post.label);
  assert.ok(containsType(jsonLd, 'BlogPosting'), `${post.label} JSON-LD must contain BlogPosting`);
  requireSingleMeta(post.html, post.label, 'og:type', 'article');
  requireSingleMeta(post.html, post.label, 'article:published_time');
  requireSingleMeta(post.html, post.label, 'article:author');
}

const notFound = pages.find((page) => page.label === '404 page');
const robots = metaTags(notFound.html, 'name', 'robots');
assert.equal(robots.length, 1, '404 page must have exactly one robots meta tag');
assert.equal(
  attribute(robots[0], 'content')?.toLowerCase(),
  'noindex, follow',
  '404 page robots metadata must be noindex, follow',
);

for (const htmlPath of findHtmlFiles(distDir)) {
  const html = readHtml(htmlPath);
  assert.doesNotMatch(
    html,
    /fonts\.(?:googleapis|gstatic)\.com/i,
    `${relative(distDir, htmlPath)} must not reference Google Fonts`,
  );
}

assert.ok(existsSync(join(distDir, '.htaccess')), 'Missing generated dist/.htaccess');
assert.ok(statSync(join(distDir, '.htaccess')).isFile(), 'Generated dist/.htaccess must be a file');

console.log('Verified generated SEO and deploy metadata.');
