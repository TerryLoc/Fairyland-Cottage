const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const siteUrl = 'https://fairylandcottage.com';
const defaultImage = `${siteUrl}/assets/images/webimages/house.webp`;
const logoUrl = `${siteUrl}/assets/images/logo-fairyland.webp`;

const pages = {
  'index.html': {
    title: 'Fairyland Cottage | Simple, Sustainable Living in Ireland',
    description:
      'Explore Fairyland Cottage for simple living, zero waste ideas, sustainable home routines, slow living videos, nature photography, and a digital book bundle.',
    path: '/',
    image: defaultImage,
    type: 'website',
  },
  'videos.html': {
    title: 'Simple Living & Zero Waste Videos | Fairyland Cottage',
    description:
      'Watch Fairyland Cottage videos about zero waste living, simple routines, minimalism, sustainable home ideas, and slow countryside life in Ireland.',
    path: '/videos.html',
    image: `${siteUrl}/assets/images/webimages/winterforest.webp`,
    type: 'website',
  },
  'gallery.html': {
    title: 'Nature & Cottage Life Gallery | Fairyland Cottage',
    description:
      'Browse Fairyland Cottage photography from the Irish countryside, including garden details, nature walks, cottage moments, and simple living inspiration.',
    path: '/gallery.html',
    image: `${siteUrl}/assets/images/webimages/sunrise.webp`,
    type: 'website',
  },
  'contact.html': {
    title: 'Contact Fairyland Cottage | Simple Living Questions',
    description:
      'Contact Fairyland Cottage with questions about simple living, sustainability, zero waste ideas, the digital book bundle, or website support.',
    path: '/contact.html',
    image: `${siteUrl}/assets/images/webimages/walking.webp`,
    type: 'website',
  },
  'shop.html': {
    title: 'Fairyland Cottage Book Bundle | Ebook & Audiobook',
    description:
      'Buy the Fairyland Cottage digital book bundle with the PDF ebook and WAV audiobook, delivered manually through Smash after secure PayPal checkout.',
    path: '/shop.html',
    image: `${siteUrl}/assets/images/webimages/products.webp`,
    type: 'product',
    extraAssets: [
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">',
    ],
  },
  'cookie-policy.html': {
    title: 'Cookie Policy | Fairyland Cottage',
    description:
      'Read the Fairyland Cottage cookie policy, including how the site uses essential functionality, EmailJS contact forms, and PayPal checkout links.',
    path: '/cookie-policy.html',
    image: defaultImage,
    type: 'website',
  },
  '404.html': {
    title: 'Page Not Found | Fairyland Cottage',
    description:
      'The page you were looking for could not be found. Return to Fairyland Cottage for simple living, videos, galleries, contact, and shop pages.',
    path: '/404.html',
    image: defaultImage,
    type: 'website',
    noindex: true,
  },
};

for (const [file, meta] of Object.entries(pages)) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing page: ${file}`);
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const updated = html.replace(
    /<head>[\s\S]*?<\/head>/,
    buildHead(meta, collectPageAssets(html)),
  );

  fs.writeFileSync(filePath, updated);
}

function collectPageAssets(html) {
  const styles = [];
  const styleRegex = /<link\s+rel="stylesheet"[^>]+>/g;
  const inlineStyleRegex = /<style>[\s\S]*?<\/style>/g;
  let match;

  while ((match = styleRegex.exec(html))) {
    styles.push(match[0]);
  }

  while ((match = inlineStyleRegex.exec(html))) {
    styles.push(match[0]);
  }

  return styles;
}

function buildHead(meta, pageAssets) {
  const canonical = `${siteUrl}${meta.path === '/' ? '/' : meta.path}`;
  const robots = meta.noindex
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const jsonLd = buildJsonLd(meta, canonical);

  const lines = [
    '<head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${escapeHtml(meta.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(meta.description)}" />`,
    `    <meta name="robots" content="${robots}" />`,
    '    <meta name="theme-color" content="#41462d" />',
    '    <meta name="color-scheme" content="light" />',
    `    <link rel="canonical" href="${canonical}" />`,
    `    <meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `    <meta property="og:type" content="${meta.type === 'product' ? 'product' : 'website'}" />`,
    `    <meta property="og:url" content="${canonical}" />`,
    `    <meta property="og:image" content="${meta.image}" />`,
    '    <meta property="og:site_name" content="Fairyland Cottage" />',
    '    <meta property="og:locale" content="en_IE" />',
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `    <meta name="twitter:image" content="${meta.image}" />`,
    '    <link rel="apple-touch-icon" sizes="180x180" href="assets/favicon/apple-touch-icon.png" />',
    '    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon/favicon-32x32.png" />',
    '    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon/favicon-16x16.png" />',
    '    <link rel="manifest" href="assets/favicon/site.webmanifest" />',
    ...[...(meta.extraAssets || []), ...pageAssets].map((asset) => `    ${asset}`),
    '    <script type="application/ld+json">',
    JSON.stringify(jsonLd, null, 6)
      .split('\n')
      .map((line) => `      ${line}`)
      .join('\n'),
    '    </script>',
    '  </head>',
  ];

  return lines.join('\n');
}

function buildJsonLd(meta, canonical) {
  const organization = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Fairyland Cottage',
    url: `${siteUrl}/`,
    logo: logoUrl,
    sameAs: [
      'https://www.instagram.com/fairylandcottage/',
      'https://www.youtube.com/fairylandcottage',
    ],
  };

  const webSite = {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: 'Fairyland Cottage',
    description:
      'Simple living, zero waste ideas, sustainable home routines, videos, photography, and digital resources.',
    publisher: { '@id': `${siteUrl}/#organization` },
  };

  const webPage = {
    '@type': meta.type === 'product' ? 'ItemPage' : 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': `${siteUrl}/#website` },
    publisher: { '@id': `${siteUrl}/#organization` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: meta.image,
    },
  };

  const graph = [organization, webSite, webPage, breadcrumb(meta, canonical)];

  if (meta.path === '/shop.html') {
    graph.push({
      '@type': 'Product',
      '@id': `${canonical}#product`,
      name: 'Fairyland Cottage Book Bundle',
      description: meta.description,
      image: meta.image,
      brand: { '@id': `${siteUrl}/#organization` },
      offers: {
        '@type': 'Offer',
        url: canonical,
        priceCurrency: 'EUR',
        price: '9.99',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': `${siteUrl}/#organization` },
      },
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function breadcrumb(meta, canonical) {
  const name = meta.path === '/' ? 'Home' : meta.title.split('|')[0].trim();
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${siteUrl}/`,
    },
  ];

  if (meta.path !== '/') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name,
      item: canonical,
    });
  }

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
