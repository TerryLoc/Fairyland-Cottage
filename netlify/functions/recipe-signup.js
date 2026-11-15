const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const response = (statusCode, message) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({ message }),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, 'Method not allowed.');
  }

  let data;
  try {
    data = JSON.parse(event.body || '');
  } catch {
    return response(400, 'Invalid request.');
  }

  if (!data || typeof data.email !== 'string' ||
      (data.firstName !== undefined && typeof data.firstName !== 'string')) {
    return response(400, 'Please provide a valid email address and first name.');
  }

  const email = data.email.trim();
  const firstName = (data.firstName || '').trim();
  if (email.length > 254 || !emailPattern.test(email) || firstName.length > 100) {
    return response(400, 'Please provide a valid email address and first name.');
  }

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.error('Recipe signup is not configured: KIT_API_KEY is missing.');
    return response(503, 'Signup is temporarily unavailable.');
  }

  const subscriber = { email_address: email };
  if (firstName) subscriber.first_name = firstName;

  try {
    const kitResponse = await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
      body: JSON.stringify(subscriber),
      signal: AbortSignal.timeout(10000),
    });

    if (!kitResponse.ok) {
      console.error('Kit signup failed with status:', kitResponse.status);
      return response(502, 'Signup is temporarily unavailable.');
    }

    const result = await kitResponse.json();
    if (result.subscriber?.state !== 'active') {
      console.error('Kit signup did not produce an active subscriber.');
      return response(502, 'Signup could not be completed.');
    }

    return response(200, 'Signup successful.');
  } catch (error) {
    console.error('Kit signup request failed:', error.message);
    return response(502, 'Signup is temporarily unavailable.');
  }
};
