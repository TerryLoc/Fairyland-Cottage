const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const publicDir = path.join(__dirname, '..', 'public');
const pages = [
  ['index.html', 'https://fairylandcottage.com/'],
  ['videos.html', 'https://fairylandcottage.com/videos.html'],
  ['gallery.html', 'https://fairylandcottage.com/gallery.html'],
  ['contact.html', 'https://fairylandcottage.com/contact.html'],
  ['shop.html', 'https://fairylandcottage.com/shop.html'],
  ['cookie-policy.html', 'https://fairylandcottage.com/cookie-policy.html'],
  ['free-recipe/index.html', 'https://fairylandcottage.com/free-recipe/'],
];

function readPublicFile(file) {
  return fs.readFileSync(path.join(publicDir, file), 'utf8');
}

test('indexable pages have unique titles and complete page metadata', () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const [file, canonical] of pages) {
    const html = readPublicFile(file);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)" \/>/)?.[1];

    assert.ok(title, `${file} has a title`);
    assert.ok(description, `${file} has a meta description`);
    assert.ok(!titles.has(title), `${file} has a unique title`);
    assert.ok(!descriptions.has(description), `${file} has a unique description`);
    titles.add(title);
    descriptions.add(description);

    assert.ok(html.includes(`<link rel="canonical" href="${canonical}" />`), `${file} has the correct canonical`);
    assert.match(html, /<meta property="og:image" content="https:\/\/[^"]+" \/>/, `${file} has an absolute Open Graph image`);
    assert.match(html, /<meta property="og:image:alt" content="[^"]+" \/>/, `${file} has Open Graph image alt text`);
    assert.doesNotMatch(html, /twitter:/i, `${file} has no unused platform metadata`);
  }
});

test('indexable pages have valid structured data and accurate product offer', () => {
  for (const [file] of pages) {
    const html = readPublicFile(file);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

    assert.equal(blocks.length, 1, `${file} has one JSON-LD block`);
    assert.doesNotThrow(() => JSON.parse(blocks[0][1]), `${file} JSON-LD parses`);
  }

  const home = JSON.parse(readPublicFile('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(home['@graph'].some((entity) => entity['@type'] === 'WebSite'));
  const organization = home['@graph'].find((entity) => entity['@type'] === 'Organization');
  assert.ok(organization.logo.endsWith('/assets/favicon/android-chrome-512x512.png'));

  const shop = JSON.parse(readPublicFile('shop.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const product = shop['@graph'].find((entity) => entity['@type'] === 'Product');
  assert.ok(product, 'shop page describes its visible product');
  assert.equal(product.offers.priceCurrency, 'EUR');
  assert.equal(product.offers.price, '9.99');
  assert.ok(readPublicFile('shop.html').includes('EUR 9.99'), 'structured price matches the visible offer');
});

test('404 and 500 pages are excluded from indexing and use site-root assets', () => {
  const headers = readPublicFile('_headers');

  for (const [file, code] of [['404.html', '404'], ['500.html', '500']]) {
    const html = readPublicFile(file);

    assert.match(html, /<meta name="robots" content="noindex, follow" \/>/, `${file} is noindex`);
    assert.doesNotMatch(html, /<link rel="canonical"|application\/ld\+json/, `${file} omits canonical and structured data`);
    assert.match(html, new RegExp(`<p class="error-code" aria-hidden="true">${code}<\\/p>`), `${file} displays its status`);
    assert.match(html, /<h1 id="error-title">[^<]+<\/h1>/, `${file} has one clear page heading`);
    assert.match(html, /href="\/assets\/css\/error-pages\.css"/, `${file} uses the shared error page stylesheet`);
    assert.match(html, /<header class="side-nav">[\s\S]*?<header class="top-header">/, `${file} uses the site's responsive headers`);
    assert.match(html, /<footer>\s*<ul id="social-links2">/, `${file} uses the site's standard footer`);
    assert.match(html, /id="social-links"/, `${file} includes the mobile social links`);
    assert.match(html, /href="\/"[^>]*>[^<]+<\/a>/, `${file} links back to the home page`);
    assert.match(headers, new RegExp(`/${code === '404' ? '404' : '500'}\\.html[\\s\\S]*?X-Robots-Tag: noindex, follow`));
  }
});

test('sitemap contains only the indexable canonical URLs', () => {
  const sitemap = readPublicFile('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

  assert.deepEqual(urls.sort(), pages.map(([, canonical]) => canonical).sort());
  assert.doesNotMatch(sitemap, /<lastmod>|<changefreq>|<priority>/);
});

test('web manifest references existing site icons', () => {
  const manifest = JSON.parse(readPublicFile('assets/favicon/site.webmanifest'));

  assert.equal(manifest.name, 'Fairyland Cottage');
  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(publicDir, icon.src.replace(/^\//, ''))), `${icon.src} exists`);
  }
});

test('cookie policy has a clear accessible content hierarchy', () => {
  const html = readPublicFile('cookie-policy.html');

  assert.match(html, /<h1 id="cookie-policy-title">Cookies &amp; third-party services<\/h1>/);
  assert.match(html, /<article class="cookie-policy-card" aria-labelledby="cookie-policy-title">/);
  assert.match(html, /<section class="cookie-summary" aria-labelledby="summary-title">/);
  assert.match(html, /<section class="cookie-services" aria-labelledby="services-title">/);
  assert.match(html, /<section class="cookie-choices" aria-labelledby="choices-title">/);
  assert.match(html, /<link rel="stylesheet" href="assets\/css\/cookie-policy\.css" \/>/);
  assert.match(readPublicFile('assets/css/cookie-policy.css'), /\.cookie-policy-main\s*\{/);
});
