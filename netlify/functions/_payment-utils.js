const PAYPAL_ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL ||
  (PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com');

const PRODUCT_PRICE = process.env.PRODUCT_PRICE || '9.99';
const PRODUCT_CURRENCY = process.env.PRODUCT_CURRENCY || 'EUR';
const PRODUCT_NAME =
  process.env.PRODUCT_NAME || 'Fairyland Cottage Book Bundle';
const EMAILJS_PUBLIC_KEY =
  process.env.EMAILJS_PUBLIC_KEY || '7tEy21nwxbWYwxw4E';
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_dxn2qvd';
const EMAILJS_OWNER_TEMPLATE_ID =
  process.env.EMAILJS_OWNER_TEMPLATE_ID || 'template_dr5jblq';
const EMAILJS_ORDER_TEMPLATE_ID =
  process.env.EMAILJS_ORDER_TEMPLATE_ID || 'template_1rjksfb';

function siteBaseUrl(event) {
  const configured = process.env.SITE_BASE_URL || process.env.URL || '';
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || 'localhost';
  return `${proto}://${host}`;
}

function noCacheHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
}

function htmlResponse(statusCode, body) {
  return {
    statusCode,
    headers: noCacheHeaders({ 'Content-Type': 'text/html; charset=UTF-8' }),
    body,
  };
}

function errorPage(statusCode, title, headline, message, orderId = '') {
  const escapedTitle = escapeHtml(title);
  const escapedHeadline = escapeHtml(headline);
  const escapedMessage = escapeHtml(message);
  const escapedOrderId = escapeHtml(orderId);

  return htmlResponse(
    statusCode,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Josefin+Slab:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root{--main-color:#ded5cd;--secondary-color:#f3eae2;--font-color1:#41462d;--font-color2:#e9ead6}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(160deg,#f7f1eb 0%,#efe4d8 44%,#ded5cd 100%);color:var(--font-color1);font-family:"Josefin Slab",serif}
    .panel{width:min(760px,100%);background:rgba(243,234,226,.95);border:1px solid rgba(65,70,45,.18);border-radius:24px;box-shadow:0 18px 50px rgba(65,70,45,.12);padding:34px 26px;text-align:center}
    h1{margin:0 0 14px;font-size:clamp(2rem,5vw,3.2rem);letter-spacing:.08em;text-transform:uppercase}p{margin:12px auto;max-width:56ch;font-size:1.14rem;line-height:1.6}
    .order{display:inline-block;margin-top:16px;padding:10px 14px;border-radius:999px;background:var(--main-color);border:1px solid rgba(65,70,45,.2);font-weight:700;word-break:break-all}
    .actions{margin-top:24px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}.actions a{display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:999px;background:var(--font-color1);color:var(--font-color2);text-decoration:none;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .actions a.secondary{background:transparent;color:var(--font-color1);border:1px solid var(--font-color1)}
  </style>
</head>
<body>
  <main class="panel">
    <h1>${escapedHeadline}</h1>
    <p>${escapedMessage}</p>
    ${escapedOrderId ? `<p class="order">Order reference: ${escapedOrderId}</p>` : ''}
    <div class="actions">
      <a href="/contact.html">Contact support</a>
      <a class="secondary" href="/shop.html">Return to shop</a>
    </div>
  </main>
</body>
</html>`,
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function assertConfig() {
  const missing = [];
  if (!process.env.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
  if (!process.env.PAYPAL_SECRET) missing.push('PAYPAL_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function paypalRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${PAYPAL_BASE_URL}${path}`;
  const response = await fetch(url, options);
  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (error) {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    raw,
    data,
  };
}

async function sendEmailJsEmail(templateId, templateParams) {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`EmailJS send failed with status ${response.status}: ${body}`);
  }

  return body;
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function getPayPalAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`,
  ).toString('base64');

  const response = await paypalRequest('/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok || !response.data?.access_token) {
    throw new Error(`Unable to obtain a PayPal access token: ${response.raw}`);
  }

  return response.data.access_token;
}

async function createPayPalOrder(accessToken, baseUrl) {
  const response = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: 'fairyland-cottage-book-bundle',
          description: PRODUCT_NAME,
          custom_id: 'fairyland-cottage-book-bundle',
          amount: {
            currency_code: PRODUCT_CURRENCY,
            value: PRODUCT_PRICE,
          },
        },
      ],
      application_context: {
        brand_name: 'Fairyland Cottage',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${baseUrl}/success.php`,
        cancel_url: `${baseUrl}/shop.html`,
      },
    }),
  });

  if (!response.ok || !response.data?.id) {
    throw new Error(`Unable to create PayPal order: ${response.raw}`);
  }

  return response.data;
}

async function capturePayPalOrder(orderId, accessToken) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: '{}',
  });
}

async function getPayPalOrder(orderId, accessToken) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
}

function completedStatus(payload) {
  const status = String(payload?.status || '').toUpperCase();
  if (status === 'COMPLETED') return true;

  const captures = payload?.purchase_units?.[0]?.payments?.captures || [];
  return captures.some(
    (capture) => String(capture?.status || '').toUpperCase() === 'COMPLETED',
  );
}

function alreadyCaptured(payload) {
  const details = payload?.details || [];
  return details.some((detail) => detail?.issue === 'ORDER_ALREADY_CAPTURED');
}

function validateCapturedAmount(payload) {
  const capture = payload?.purchase_units?.[0]?.payments?.captures?.[0];
  const amount = capture?.amount || payload?.purchase_units?.[0]?.amount || {};
  const actualValue = Number.parseFloat(amount.value);
  const expectedValue = Number.parseFloat(PRODUCT_PRICE);
  const actualCurrency = String(amount.currency_code || '').toUpperCase();

  return (
    Number.isFinite(actualValue) &&
    Number.isFinite(expectedValue) &&
    actualValue.toFixed(2) === expectedValue.toFixed(2) &&
    actualCurrency === PRODUCT_CURRENCY.toUpperCase()
  );
}

module.exports = {
  EMAILJS_ORDER_TEMPLATE_ID,
  EMAILJS_OWNER_TEMPLATE_ID,
  PRODUCT_CURRENCY,
  PRODUCT_NAME,
  PRODUCT_PRICE,
  alreadyCaptured,
  assertConfig,
  capturePayPalOrder,
  completedStatus,
  createPayPalOrder,
  delay,
  errorPage,
  escapeHtml,
  getPayPalAccessToken,
  getPayPalOrder,
  htmlResponse,
  noCacheHeaders,
  sendEmailJsEmail,
  siteBaseUrl,
  validateCapturedAmount,
};
