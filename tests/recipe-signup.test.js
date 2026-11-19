const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { handler } = require('../netlify/functions/recipe-signup');

const request = (body, method = 'POST') => ({
  httpMethod: method,
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('free recipe page loads its signup script', () => {
  const page = fs.readFileSync(path.join(__dirname, '../free-recipe/index.html'), 'utf8');
  assert.match(page, /<script src="\/assets\/js\/free-recipe\.js" defer><\/script>/);
});

test('rejects invalid requests before contacting Kit', async () => {
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error('Unexpected request'); };
  try {
    assert.equal((await handler(request({}, 'GET'))).statusCode, 405);
    assert.equal((await handler(request('{'))).statusCode, 400);
    for (const body of [
      null, {}, { email: 123 }, { email: 'not-an-email' },
      { email: 'test@example.com', firstName: 123 },
      { email: 'test@example.com', firstName: 'a'.repeat(101) },
      { email: `${'a'.repeat(245)}@example.com` },
    ]) {
      assert.equal((await handler(request(body))).statusCode, 400);
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('reports missing Kit configuration', async () => {
  const originalKey = process.env.KIT_API_KEY;
  delete process.env.KIT_API_KEY;
  try {
    assert.equal((await handler(request({ email: 'test@example.com' }))).statusCode, 503);
  } finally {
    if (originalKey === undefined) delete process.env.KIT_API_KEY;
    else process.env.KIT_API_KEY = originalKey;
  }
});

test('submits trimmed data to Kit and requires an active subscriber', async () => {
  const originalKey = process.env.KIT_API_KEY;
  const originalFetch = global.fetch;
  process.env.KIT_API_KEY = 'test-key';
  let state = 'active';
  let status = 201;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: status < 400,
      status,
      json: async () => ({ subscriber: { state } }),
    };
  };
  try {
    assert.equal((await handler(request({ email: '  test@example.com ', firstName: ' Niamh ' }))).statusCode, 200);
    assert.equal(requests[0].url, 'https://api.kit.com/v4/subscribers');
    assert.equal(requests[0].options.headers['X-Kit-Api-Key'], 'test-key');
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      email_address: 'test@example.com', first_name: 'Niamh',
    });

    assert.equal((await handler(request({ email: 'test@example.com' }))).statusCode, 200);
    assert.deepEqual(JSON.parse(requests[1].options.body), { email_address: 'test@example.com' });
    state = 'cancelled';
    assert.equal((await handler(request({ email: 'test@example.com' }))).statusCode, 502);
    status = 429;
    assert.equal((await handler(request({ email: 'test@example.com' }))).statusCode, 502);
    global.fetch = async () => { throw new Error('Network failed'); };
    assert.equal((await handler(request({ email: 'test@example.com' }))).statusCode, 502);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.KIT_API_KEY;
    else process.env.KIT_API_KEY = originalKey;
  }
});
