const {
  decodeDownloadToken,
  downloadNameForFile,
  downloadUrlForFile,
  errorPage,
  normalizeFileKey,
  noCacheHeaders,
} = require('./_payment-utils');

exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  const file = normalizeFileKey(query.file);
  const expires = Number.parseInt(query.expires || '', 10);
  const token = String(query.token || '').trim();

  if (!file || !Number.isFinite(expires) || expires < 1 || !token) {
    return errorPage(
      400,
      'Missing download details',
      'We could not verify the download request.',
      'The secure download link is missing one or more required values. Please return to your success page or contact support if your purchase was recent.',
    );
  }

  const decoded = decodeDownloadToken(token);
  const payload = decoded.valid ? decoded.payload : {};
  const payloadFile = normalizeFileKey(payload.file);
  const payloadExpires = Number.parseInt(payload.expires || '0', 10);
  const orderId = String(payload.order_id || '');

  if (!decoded.valid) {
    console.error('Invalid download token', {
      file,
      reason: decoded.reason,
    });

    return errorPage(
      403,
      'Invalid download link',
      'This download link could not be verified.',
      'Please use the download page you received after checkout. If the link was copied or changed, request a fresh set of downloads from support.',
    );
  }

  if (payloadFile !== file || payloadExpires !== expires) {
    console.error('Download token mismatch', {
      file,
      orderId,
      payloadExpires,
      payloadFile,
    });

    return errorPage(
      403,
      'Invalid download link',
      'This download link was altered or does not match the original file.',
      'Please do not edit the link. If you need assistance, contact support and include your order reference.',
      orderId,
    );
  }

  if (Math.floor(Date.now() / 1000) > expires) {
    console.error('Expired download token', {
      file,
      orderId,
      expires,
    });

    return errorPage(
      410,
      'Download expired',
      'This secure download link has expired.',
      'Your link is only valid for 1 hour. Please contact support for a fresh download link and include your order reference if you have it.',
      orderId,
    );
  }

  const downloadUrl = downloadUrlForFile(file);
  if (!downloadUrl) {
    console.error('Download URL missing', { file, orderId });

    return errorPage(
      503,
      'Download unavailable',
      'We could not find the file for your purchase.',
      'The item is temporarily unavailable. Please contact support and mention your order reference so we can restore access.',
      orderId,
    );
  }

  return {
    statusCode: 302,
    headers: noCacheHeaders({
      Location: downloadUrl,
      'Content-Disposition': `attachment; filename="${downloadNameForFile(file)}"`,
    }),
    body: '',
  };
};
