import assert from 'node:assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('🌌 [COSMIC RELIC VALIDATION SUITE]');
  console.log('Target Server:', BASE_URL);
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      process.stdout.write(`Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err: any) {
      console.log('❌ FAILED:', err.message);
      failed++;
    }
  }

  // 1. GET /
  await test('GET / serves Cosmic Relic HTML entry point', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Cosmic Relic AI'), 'Missing Cosmic Relic title');
    assert.ok(html.includes('cosmic-interface.js'), 'Missing cosmic-interface.js');
    assert.ok(html.includes('app.js'), 'Missing app.js');
    assert.ok(html.includes('SIX CORES'), 'Missing six cores emblem');
  });

  // 2. GET /health
  await test('GET /health returns telemetry and system state', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'online');
    assert.strictEqual(data.system, 'Cosmic Relic AI');
  });

  // 3. POST /chat Persona & Identity
  await test('POST /chat verifies Cosmic Relic Persona & Identity', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Who created you?' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.response.includes('Rajab Ghufran'), `Expected creator attribution, got: ${data.response}`);
    assert.ok(data.response.includes('Cosmic Relic'), 'Expected Cosmic Relic naming');
  });

  // 4. POST /chat Calculator / Power Core Tool Routing
  await test('POST /chat executes Power Core calculator (add)', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'add 45 and 55' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.response.includes('POWER CORE COMPUTATION'), 'Missing Power Core indicator');
    assert.ok(data.response.includes('100'), `Expected 100, got: ${data.response}`);
  });

  await test('POST /chat executes Power Core calculator (multiply)', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'multiply 12 by 8' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.response.includes('POWER CORE COMPUTATION'), 'Missing Power Core indicator');
    assert.ok(data.response.includes('96'), `Expected 96, got: ${data.response}`);
  });

  await test('POST /chat executes Power Core calculator (arithmetic expression)', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'calculate 250 / 5' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.response.includes('50'), `Expected 50, got: ${data.response}`);
  });

  // 5. POST /chat_stream Streaming Endpoint
  await test('POST /chat_stream streams chunked response', async () => {
    const res = await fetch(`${BASE_URL}/chat_stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tell me about the Six Intelligence Cores' })
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body, 'Missing stream body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunkCount++;
      accumulated += decoder.decode(value);
    }

    assert.ok(chunkCount >= 1, 'Expected at least 1 stream chunk');
    assert.ok(accumulated.toLowerCase().includes('space'), 'Missing SPACE core in stream output');
    assert.ok(accumulated.toLowerCase().includes('soul'), 'Missing SOUL core in stream output');
  });

  // 6. POST /upload Document Processing & Semantic RAG
  await test('POST /upload ingests document and creates semantic RAG chunks', async () => {
    const docContent = `Cosmic Relic Quantum Architecture:
The Warp Drive Core operates on tachyon plasma stabilization.
The designated frequency of the warp emitter is 432.85 MHz.
Security authorization protocol for the bridge is code OMEGA-NINE-TITAN.
Quantum containment shields maintain a 99.98% integrity coefficient.`;

    const blob = new Blob([docContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'cosmic_warp_specs.txt');

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.chunks > 0, 'Expected positive chunk count');
  });

  // 7. RAG Semantic Retrieval & Context Injection
  await test('POST /chat retrieves relevant document context from RAG', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the frequency of the warp emitter in the document?' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(
      data.response.includes('432.85') || data.response.includes('tachyon') || data.response.includes('warp emitter'),
      `Expected document answer containing frequency or context, got: ${data.response}`
    );
  });

  // 8. Graceful Handling When No Relevant Context Exists
  await test('POST /chat handles query when information is absent from document', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What does the document say about medieval dragon breeding?' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(
      data.response.includes('I could not find that information in the uploaded document'),
      `Expected graceful absence message, got: ${data.response}`
    );
  });

  // 9. Conversational Context & Memory
  await test('Conversational Memory retains and recalls context', async () => {
    // Turn 1
    const res1 = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Remember this: my flagship starship is the Nebula Vanguard.' })
    });
    assert.strictEqual(res1.status, 200);

    // Check memory endpoint
    const memRes = await fetch(`${BASE_URL}/memory`);
    assert.strictEqual(memRes.status, 200);
    const memData = await memRes.json();
    assert.ok(memData.depth > 0, 'Memory depth should be positive');

    // Turn 2: recall
    const res2 = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What did I say earlier about my flagship starship?' })
    });
    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.ok(
      data2.response.toLowerCase().includes('nebula vanguard') || data2.response.toLowerCase().includes('vanguard'),
      `Expected memory recall of "Nebula Vanguard", got: ${data2.response}`
    );
  });

  // 10. POST /reset Memory
  await test('POST /reset clears conversation memory', async () => {
    const res = await fetch(`${BASE_URL}/reset`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const memRes = await fetch(`${BASE_URL}/memory`);
    const memData = await memRes.json();
    assert.strictEqual(memData.depth, 0, 'Memory depth should be 0 after reset');
  });

  // 11. Error handling
  await test('POST /chat with empty message returns HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' })
    });
    assert.strictEqual(res.status, 400);
  });

  await test('POST /chat_stream with empty message returns HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/chat_stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' })
    });
    assert.strictEqual(res.status, 400);
  });

  await test('POST /upload without file returns HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 400);
  });

  console.log(`\n==============================================`);
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==============================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
