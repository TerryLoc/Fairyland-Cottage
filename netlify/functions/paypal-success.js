const {
  EMAILJS_ORDER_TEMPLATE_ID,
  EMAILJS_OWNER_TEMPLATE_ID,
  PRODUCT_CURRENCY,
  PRODUCT_NAME,
  PRODUCT_PRICE,
  alreadyCaptured,
  assertConfig,
  capturePayPalOrder,
  completedStatus,
  delay,
  errorPage,
  escapeHtml,
  getPayPalAccessToken,
  getPayPalOrder,
  htmlResponse,
  sendEmailJsEmail,
  validateCapturedAmount,
} = require('./_payment-utils');

exports.handler = async (event) => {
  const orderId = String(event.queryStringParameters?.token || '').trim();

  if (!/^[A-Z0-9-]{10,}$/.test(orderId)) {
    return errorPage(
      400,
      'Missing order reference',
      'We could not verify your PayPal order.',
      'The success page was opened without a valid order reference. Please return to the shop and try again, or contact support if your payment went through.',
    );
  }

  try {
    assertConfig();

    const accessToken = await getPayPalAccessToken();
    const captureResponse = await capturePayPalOrder(orderId, accessToken);
    let payload = captureResponse.data || {};

    if (!completedStatus(payload)) {
      if (alreadyCaptured(payload)) {
        const orderResponse = await getPayPalOrder(orderId, accessToken);
        payload = orderResponse.data || {};
      }

      if (!completedStatus(payload)) {
        throw new Error(
          `PayPal capture did not complete successfully: ${captureResponse.raw}`,
        );
      }
    }

    if (!validateCapturedAmount(payload)) {
      throw new Error(`PayPal amount or currency mismatch: ${JSON.stringify(payload)}`);
    }

    const supportOrderId = String(payload.id || orderId);
    const payerName = [
      payload.payer?.name?.given_name || '',
      payload.payer?.name?.surname || '',
    ]
      .join(' ')
      .trim();
    const friendlyName = payerName || 'friend';
    const buyerEmail = String(payload.payer?.email_address || '').trim();
    const capture = payload.purchase_units?.[0]?.payments?.captures?.[0] || {};
    const amount = capture.amount || payload.purchase_units?.[0]?.amount || {};
    const amountValue = String(amount.value || PRODUCT_PRICE);
    const amountCurrency = String(amount.currency_code || PRODUCT_CURRENCY);
    let emailStatus = 'sent';

    try {
      await sendOrderEmails({
        amountCurrency,
        amountValue,
        buyerEmail,
        friendlyName,
        supportOrderId,
      });
    } catch (emailError) {
      emailStatus = 'failed';
      console.error('order EmailJS notification failed', {
        orderId: supportOrderId,
        error: emailError,
      });
    }

    return htmlResponse(
      200,
      successPage({
        buyerEmail,
        emailStatus,
        friendlyName,
        amountCurrency,
        amountValue,
        supportOrderId,
      }),
    );
  } catch (error) {
    console.error('paypal-success failed', { orderId, error });

    return errorPage(
      503,
      'Payment not completed',
      'We could not confirm your PayPal payment.',
      'Your order may still be processing. Please wait a moment and refresh the page once. If the issue continues, contact support and include the order reference below.',
      orderId,
    );
  }
};

async function sendOrderEmails({
  amountCurrency,
  amountValue,
  buyerEmail,
  friendlyName,
  supportOrderId,
}) {
  if (buyerEmail === '') {
    throw new Error('PayPal response did not include a payer email address.');
  }

  const sharedParams = {
    amount: `${amountCurrency} ${amountValue}`,
    currency: amountCurrency,
    email: buyerEmail,
    name: friendlyName,
    order_id: supportOrderId,
    price: amountValue,
    product_name: PRODUCT_NAME,
    title: PRODUCT_NAME,
  };

  await sendEmailJsEmail(EMAILJS_OWNER_TEMPLATE_ID, {
    ...sharedParams,
    message: [
      `Order reference: ${supportOrderId}`,
      `Buyer: ${friendlyName}`,
      `Buyer email: ${buyerEmail}`,
      `Product: ${PRODUCT_NAME}`,
      `Amount: ${amountCurrency} ${amountValue}`,
      '',
      'Manual action: send the PDF ebook and audio file through Smash within 30 minutes.',
    ].join('\n'),
    request_type: 'Purchase notification',
  });

  await delay(1100);

  await sendEmailJsEmail(EMAILJS_ORDER_TEMPLATE_ID, {
    ...sharedParams,
    message:
      'Your PDF ebook and audio file will be sent manually through Smash within the next 30 minutes.',
    request_type: 'Order confirmation',
  });
}

function successPage({
  amountCurrency,
  amountValue,
  buyerEmail,
  emailStatus,
  friendlyName,
  supportOrderId,
}) {
  const emailMessage =
    emailStatus === 'sent'
      ? `A confirmation email has been sent to ${buyerEmail}.`
      : 'Your payment was received, but the confirmation email could not be sent automatically. Please contact support with your order reference if you do not hear from us shortly.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>Fairyland Cottage - Order received</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Josefin+Slab:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root{--main-color:#ded5cd;--secondary-color:#f3eae2;--font-color1:#41462d;--font-color2:#e9ead6}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;font-family:"Josefin Slab",serif;color:var(--font-color1);background:radial-gradient(circle at top left,rgba(233,234,214,.9),transparent 38%),radial-gradient(circle at bottom right,rgba(222,213,205,.9),transparent 36%),linear-gradient(160deg,#fbf6f1 0%,#f3eae2 45%,#ded5cd 100%)}
    .page{width:min(1100px,calc(100% - 32px));margin:0 auto;padding:28px 0 42px}
    .brand{display:flex;align-items:center;gap:16px;padding:14px 18px;border:1px solid rgba(65,70,45,.16);border-radius:24px;background:rgba(243,234,226,.75);box-shadow:0 12px 36px rgba(65,70,45,.08);margin-bottom:24px}
    .brand-mark{width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,var(--font-color1),#667149);display:grid;place-items:center;color:var(--font-color2);font-size:1.8rem;flex:0 0 auto}
    .brand h1{margin:0;font-size:clamp(1.8rem,3vw,3rem);letter-spacing:.12em;text-transform:uppercase;line-height:1.05}.brand p{margin:4px 0 0;font-size:1rem;letter-spacing:.08em}
    .card{display:grid;gap:22px;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);background:rgba(243,234,226,.92);border:1px solid rgba(65,70,45,.16);border-radius:28px;padding:28px;box-shadow:0 18px 50px rgba(65,70,45,.12)}
    .card h2{margin:0 0 12px;font-size:clamp(2rem,4vw,3.4rem);line-height:1.08}.card p{margin:0 0 14px;font-size:1.12rem;line-height:1.65;max-width:55ch}
    .label{display:inline-block;margin-bottom:14px;padding:8px 14px;border-radius:999px;background:var(--main-color);border:1px solid rgba(65,70,45,.15);text-transform:uppercase;letter-spacing:.15em;font-weight:700;font-size:.8rem}
    .details{margin:18px 0 24px;padding:0;list-style:none}.details li{position:relative;padding-left:1.4rem;margin-bottom:10px;font-size:1.05rem;line-height:1.5}.details li::before{content:".";position:absolute;left:0;top:-.55rem;font-size:1.6rem}
    .price-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:8px;margin-bottom:18px}.price{font-size:clamp(2rem,4vw,3rem);font-weight:700;letter-spacing:.08em}
    .buy-button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:220px;padding:14px 22px;border-radius:999px;border:1px solid var(--font-color1);background:var(--font-color1);color:var(--font-color2);text-decoration:none;text-transform:uppercase;letter-spacing:.14em;font-weight:700;box-shadow:0 12px 28px rgba(65,70,45,.18)}
    .paypal-note{margin-top:14px;font-size:.95rem;color:rgba(65,70,45,.9)}
    .support-box{align-self:stretch;background:rgba(222,213,205,.55);border-radius:24px;padding:20px;border:1px solid rgba(65,70,45,.12)}.support-box h3{margin:0 0 12px;text-transform:uppercase;letter-spacing:.14em;font-size:1.05rem}
    .reference{word-break:break-all;font-size:.95rem;line-height:1.5;padding:12px 14px;border-radius:16px;background:rgba(243,234,226,.95);border:1px solid rgba(65,70,45,.12);margin-bottom:16px}
    .notice{margin-top:16px;padding:16px;border-radius:18px;background:#e9ead6;border:1px solid rgba(65,70,45,.16);font-weight:700}.support-link{color:var(--font-color1);font-weight:700}
    @media (max-width:860px){.card{grid-template-columns:1fr}}@media (max-width:620px){.page{width:min(100% - 20px,100%);padding-top:10px}.brand{padding:12px 14px}.brand-mark{width:48px;height:48px;border-radius:16px}.card{padding:22px 18px;border-radius:22px}}
  </style>
</head>
<body>
  <div class="page">
    <header class="brand">
      <div class="brand-mark">FC</div>
      <div>
        <h1>Fairyland Cottage</h1>
        <p>Secure digital order</p>
      </div>
    </header>

    <main class="card">
      <section>
        <span class="label">Payment complete</span>
        <h2>Thank you, ${escapeHtml(friendlyName)}.</h2>
        <p>Your PayPal payment for <strong>${escapeHtml(PRODUCT_NAME)}</strong> was completed successfully.</p>
        <p>Your PDF ebook and audio file will be sent manually through Smash within the next 30 minutes.</p>
        <ul class="details">
          <li>Includes the PDF ebook and the WAV audio book</li>
          <li>Files are sent manually through Smash for download to your device</li>
          <li>Please keep your order reference in case you need support</li>
        </ul>
        <div class="price-row">
          <div class="price">${escapeHtml(amountCurrency)} ${escapeHtml(amountValue)}</div>
          <a class="buy-button" href="/contact.html">Need help? Contact us</a>
        </div>
        <p class="paypal-note">${escapeHtml(emailMessage)}</p>
      </section>

      <aside class="support-box">
        <h3>Order reference</h3>
        <div class="reference">${escapeHtml(supportOrderId)}</div>
        <h3>Delivery</h3>
        <p class="notice">The files will be sent through Smash within 30 minutes.</p>
        <p class="paypal-note">If anything looks wrong, use the <a class="support-link" href="/contact.html">contact page</a> and include your order reference.</p>
      </aside>
    </main>
  </div>
</body>
</html>`;
}
