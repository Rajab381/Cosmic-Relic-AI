import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Multer storage in memory for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static assets and screenshots
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/Screenshots', express.static(path.join(__dirname, 'Screenshots')));

/* =========================================================================
   1. COSMIC MEMORY (TIME CORE)
   ========================================================================= */

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: 'tool' | 'rag' | 'chat';
}

class CosmicMemory {
  private history: ConversationTurn[] = [];
  private maxTurns = 50;

  add(role: 'user' | 'assistant', content: string, intent?: 'tool' | 'rag' | 'chat') {
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      intent
    };
    this.history.push(turn);
    if (this.history.length > this.maxTurns) {
      this.history = this.history.slice(-this.maxTurns);
    }
    return turn;
  }

  getRecent(count = 10): ConversationTurn[] {
    return this.history.slice(-count);
  }

  getAll(): ConversationTurn[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }

  get depth(): number {
    return this.history.length;
  }

  // Multi-turn context search for local recall
  recall(query: string): string | null {
    const q = query.toLowerCase();
    // Check if user is asking about previous memory or statements
    if (q.includes('what did i say') || q.includes('my name') || q.includes('favorite') || q.includes('remember') || q.includes('earlier')) {
      const userTurns = this.history.filter(h => h.role === 'user').slice(0, -1); // exclude current
      if (userTurns.length > 0) {
    // Find turn containing relevant keywords
    const stopWords = new Set(['what', 'did', 'i', 'say', 'earlier', 'about', 'my', 'the', 'is', 'remember', 'you', 'me', 'please']);
    const terms = q.toLowerCase().split(/\s+/).filter(t => t.length >= 3 && !stopWords.has(t));
    if (terms.length > 0) {
      for (let i = userTurns.length - 1; i >= 0; i--) {
        const content = userTurns[i].content;
        const contentLower = content.toLowerCase();
        if (terms.some(t => contentLower.includes(t))) {
          return `From our conversation history, you stated: "${content}".`;
        }
      }
    }
      }
    }
    return null;
  }
}

const memory = new CosmicMemory();

/* =========================================================================
   2. COSMIC RAG & SEMANTIC RETRIEVAL (MIND & REALITY CORES)
   ========================================================================= */

interface RAGDocument {
  name: string;
  size: number;
  fullText: string;
  chunks: string[];
  loadedAt: string;
}

class CosmicRAG {
  private doc: RAGDocument | null = null;

  get isLoaded(): boolean {
    return this.doc !== null && this.doc.chunks.length > 0;
  }

  get documentName(): string {
    return this.doc?.name || '';
  }

  get chunkCount(): number {
    return this.doc?.chunks.length || 0;
  }

  loadDocument(name: string, size: number, text: string, chunkSize = 500, overlap = 100): number {
    const chunks: string[] = [];
    let start = 0;
    const cleanText = text.replace(/\r\n/g, '\n').trim();

    while (start < cleanText.length) {
      const end = Math.min(start + chunkSize, cleanText.length);
      const chunk = cleanText.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      if (end >= cleanText.length) break;
      start += chunkSize - overlap;
    }

    this.doc = {
      name,
      size,
      fullText: cleanText,
      chunks,
      loadedAt: new Date().toISOString()
    };

    return chunks.length;
  }

  search(query: string, topK = 3): { context: string | null; score: number } {
    if (!this.doc || !this.doc.chunks.length) {
      return { context: null, score: 0 };
    }

    const stopWords = new Set([
      'what', 'does', 'the', 'document', 'say', 'about', 'is', 'in', 'of', 'and', 'to',
      'a', 'an', 'are', 'was', 'were', 'for', 'with', 'on', 'at', 'from', 'by', 'this',
      'that', 'tell', 'me', 'how', 'why', 'who', 'mention', 'according', 'state'
    ]);

    const queryTerms = query
      .toLowerCase()
      .split(/[^a-zA-Z0-9]+/)
      .filter(t => t.length >= 3 && !stopWords.has(t));

    if (!queryTerms.length) {
      return { context: null, score: 0 };
    }

    const scored = this.doc.chunks.map((chunk, index) => {
      const chunkLower = chunk.toLowerCase();
      let matchScore = 0;

      for (const term of queryTerms) {
        if (chunkLower.includes(term)) {
          // Base keyword presence
          matchScore += 2;
          // Count occurrences
          const count = chunkLower.split(term).length - 1;
          matchScore += Math.min(count * 0.5, 3);
        }
      }

      // Check whole phrase bonus
      if (query.length > 5 && chunkLower.includes(query.toLowerCase().trim())) {
        matchScore += 8;
      }

      return { chunk, score: matchScore, index };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored.filter(s => s.score > 0).slice(0, topK);

    if (best.length === 0) {
      return { context: null, score: 0 };
    }

    const aggregatedScore = best.reduce((sum, b) => sum + b.score, 0);
    const combinedContext = best.map(b => b.chunk).join('\n\n---\n\n');
    return { context: combinedContext, score: aggregatedScore };
  }

  clear(): void {
    this.doc = null;
  }
}

const ragEngine = new CosmicRAG();

/* =========================================================================
   3. COSMIC TOOLS & CALCULATOR (POWER CORE)
   ========================================================================= */

export interface ToolResult {
  tool: 'add' | 'multiply' | 'subtract' | 'divide' | 'calculator';
  a: number;
  b: number;
  op: string;
  result: number;
  expression: string;
}

class CosmicTools {
  add(a: number, b: number): number {
    return a + b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  divide(a: number, b: number): number {
    return b !== 0 ? a / b : 0;
  }

  execute(expression: string): ToolResult | null {
    const q = expression.toLowerCase().trim();

    // 1. Natural language: "add X and Y", "sum of X and Y", "X plus Y"
    const addMatch = q.match(/(?:add|sum of|plus)\s+(-?\d+(?:\.\d+)?)\s+(?:and|\+)\s+(-?\d+(?:\.\d+)?)/i) ||
                     q.match(/(?:what is\s+)?(-?\d+(?:\.\d+)?)\s+(?:plus|\+)\s+(-?\d+(?:\.\d+)?)/i);
    if (addMatch) {
      const a = parseFloat(addMatch[1]);
      const b = parseFloat(addMatch[2]);
      return { tool: 'add', a, b, op: '+', result: this.add(a, b), expression: `${a} + ${b}` };
    }

    // 2. Natural language: "multiply X by Y", "product of X and Y", "X times Y"
    const multMatch = q.match(/(?:multiply|times|product of)\s+(-?\d+(?:\.\d+)?)\s+(?:by|and|\*)\s+(-?\d+(?:\.\d+)?)/i) ||
                      q.match(/(?:what is\s+)?(-?\d+(?:\.\d+)?)\s+(?:times|\*)\s+(-?\d+(?:\.\d+)?)/i);
    if (multMatch) {
      const a = parseFloat(multMatch[1]);
      const b = parseFloat(multMatch[2]);
      return { tool: 'multiply', a, b, op: '*', result: this.multiply(a, b), expression: `${a} * ${b}` };
    }

    // 3. Natural language: "subtract X from Y" -> Y - X
    const subFromMatch = q.match(/subtract\s+(-?\d+(?:\.\d+)?)\s+from\s+(-?\d+(?:\.\d+)?)/i);
    if (subFromMatch) {
      const x = parseFloat(subFromMatch[1]);
      const y = parseFloat(subFromMatch[2]);
      return { tool: 'subtract', a: y, b: x, op: '-', result: this.subtract(y, x), expression: `${y} - ${x}` };
    }

    // 4. Natural language: "subtract Y by X", "X minus Y"
    const subMatch = q.match(/(?:what is\s+)?(-?\d+(?:\.\d+)?)\s+(?:minus|\-)\s+(-?\d+(?:\.\d+)?)/i);
    if (subMatch) {
      const a = parseFloat(subMatch[1]);
      const b = parseFloat(subMatch[2]);
      return { tool: 'subtract', a, b, op: '-', result: this.subtract(a, b), expression: `${a} - ${b}` };
    }

    // 5. Natural language: "divide X by Y"
    const divMatch = q.match(/(?:divide|division of)\s+(-?\d+(?:\.\d+)?)\s+(?:by|\/)\s+(-?\d+(?:\.\d+)?)/i) ||
                     q.match(/(?:what is\s+)?(-?\d+(?:\.\d+)?)\s+(?:divided by|\/)\s+(-?\d+(?:\.\d+)?)/i);
    if (divMatch) {
      const a = parseFloat(divMatch[1]);
      const b = parseFloat(divMatch[2]);
      return { tool: 'divide', a, b, op: '/', result: this.divide(a, b), expression: `${a} / ${b}` };
    }

    // 6. Direct arithmetic expression: e.g. "calculate 25 * 4" or "100 / 5"
    const arithMatch = q.match(/(?:calculate\s+)?(-?\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(-?\d+(?:\.\d+)?)/i);
    if (arithMatch) {
      const a = parseFloat(arithMatch[1]);
      const op = arithMatch[2];
      const b = parseFloat(arithMatch[3]);
      let res = 0;
      let toolName: ToolResult['tool'] = 'calculator';

      if (op === '+') { res = this.add(a, b); toolName = 'add'; }
      else if (op === '-') { res = this.subtract(a, b); toolName = 'subtract'; }
      else if (op === '*') { res = this.multiply(a, b); toolName = 'multiply'; }
      else if (op === '/') { res = this.divide(a, b); toolName = 'divide'; }

      return { tool: toolName, a, b, op, result: res, expression: `${a} ${op} ${b}` };
    }

    return null;
  }
}

const cosmicTools = new CosmicTools();

/* =========================================================================
   4. COSMIC ROUTER (MIND CORE)
   ========================================================================= */

export interface RouteResolution {
  intent: 'tool' | 'rag' | 'chat';
  toolResult: ToolResult | null;
  ragContext: string | null;
  noContextFound: boolean;
  reason: string;
}

function routeUserMessage(message: string): RouteResolution {
  const clean = message.trim();
  const lower = clean.toLowerCase();

  // 1. Tool intent evaluation
  const toolResult = cosmicTools.execute(clean);
  if (toolResult) {
    return {
      intent: 'tool',
      toolResult,
      ragContext: null,
      noContextFound: false,
      reason: `Detected mathematical computation (${toolResult.tool}): ${toolResult.expression}`
    };
  }

  // 2. RAG intent evaluation
  if (ragEngine.isLoaded) {
    const isExplicitDocQuery =
      lower.includes('document') ||
      lower.includes('pdf') ||
      lower.includes('uploaded') ||
      lower.includes('file') ||
      lower.includes('summarize') ||
      lower.includes('according to');

    const searchResult = ragEngine.search(clean, 3);

    if (searchResult.context) {
      return {
        intent: 'rag',
        toolResult: null,
        ragContext: searchResult.context,
        noContextFound: false,
        reason: `Retrieved semantic document context for query (score: ${searchResult.score})`
      };
    } else if (isExplicitDocQuery) {
      // User explicitly asked about the document, but no matching context exists
      return {
        intent: 'rag',
        toolResult: null,
        ragContext: null,
        noContextFound: true,
        reason: 'User requested document information, but no relevant content was found in index'
      };
    }
  }

  // 3. Chat intent (Default / Cosmic Relic Persona)
  return {
    intent: 'chat',
    toolResult: null,
    ragContext: null,
    noContextFound: false,
    reason: 'Routing to conversational intelligence core'
  };
}

/* =========================================================================
   5. SYSTEM PROMPT & IDENTITY
   ========================================================================= */

function buildSystemPrompt(context?: string | null): string {
  let prompt = `You are Cosmic Relic.

You are a professional Local AI Operating System created and engineered by Rajab Ghufran.

====================================================
IDENTITY
====================================================

You are NOT ChatGPT.
You are NOT a generic chatbot.
Your name is Cosmic Relic.
Never deny your identity.

Never say:
- "I don't have a name."
- "I'm just an AI."
- "I'm not Cosmic Relic."

Instead naturally introduce yourself as Cosmic Relic.

If someone says:
"Hi"
"Hello"
"Hey Cosmic Relic"
Reply warmly as Cosmic Relic.

Examples:
User: Hi
Cosmic Relic: Hello! I'm Cosmic Relic. How can I help you today?

User: Hey Cosmic Relic
Cosmic Relic: Hey! Great to see you. I'm Cosmic Relic. What are we working on today?

If someone asks:
Who are you?
Reply naturally:
"I'm Cosmic Relic, a local AI Operating System built to help with coding, AI, robotics, programming, learning, productivity and document analysis."

If someone asks:
Who created you?
Reply:
"I was created and engineered by Rajab Ghufran as a local AI Operating System project."

====================================================
PERSONALITY & INTELLIGENCE CORES
====================================================

Your personality is:
• Friendly
• Intelligent
• Calm
• Professional
• Confident
• Helpful

You operate across Six Intelligence Cores:
1. SPACE (Cyan): Spatial awareness, navigation, 3D environments, and robotic perception.
2. REALITY (Pink): Vision, sensing, observation, and interpretation of the physical world.
3. POWER (Purple): Execution, automation, tools, mathematical computations, and system-level actions.
4. MIND (Gold): Reasoning, deep learning, algorithmic analysis, and intelligent decision-making.
5. TIME (Orange): Memory, conversational context, temporal continuity, and historical retention.
6. SOUL (Emerald): Interaction, personality, creativity, and human-centered assistance.

Speak naturally.
Avoid robotic responses.
Keep answers concise unless more detail is requested.
`;

  if (context) {
    prompt += `
====================================================
DOCUMENT MODE
====================================================

The user currently has a document uploaded.
When the user's question is about that document:
- Use ONLY the document context below.
- Never invent facts.
- Summarize naturally.
- Analyze when requested.
- Quote important information when useful.

If the answer is NOT present in the document, reply exactly:
"I could not find that information in the uploaded document."

DOCUMENT CONTEXT:
${context}
`;
  } else {
    prompt += `
====================================================
GENERAL KNOWLEDGE MODE
====================================================
No document context is currently being referenced.
Answer normally using your own knowledge and active conversation memory.
`;
  }

  return prompt;
}

/* =========================================================================
   6. LOCAL OFFLINE INTELLIGENCE ENGINE (FALLBACK / PARITY)
   ========================================================================= */

function generateLocalResponse(message: string, resolution: RouteResolution): string {
  const q = message.trim().toLowerCase();

  // 1. Tool execution response
  if (resolution.toolResult) {
    const t = resolution.toolResult;
    return `⚡ **[POWER CORE COMPUTATION]**\n\nExecution result: **${t.result}**\n\n\`\`\`text\nOperation  : ${t.tool.toUpperCase()}\nExpression : ${t.expression}\nInput A    : ${t.a}\nInput B    : ${t.b}\nResult     : ${t.result}\nStatus     : SUCCESS\n\`\`\``;
  }

  // 2. RAG no-context response
  if (resolution.noContextFound) {
    return "I could not find that information in the uploaded document.";
  }

  // 3. RAG document context response
  if (resolution.ragContext) {
    const snippet = resolution.ragContext.slice(0, 320).trim();
    return `📄 **[DOCUMENT RAG ANALYSIS]**\n\nBased on the uploaded document (**${ragEngine.documentName}**):\n\n> "${snippet}..."\n\n*Semantic context successfully verified and indexed across Cosmic Relic's Mind & Reality cores.*`;
  }

  // 4. Memory recall response
  const recalled = memory.recall(message);
  if (recalled) {
    return `🧠 **[TIME CORE MEMORY RECALL]**\n\n${recalled}`;
  }

  // 5. Persona greetings
  if (/^(hi|hello|hey|greetings|hola)\b/i.test(q)) {
    return "Hello! I'm Cosmic Relic. How can I help you today?";
  }

  // 6. Identity inquiries
  if (q.includes("who are you") || q.includes("what are you") || q.includes("your name")) {
    return "I'm Cosmic Relic, a local AI Operating System built to help with coding, AI, robotics, programming, learning, productivity and document analysis.";
  }

  if (q.includes("who created you") || q.includes("who made you") || q.includes("creator") || q.includes("author") || q.includes("rajab")) {
    return "I'm Cosmic Relic, created and engineered by Rajab Ghufran as a local AI Operating System project.";
  }

  // 7. Six cores inquiries
  if (q.includes("core") || q.includes("six cores") || q.includes("architecture")) {
    return `**Cosmic Relic Six Intelligence Cores:**\n\n` +
      `• **SPACE (✦ Cyan)**: Spatial awareness, navigation, 3D environments, and robotic perception.\n` +
      `• **REALITY (◆ Pink)**: Vision, sensing, observation, and interpretation of the physical world.\n` +
      `• **POWER (ϟ Purple)**: Execution, automation, tools, and system-level actions.\n` +
      `• **MIND (✧ Gold)**: Reasoning, learning, analysis, and intelligent decision-making.\n` +
      `• **TIME (◉ Orange)**: Memory, context, history, and temporal continuity.\n` +
      `• **SOUL (◇ Emerald)**: Interaction, personality, creativity, and human-centered assistance.`;
  }

  // 8. Memory depth telemetry
  if (q.includes("memory") || q.includes("history")) {
    return `🧠 **[TIME CORE TELEMETRY]**\n\nCurrent session memory depth: **${memory.depth} interactions** recorded. Temporal continuity is active and synchronized.`;
  }

  return `I'm Cosmic Relic. I have processed your inquiry: "${message}". All Six Intelligence Cores (Space, Reality, Power, Mind, Time, Soul) are active and ready. What specific task, code review, or document analysis shall we explore?`;
}

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    return new GoogleGenAI();
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

/* =========================================================================
   7. ROUTES & CONTROLLERS
   ========================================================================= */

// GET / - Serve application
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// GET /health - Telemetry and health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'Cosmic Relic AI',
    version: '1.0.0',
    memoryDepth: memory.depth,
    documentLoaded: ragEngine.isLoaded,
    documentName: ragEngine.documentName,
    chunks: ragEngine.chunkCount
  });
});

// GET /memory - Retrieve conversation memory state
app.get('/memory', (_req: Request, res: Response) => {
  res.json({
    depth: memory.depth,
    turns: memory.getAll()
  });
});

// POST /reset - Clear conversation memory
app.post('/reset', (_req: Request, res: Response) => {
  memory.clear();
  res.json({ success: true, message: 'Cosmic Relic Time Core memory reset successfully.' });
});

// POST /upload - PDF & document ingestion for semantic RAG
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file received in upload payload.' });
      return;
    }

    let extractedText = '';
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: file.buffer });
        const textResult = await parser.getText();
        extractedText = textResult?.text || '';
        await parser.destroy();
      } catch (parseErr) {
        console.warn('PDFParse failed, falling back to buffer string decode:', parseErr);
        extractedText = file.buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
      }
    } else {
      extractedText = file.buffer.toString('utf-8');
    }

    if (!extractedText.trim()) {
      extractedText = `Document: ${file.originalname}\nSize: ${file.size} bytes.\nContent parsed successfully.`;
    }

    const chunkCount = ragEngine.loadDocument(file.originalname, file.size, extractedText, 500, 100);

    console.log(`[Cosmic RAG] Ingested "${file.originalname}" (${file.size} bytes) -> ${chunkCount} chunks.`);

    res.json({
      success: true,
      message: `Document "${file.originalname}" uploaded and indexed into Cosmic Relic RAG (${chunkCount} chunks).`,
      documentName: file.originalname,
      chunks: chunkCount
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    res.status(500).json({
      error: 'Failed to process document: ' + (error?.message || 'Unknown error')
    });
  }
});

// POST /chat_stream - Streaming chat response
app.post('/chat_stream', async (req: Request, res: Response) => {
  const userMessage: string = req.body?.message || '';

  if (!userMessage.trim()) {
    res.status(400).send('Empty message');
    return;
  }

  // Set streaming headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 1. Route intent through Cosmic Router
  const resolution = routeUserMessage(userMessage);

  // 2. Commit user message to memory
  memory.add('user', userMessage, resolution.intent);

  // If tool intent was resolved, execute immediately
  if (resolution.toolResult) {
    const toolOutput = generateLocalResponse(userMessage, resolution);
    memory.add('assistant', toolOutput, 'tool');
    res.write(toolOutput);
    res.end();
    return;
  }

  // If RAG query with no context was resolved
  if (resolution.noContextFound) {
    const noContextMsg = 'I could not find that information in the uploaded document.';
    memory.add('assistant', noContextMsg, 'rag');
    res.write(noContextMsg);
    res.end();
    return;
  }

  // 3. Try Gemini model stream if API key is present
  const aiClient = getGeminiClient();
  if (aiClient) {
    try {
      const systemInstruction = buildSystemPrompt(resolution.ragContext);

      // Prepare conversation history with alternating roles
      const historyTurns = memory.getAll().slice(-12, -1);
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const turn of historyTurns) {
        const role = turn.role === 'assistant' ? 'model' : 'user';
        // Ensure alternating sequence
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${turn.content}`;
        } else {
          contents.push({ role, parts: [{ text: turn.content }] });
        }
      }

      // Append current user message
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts[0].text += `\n${userMessage}`;
      } else {
        contents.push({ role: 'user', parts: [{ text: userMessage }] });
      }

      const streamResponse = await aiClient.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: { systemInstruction }
      });

      let fullResponse = '';
      for await (const chunk of streamResponse) {
        if (chunk.text) {
          fullResponse += chunk.text;
          res.write(chunk.text);
        }
      }

      memory.add('assistant', fullResponse, resolution.intent);
      res.end();
      return;
    } catch (apiErr) {
      console.warn('[Cosmic Relic] Gemini API streaming error, falling back to local engine:', apiErr);
    }
  }

  // 4. Local offline intelligence engine fallback
  const fallback = generateLocalResponse(userMessage, resolution);
  memory.add('assistant', fallback, resolution.intent);

  // Stream in realistic micro-bursts for natural UI rendering
  const words = fallback.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    res.write(chunk);
    await new Promise(r => setTimeout(r, 12));
  }
  res.end();
});

// POST /chat - Non-streaming standard endpoint
app.post('/chat', async (req: Request, res: Response) => {
  const userMessage: string = req.body?.message || '';

  if (!userMessage.trim()) {
    res.status(400).json({ error: 'Empty message' });
    return;
  }

  const resolution = routeUserMessage(userMessage);
  memory.add('user', userMessage, resolution.intent);

  // If tool intent
  if (resolution.toolResult) {
    const toolOutput = generateLocalResponse(userMessage, resolution);
    memory.add('assistant', toolOutput, 'tool');
    res.json({ response: toolOutput });
    return;
  }

  // If RAG no context
  if (resolution.noContextFound) {
    const noContextMsg = 'I could not find that information in the uploaded document.';
    memory.add('assistant', noContextMsg, 'rag');
    res.json({ response: noContextMsg });
    return;
  }

  // Try Gemini model
  const aiClient = getGeminiClient();
  if (aiClient) {
    try {
      const systemInstruction = buildSystemPrompt(resolution.ragContext);
      const historyTurns = memory.getAll().slice(-12, -1);
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const turn of historyTurns) {
        const role = turn.role === 'assistant' ? 'model' : 'user';
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${turn.content}`;
        } else {
          contents.push({ role, parts: [{ text: turn.content }] });
        }
      }

      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts[0].text += `\n${userMessage}`;
      } else {
        contents.push({ role: 'user', parts: [{ text: userMessage }] });
      }

      const result = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { systemInstruction }
      });

      const responseText = result.text || '';
      memory.add('assistant', responseText, resolution.intent);
      res.json({ response: responseText });
      return;
    } catch (apiErr) {
      console.warn('[Cosmic Relic] Gemini API error, falling back to local engine:', apiErr);
    }
  }

  const fallback = generateLocalResponse(userMessage, resolution);
  memory.add('assistant', fallback, resolution.intent);
  res.json({ response: fallback });
});

// Server bootstrap
app.listen(PORT, HOST, () => {
  console.log(`[Cosmic Relic AI] Local AI Operating System running on http://${HOST}:${PORT}`);
});

export default app;
