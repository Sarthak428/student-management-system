const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('../server');

async function withServer(run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function request(baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, options);
  return { response, body: await response.json() };
}

test('student endpoints reject invalid input before database access', async (t) => {
  await withServer(async (baseUrl) => {
    await t.test('rejects a missing required field', async () => {
      const { response, body } = await request(baseUrl, '/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Taylor Student' })
      });
      assert.equal(response.status, 400);
      assert.match(body.message, /Email is required/);
    });

    await t.test('rejects an invalid email address', async () => {
      const { response, body } = await request(baseUrl, '/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Taylor Student',
          email: 'not-an-email',
          course: 'Design',
          age: 20
        })
      });
      assert.equal(response.status, 400);
      assert.match(body.message, /valid email/);
    });

    await t.test('rejects an invalid MongoDB ObjectId', async () => {
      const { response, body } = await request(baseUrl, '/api/students/not-an-object-id');
      assert.equal(response.status, 400);
      assert.match(body.message, /valid MongoDB ObjectId/);
    });

    await t.test('serves the dashboard', async () => {
      const response = await fetch(`${baseUrl}/`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Student directory/);
    });
  });
});

test('malformed JSON receives a client error', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid'
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /valid JSON/);
  });
});
