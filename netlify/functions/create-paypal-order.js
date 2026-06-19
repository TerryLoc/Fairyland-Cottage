const {
  assertConfig,
  createPayPalOrder,
  errorPage,
  getPayPalAccessToken,
  siteBaseUrl,
} = require('./_payment-utils');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'GET, POST' },
      body: 'Method Not Allowed',
    };
  }

  try {
    assertConfig();

    const accessToken = await getPayPalAccessToken();
    const order = await createPayPalOrder(accessToken, siteBaseUrl(event));
    const approvalLink = (order.links || []).find((link) => link.rel === 'approve');

    if (!approvalLink?.href) {
      throw new Error(`PayPal approval link was missing: ${JSON.stringify(order)}`);
    }

    return {
      statusCode: 303,
      headers: {
        Location: approvalLink.href,
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  } catch (error) {
    console.error('create-paypal-order failed', error);

    return errorPage(
      503,
      'Payment unavailable',
      'We could not start the PayPal checkout.',
      'Please try again in a few minutes. If the problem continues, use the contact link and mention that checkout could not be created.',
    );
  }
};
