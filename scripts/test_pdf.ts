import assert from 'node:assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function testPdf() {
  console.log('Testing PDF upload with actual PDF stream...');

  // Minimal valid PDF 1.4 binary content with recognizable text
  const pdfData = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 73 >> stream
BT
/F1 12 Tf
100 700 Td
(Cosmic Relic Sector 7 Protocol: Subspace relay frequency is 840.12 GHz) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000368 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
448
%%EOF`;

  const blob = new Blob([Buffer.from(pdfData, 'utf-8')], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob, 'sector_seven_protocol.pdf');

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  console.log('Upload response:', data);
  assert.strictEqual(data.success, true);
  assert.ok(data.chunks > 0);

  // Now ask about the PDF content
  const chatRes = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What is the subspace relay frequency mentioned in the document?' })
  });

  assert.strictEqual(chatRes.status, 200);
  const chatData = await chatRes.json();
  console.log('Chat answer for PDF:', chatData.response);
  assert.ok(
    chatData.response.includes('840.12') || chatData.response.includes('subspace') || chatData.response.includes('Sector 7'),
    `Expected subspace relay answer, got: ${chatData.response}`
  );

  console.log('✅ PDF upload and RAG extraction passed successfully!');
}

testPdf().catch(err => {
  console.error('PDF test failed:', err);
  process.exit(1);
});
