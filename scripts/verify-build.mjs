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
  let parsedCanonical;
  assert.doesNotThrow(
    () => {
      parsedCanonical = new URL(canonicalUrl);
    },
    `${label} canonical URL must be valid`,
  );
  assert.ok(
    ['https:', 'http:'].includes(parsedCanonical.protocol),
    `${label} canonical URL must use HTTP or HTTPS`,
  );

  const descriptions = metaTags(html, 'name', 'description');
  assert.equal(descriptions.length, 1, `${label} must have exactly one meta description`);
  assert.ok(attribute(descriptions[0], 'content')?.trim(), `${label} meta description must not be empty`);
}

function findGeneratedTextAssets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return findGeneratedTextAssets(entryPath);
    return entry.isFile() && /\.(?:html|css)$/i.test(entry.name) ? [entryPath] : [];
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

function findNodesByType(value, expectedType, matches = []) {
  if (Array.isArray(value)) {
    for (const item of value) findNodesByType(item, expectedType, matches);
    return matches;
  }
  if (value === null || typeof value !== 'object') return matches;

  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes(expectedType)) matches.push(value);
  for (const item of Object.values(value)) findNodesByType(item, expectedType, matches);
  return matches;
}

function requireValidDate(value, message) {
  assert.equal(typeof value, 'string', `${message} must be a string`);
  assert.match(
    value,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    `${message} must use ISO-8601 UTC format`,
  );
  const parsedDate = new Date(value);
  assert.ok(!Number.isNaN(parsedDate.valueOf()), `${message} must be a valid date`);
  assert.equal(parsedDate.toISOString(), value, `${message} must not normalize an impossible date`);
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
  return matching[0];
}

assert.ok(existsSync(distDir), 'Missing generated dist directory');
const generatedTextAssets = findGeneratedTextAssets(distDir);
const htmlPages = generatedTextAssets
  .filter((filePath) => filePath.toLowerCase().endsWith('.html'))
  .map((filePath) => ({
    label: relative(distDir, filePath),
    path: filePath,
    html: readHtml(filePath),
  }));
assert.ok(htmlPages.length > 0, 'Expected at least one generated HTML page');

for (const page of htmlPages) verifyPageMetadata(page);

function requirePage(relativePath, label) {
  const page = htmlPages.find((candidate) => candidate.label === relativePath);
  assert.ok(page, `Missing generated ${label}: ${relativePath}`);
  return { ...page, label };
}

const home = requirePage('index.html', 'home page');
const notFound = requirePage('404.html', '404 page');
requirePage(join('blog', 'index.html'), 'blog index');

const postPages = htmlPages
  .map((page) => ({ ...page, route: page.label.replaceAll('\\', '/') }))
  .filter(
    (page) =>
      page.route.startsWith('blog/') &&
      page.route.endsWith('/index.html') &&
      page.route !== 'blog/index.html',
  )
  .map((page) => ({
    ...page,
    label: `blog post ${page.route.slice('blog/'.length, -'/index.html'.length)}`,
  }));
assert.ok(postPages.length > 0, 'Expected at least one generated blog post');

const homeJsonLd = parseJsonLd(home.html, home.label);
assert.ok(
  findNodesByType(homeJsonLd, 'SoftwareApplication').length > 0,
  'home page JSON-LD must contain SoftwareApplication',
);

for (const post of postPages) {
  const jsonLd = parseJsonLd(post.html, post.label);
  const blogPostings = findNodesByType(jsonLd, 'BlogPosting');
  assert.equal(blogPostings.length, 1, `${post.label} JSON-LD must contain one BlogPosting`);
  const [blogPosting] = blogPostings;
  requireValidDate(blogPosting.datePublished, `${post.label} BlogPosting datePublished`);
  requireValidDate(blogPosting.dateModified, `${post.label} BlogPosting dateModified`);
  assert.equal(typeof blogPosting.author, 'object', `${post.label} BlogPosting author must be an object`);
  assert.ok(
    !Array.isArray(blogPosting.author) && blogPosting.author !== null,
    `${post.label} BlogPosting author must be an object`,
  );
  assert.ok(
    typeof blogPosting.author.name === 'string' && blogPosting.author.name.trim(),
    `${post.label} BlogPosting author.name must not be empty`,
  );
  requireSingleMeta(post.html, post.label, 'og:type', 'article');
  const publishedTime = requireSingleMeta(post.html, post.label, 'article:published_time');
  requireSingleMeta(post.html, post.label, 'article:author');
  requireValidDate(
    attribute(publishedTime, 'content'),
    `${post.label} article:published_time content`,
  );
}

const robots = metaTags(notFound.html, 'name', 'robots');
assert.equal(robots.length, 1, '404 page must have exactly one robots meta tag');
assert.equal(
  attribute(robots[0], 'content')?.toLowerCase(),
  'noindex, follow',
  '404 page robots metadata must be noindex, follow',
);

for (const assetPath of generatedTextAssets) {
  const source = readFileSync(assetPath, 'utf8');
  for (const forbiddenHost of ['fonts.googleapis.com', 'fonts.gstatic.com']) {
    assert.ok(
      !source.toLowerCase().includes(forbiddenHost),
      `${relative(distDir, assetPath)} must not reference ${forbiddenHost}`,
    );
  }
}

assert.ok(existsSync(join(distDir, '.htaccess')), 'Missing generated dist/.htaccess');
assert.ok(statSync(join(distDir, '.htaccess')).isFile(), 'Generated dist/.htaccess must be a file');

console.log('Verified generated SEO and deploy metadata.');
