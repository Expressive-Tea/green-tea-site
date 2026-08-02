import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const distDir = resolve('dist');
const productionOrigin = 'https://green-tea.expressive-tea.io';
const homeCanonical = `${productionOrigin}/`;

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

function metaDescription(html, label) {
  const descriptions = metaTags(html, 'name', 'description');
  assert.equal(descriptions.length, 1, `${label} must have exactly one meta description`);
  const description = attribute(descriptions[0], 'content')?.trim();
  assert.ok(description, `${label} meta description must not be empty`);
  return description;
}

function expectedCanonicalFor(label) {
  const generatedPath = label.replaceAll('\\', '/');
  if (generatedPath === 'index.html') return homeCanonical;
  if (generatedPath === '404.html') return `${productionOrigin}/404/`;
  assert.ok(
    generatedPath.endsWith('/index.html'),
    `Cannot derive a canonical route from generated page ${generatedPath}`,
  );
  return `${productionOrigin}/${generatedPath.slice(0, -'index.html'.length)}`;
}

function requireAbsoluteHttps(value, message) {
  let parsedUrl;
  assert.doesNotThrow(
    () => {
      parsedUrl = new URL(value);
    },
    `${message} must be a valid absolute URL`,
  );
  assert.equal(parsedUrl.protocol, 'https:', `${message} must use HTTPS`);
  return value;
}

function verifyPageMetadata({ label, generatedPath = label, html, isPost = false }) {
  const expectedCanonical = expectedCanonicalFor(generatedPath);
  const canonicals = tags(html, 'link').filter((tag) =>
    attribute(tag, 'rel')
      ?.toLowerCase()
      .split(/\s+/)
      .includes('canonical'),
  );
  assert.equal(canonicals.length, 1, `${label} must have exactly one canonical URL`);
  const canonicalUrl = attribute(canonicals[0], 'href');
  assert.equal(
    canonicalUrl,
    expectedCanonical,
    `${label} canonical URL must match its generated route`,
  );
  requireAbsoluteHttps(canonicalUrl, `${label} canonical URL`);

  const description = metaDescription(html, label);
  const robots = metaTags(html, 'name', 'robots');
  assert.equal(robots.length, 1, `${label} must have exactly one robots meta tag`);
  assert.equal(
    attribute(robots[0], 'content')?.toLowerCase(),
    generatedPath === '404.html' ? 'noindex, follow' : 'index, follow',
    `${label} robots metadata has an unexpected value`,
  );

  requireSingleMeta(html, label, 'og:type', isPost ? 'article' : 'website');
  const ogUrl = attribute(requireSingleMeta(html, label, 'og:url'), 'content');
  assert.equal(ogUrl, canonicalUrl, `${label} og:url must match its canonical URL`);
  assert.ok(
    attribute(requireSingleMeta(html, label, 'og:title'), 'content')?.trim(),
    `${label} og:title must not be blank`,
  );
  assert.equal(
    attribute(requireSingleMeta(html, label, 'og:description'), 'content'),
    description,
    `${label} og:description must match its meta description`,
  );
  const ogImage = attribute(requireSingleMeta(html, label, 'og:image'), 'content');
  requireAbsoluteHttps(ogImage, `${label} og:image`);

  return { canonicalUrl, description, ogImage };
}

function findGeneratedTextAssets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return findGeneratedTextAssets(entryPath);
    return entry.isFile() && /\.(?:html|css|js|mjs|svg|xml|json)$/i.test(entry.name)
      ? [entryPath]
      : [];
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

function requirePage(relativePath, label) {
  const page = htmlPages.find((candidate) => candidate.label === relativePath);
  assert.ok(page, `Missing generated ${label}: ${relativePath}`);
  return { ...page, generatedPath: relativePath, label };
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
    generatedPath: page.route,
    label: `blog post ${page.route.slice('blog/'.length, -'/index.html'.length)}`,
  }));
assert.ok(postPages.length > 0, 'Expected at least one generated blog post');

const homeJsonLd = parseJsonLd(home.html, home.label);
assert.equal(homeJsonLd.length, 1, 'home page must have exactly one JSON-LD script');
const homeMetadata = verifyPageMetadata(home);
const websites = findNodesByType(homeJsonLd, 'WebSite');
assert.equal(websites.length, 1, 'home page JSON-LD must contain exactly one WebSite');
const [website] = websites;
assert.equal(website.name, 'Green Tea', 'home page WebSite name must be Green Tea');
assert.equal(
  website.description,
  homeMetadata.description,
  'home page WebSite description must match the meta description',
);
assert.equal(website.url, homeCanonical, 'home page WebSite URL must be canonical');
requireAbsoluteHttps(website.url, 'home page WebSite URL');

const softwareApplications = findNodesByType(homeJsonLd, 'SoftwareApplication');
assert.equal(
  softwareApplications.length,
  1,
  'home page JSON-LD must contain exactly one SoftwareApplication',
);
const [softwareApplication] = softwareApplications;
assert.equal(softwareApplication.name, 'Green Tea', 'SoftwareApplication name must be Green Tea');
assert.equal(
  softwareApplication.description,
  homeMetadata.description,
  'SoftwareApplication description must match the meta description',
);
assert.equal(softwareApplication.url, homeCanonical, 'SoftwareApplication URL must be canonical');
requireAbsoluteHttps(softwareApplication.url, 'SoftwareApplication URL');
assert.equal(
  softwareApplication.applicationCategory,
  'DeveloperApplication',
  'SoftwareApplication category must be DeveloperApplication',
);
assert.equal(
  softwareApplication.operatingSystem,
  'Cross-platform',
  'SoftwareApplication operating system must be cross-platform',
);
assert.equal(
  softwareApplication.sameAs,
  'https://github.com/Expressive-Tea/green-tea',
  'SoftwareApplication sameAs must reference the GitHub repository',
);
assert.equal(
  softwareApplication.license,
  'https://github.com/Expressive-Tea/green-tea/blob/main/LICENSE',
  'SoftwareApplication license must reference the MIT license',
);
requireAbsoluteHttps(softwareApplication.license, 'SoftwareApplication license URL');
assert.equal(typeof softwareApplication.offers, 'object', 'SoftwareApplication must have an Offer');
assert.ok(
  !Array.isArray(softwareApplication.offers) && softwareApplication.offers !== null,
  'SoftwareApplication Offer must be an object',
);
assert.equal(softwareApplication.offers['@type'], 'Offer', 'SoftwareApplication offer type must be Offer');
assert.equal(softwareApplication.offers.price, '0', 'SoftwareApplication offer price must be zero');
assert.equal(
  softwareApplication.offers.priceCurrency,
  'USD',
  'SoftwareApplication offer currency must be USD',
);

for (const page of htmlPages) {
  if (page.path === home.path || postPages.some((post) => post.path === page.path)) continue;
  verifyPageMetadata(page);
}

for (const post of postPages) {
  const postMetadata = verifyPageMetadata({ ...post, isPost: true });
  const jsonLd = parseJsonLd(post.html, post.label);
  const blogPostings = findNodesByType(jsonLd, 'BlogPosting');
  assert.equal(blogPostings.length, 1, `${post.label} JSON-LD must contain one BlogPosting`);
  const [blogPosting] = blogPostings;
  assert.ok(
    typeof blogPosting.headline === 'string' && blogPosting.headline.trim(),
    `${post.label} BlogPosting headline must not be empty`,
  );
  assert.equal(
    blogPosting.description,
    postMetadata.description,
    `${post.label} BlogPosting description must match the meta description`,
  );
  assert.equal(
    blogPosting.image,
    postMetadata.ogImage,
    `${post.label} BlogPosting image must match og:image`,
  );
  requireAbsoluteHttps(blogPosting.image, `${post.label} BlogPosting image`);
  assert.equal(
    blogPosting.mainEntityOfPage,
    postMetadata.canonicalUrl,
    `${post.label} BlogPosting mainEntityOfPage must match the canonical URL`,
  );
  requireValidDate(blogPosting.datePublished, `${post.label} BlogPosting datePublished`);
  requireValidDate(blogPosting.dateModified, `${post.label} BlogPosting dateModified`);
  assert.equal(typeof blogPosting.author, 'object', `${post.label} BlogPosting author must be an object`);
  assert.ok(
    !Array.isArray(blogPosting.author) && blogPosting.author !== null,
    `${post.label} BlogPosting author must be an object`,
  );
  assert.equal(blogPosting.author['@type'], 'Person', `${post.label} BlogPosting author must be a Person`);
  assert.ok(
    typeof blogPosting.author.name === 'string' && blogPosting.author.name.trim(),
    `${post.label} BlogPosting author.name must not be empty`,
  );
  assert.equal(typeof blogPosting.publisher, 'object', `${post.label} publisher must be an object`);
  assert.ok(
    !Array.isArray(blogPosting.publisher) && blogPosting.publisher !== null,
    `${post.label} publisher must be an object`,
  );
  assert.equal(
    blogPosting.publisher['@type'],
    'Organization',
    `${post.label} publisher must be an Organization`,
  );
  assert.equal(
    blogPosting.publisher.name,
    'Expressive Tea Team',
    `${post.label} publisher must be Expressive Tea Team`,
  );
  const publishedTime = requireSingleMeta(post.html, post.label, 'article:published_time');
  const modifiedTime = requireSingleMeta(post.html, post.label, 'article:modified_time');
  const articleAuthors = metaTags(post.html, 'property', 'article:author');
  for (const articleAuthor of articleAuthors) {
    const authorUrl = attribute(articleAuthor, 'content');
    assert.ok(authorUrl?.trim(), `${post.label} article:author must not be empty`);
    let parsedAuthorUrl;
    assert.doesNotThrow(
      () => {
        parsedAuthorUrl = new URL(authorUrl);
      },
      `${post.label} article:author must be a valid absolute URL`,
    );
    assert.ok(
      ['https:', 'http:'].includes(parsedAuthorUrl.protocol),
      `${post.label} article:author must use HTTP or HTTPS`,
    );
  }
  const publishedTimeContent = attribute(publishedTime, 'content');
  const modifiedTimeContent = attribute(modifiedTime, 'content');
  requireValidDate(publishedTimeContent, `${post.label} article:published_time content`);
  requireValidDate(modifiedTimeContent, `${post.label} article:modified_time content`);
  assert.equal(
    publishedTimeContent,
    blogPosting.datePublished,
    `${post.label} article:published_time must match BlogPosting datePublished`,
  );
  assert.equal(
    modifiedTimeContent,
    blogPosting.dateModified,
    `${post.label} article:modified_time must match BlogPosting dateModified`,
  );

  const articleTags = metaTags(post.html, 'property', 'article:tag').map((tag) =>
    attribute(tag, 'content')?.trim(),
  );
  assert.ok(articleTags.every(Boolean), `${post.label} article:tag values must not be empty`);
  assert.equal(
    new Set(articleTags).size,
    articleTags.length,
    `${post.label} article:tag values must not contain duplicates`,
  );
  const keywordTags =
    typeof blogPosting.keywords === 'string'
      ? blogPosting.keywords.split(',').map((keyword) => keyword.trim())
      : [];
  assert.ok(keywordTags.every(Boolean), `${post.label} BlogPosting keywords must not be empty`);
  assert.equal(
    new Set(keywordTags).size,
    keywordTags.length,
    `${post.label} BlogPosting keywords must not contain duplicates`,
  );
  assert.deepEqual(
    keywordTags,
    articleTags,
    `${post.label} BlogPosting keywords must match article:tag metadata`,
  );
}

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
