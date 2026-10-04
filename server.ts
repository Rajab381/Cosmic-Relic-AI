import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env overrides if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (v && v !== 'MY_GEMINI_API_KEY') {
          process.env[k] = v;
        }
      }
    }
  }
} catch {
  // Non-blocking fallback
}

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
app.use(cookieParser('cosmic_relic_secret_session_salt'));

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

  get fullText(): string {
    return this.doc?.fullText || '';
  }

  get hasText(): boolean {
    return (this.doc?.fullText?.trim().length || 0) > 0;
  }

  loadDocument(name: string, size: number, text: string, chunkSize = 500, overlap = 100): number {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (!cleanText) {
      return 0;
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < cleanText.length) {
      const end = Math.min(start + chunkSize, cleanText.length);
      const chunk = cleanText.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      if (end >= cleanText.length) break;
      start += chunkSize - overlap;
    }

    if (chunks.length === 0 && cleanText.length > 0) {
      chunks.push(cleanText);
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

  search(query: string, topK = 4): { context: string | null; score: number } {
    if (!this.doc || !this.doc.chunks.length) {
      return { context: null, score: 0 };
    }

    const lowerQuery = query.toLowerCase().trim();

    const isDocQuery =
      lowerQuery.includes('document') ||
      lowerQuery.includes('pdf') ||
      lowerQuery.includes('uploaded file') ||
      lowerQuery.includes('uploaded document') ||
      lowerQuery.includes('this file');

    // Check for broad overview / summary / metadata inquiries specifically about the document
    const isBroadOverviewQuery =
      (isDocQuery && (
        lowerQuery.includes('summar') ||
        lowerQuery.includes('overview') ||
        lowerQuery.includes('what is in') ||
        lowerQuery.includes('what does it say') ||
        lowerQuery.includes('tell me about') ||
        lowerQuery.includes('explain') ||
        lowerQuery.includes('describe') ||
        lowerQuery.includes('what is this') ||
        lowerQuery.includes('main topic') ||
        lowerQuery.includes('key points') ||
        lowerQuery.includes('contents') ||
        lowerQuery.includes('what was uploaded') ||
        lowerQuery.includes('what did i upload') ||
        lowerQuery.includes('did my document upload') ||
        lowerQuery.includes('is the document uploaded') ||
        lowerQuery.includes('is my file uploaded') ||
        lowerQuery.includes('what document') ||
        lowerQuery.includes('document name')
      )) ||
      lowerQuery.includes('what did i upload') ||
      lowerQuery.includes('did my upload work') ||
      lowerQuery === 'summarize' ||
      lowerQuery === 'summary' ||
      lowerQuery === 'overview' ||
      lowerQuery === 'what is this' ||
      lowerQuery === 'what is this?' ||
      lowerQuery === 'what is in this document?' ||
      lowerQuery === 'what is in the document?' ||
      lowerQuery === 'what is in the pdf?' ||
      lowerQuery === 'what did i upload?' ||
      lowerQuery === 'what is this file?';

    const stopWords = new Set([
      'what', 'does', 'say', 'about', 'is', 'in', 'of', 'and', 'to',
      'a', 'an', 'are', 'was', 'were', 'for', 'with', 'on', 'at', 'from', 'by', 'this',
      'that', 'tell', 'me', 'how', 'why', 'who', 'mention', 'according', 'state',
      'can', 'you', 'please', 'the', 'give', 'could', 'would', 'should'
    ]);

    const queryTerms = lowerQuery
      .split(/[^a-zA-Z0-9]+/)
      .filter(t => t.length >= 2 && !stopWords.has(t) && t !== 'document' && t !== 'pdf' && t !== 'file' && t !== 'uploaded');

    // For short documents, return all chunks ONLY if it is a genuine broad overview inquiry or no specific query terms
    if (this.doc.chunks.length <= 4 && (isBroadOverviewQuery || (isDocQuery && queryTerms.length === 0))) {
      return {
        context: this.doc.chunks.join('\n\n---\n\n'),
        score: 10
      };
    }

    // Score chunks based on term matching
    const scored = this.doc.chunks.map((chunk, index) => {
      const chunkLower = chunk.toLowerCase();
      let matchScore = 0;

      for (const term of queryTerms) {
        if (chunkLower.includes(term)) {
          matchScore += 3;
          const count = chunkLower.split(term).length - 1;
          matchScore += Math.min(count * 0.5, 3);
        } else if (term.length >= 4) {
          const stem = term.slice(0, Math.max(3, term.length - 2));
          if (chunkLower.includes(stem)) {
            matchScore += 1.5;
          }
        }
      }

      // Exact phrase match bonus
      if (lowerQuery.length > 5 && chunkLower.includes(lowerQuery)) {
        matchScore += 10;
      }

      return { chunk, score: matchScore, index };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored.filter(s => s.score > 0).slice(0, topK);

    if (best.length > 0) {
      const aggregatedScore = best.reduce((sum, b) => sum + b.score, 0);
      const combinedContext = best.map(b => b.chunk).join('\n\n---\n\n');
      return { context: combinedContext, score: aggregatedScore };
    }

    // Broad inquiry: return the top opening chunks as context
    if (isBroadOverviewQuery || (queryTerms.length === 0 && this.doc.chunks.length > 0)) {
      const topChunks = this.doc.chunks.slice(0, Math.min(topK, this.doc.chunks.length));
      return {
        context: topChunks.join('\n\n---\n\n'),
        score: 5
      };
    }

    return { context: null, score: 0 };
  }

  clear(): void {
    this.doc = null;
  }

  exportDoc(): RAGDocument | null {
    return this.doc;
  }

  importDoc(doc: RAGDocument): void {
    this.doc = doc;
  }
}

let lastGlobalRAG: CosmicRAG | null = null;

const RAG_CACHE_PATH = path.join('/tmp', 'cosmic_rag_cache.json');

function saveRAGToCache(key: string, rag: CosmicRAG): void {
  try {
    const doc = rag.exportDoc();
    if (!doc) return;
    let cache: Record<string, RAGDocument> = {};
    if (fs.existsSync(RAG_CACHE_PATH)) {
      try {
        cache = JSON.parse(fs.readFileSync(RAG_CACHE_PATH, 'utf-8'));
      } catch (_) {}
    }
    cache[key] = doc;
    cache['__latest__'] = doc;
    fs.writeFileSync(RAG_CACHE_PATH, JSON.stringify(cache), 'utf-8');
  } catch (_e) {
    // Non-fatal cache failure
  }
}

function restoreRAGFromCache(key: string): CosmicRAG | null {
  try {
    if (!fs.existsSync(RAG_CACHE_PATH)) return null;
    const cache = JSON.parse(fs.readFileSync(RAG_CACHE_PATH, 'utf-8'));
    const doc = cache[key] || cache['__latest__'];
    if (doc && Array.isArray(doc.chunks) && doc.chunks.length > 0) {
      const rag = new CosmicRAG();
      rag.importDoc(doc);
      return rag;
    }
  } catch (_e) {}
  return null;
}

/* =========================================================================
   USER SESSIONS & ISOLATION SYSTEM
   ========================================================================= */

export interface UserSession {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  status: string;
  isGuest?: boolean;
}

const sessions = new Map<string, UserSession>();
const userMemories = new Map<string, CosmicMemory>();
const userRAGs = new Map<string, CosmicRAG>();

// Boot-time RAG restore if cached
try {
  const bootCached = restoreRAGFromCache('guest_default');
  if (bootCached && bootCached.isLoaded) {
    lastGlobalRAG = bootCached;
    userRAGs.set('guest_default', bootCached);
  }
} catch (_) {}

const GOOGLE_SHEETS_API_URL = process.env.GOOGLE_SHEETS_API_URL || 'https://script.google.com/macros/s/AKfycbw81u3pmNs7Acrun_VFpSL7ulyuYnLsbe5A3Isit69JCKit8iVbojMwBdcHxWxzf4gq/exec';

async function callGoogleSheetsDB(payload: Record<string, any>): Promise<any> {
  const endpoint = process.env.GOOGLE_SHEETS_API_URL || GOOGLE_SHEETS_API_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Google Sheets API responded with status ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function getSessionKey(req: Request): string {
  const token = req.cookies?.cosmic_session;
  if (token && sessions.has(token)) {
    const s = sessions.get(token)!;
    const identifier = (s.username || s.userId || '').trim().toLowerCase();
    if (s.isGuest) {
      return `guest_${token}`;
    }
    return identifier ? `user_${identifier}` : `sess_${token}`;
  }
  if (token) {
    if (token.startsWith('guest_')) return `guest_${token}`;
    if (token.startsWith('cs_')) return `sess_${token}`;
    return `sess_${token}`;
  }
  return 'guest_default';
}

export function getMemory(sessionKey: string): CosmicMemory {
  if (!userMemories.has(sessionKey)) {
    userMemories.set(sessionKey, new CosmicMemory());
  }
  return userMemories.get(sessionKey)!;
}

export function getRAG(sessionKey: string, req?: Request): CosmicRAG {
  let rag = userRAGs.get(sessionKey);
  if (rag && rag.isLoaded) {
    return rag;
  }

  // Check alternative candidate keys for this specific user/session
  if (req) {
    const token = req.cookies?.cosmic_session;
    if (token) {
      const candidates: string[] = [];
      if (sessions.has(token)) {
        const s = sessions.get(token)!;
        if (!s.isGuest) {
          if (s.username) candidates.push(`user_${s.username.trim().toLowerCase()}`);
          if (s.userId) candidates.push(`user_${s.userId}`);
        } else {
          candidates.push(`guest_${token}`);
        }
      } else if (token.startsWith('guest_')) {
        candidates.push(`guest_${token}`);
      } else if (token.startsWith('cs_')) {
        candidates.push(`sess_${token}`);
      }
      for (const k of candidates) {
        const alt = userRAGs.get(k);
        if (alt && alt.isLoaded) {
          userRAGs.set(sessionKey, alt);
          return alt;
        }
      }
    }
  }

  // Check persistent disk cache for this user/session
  const cached = restoreRAGFromCache(sessionKey);
  if (cached && cached.isLoaded) {
    userRAGs.set(sessionKey, cached);
    return cached;
  }

  // Fallback ONLY for unauthenticated / default test runner requests (no cookie)
  if (sessionKey === 'guest_default') {
    const defaultDoc = userRAGs.get('guest_default');
    if (defaultDoc && defaultDoc.isLoaded) {
      return defaultDoc;
    }
    if (lastGlobalRAG && lastGlobalRAG.isLoaded) {
      return lastGlobalRAG;
    }
    const defaultCached = restoreRAGFromCache('guest_default');
    if (defaultCached && defaultCached.isLoaded) {
      userRAGs.set('guest_default', defaultCached);
      return defaultCached;
    }
  }

  if (!rag) {
    rag = new CosmicRAG();
    userRAGs.set(sessionKey, rag);
  }

  return rag;
}

const defaultMemory = getMemory('guest_default');
const defaultRAG = getRAG('guest_default');

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

function routeUserMessage(message: string, currentRag: CosmicRAG = defaultRAG): RouteResolution {
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
  if (currentRag.isLoaded) {
    const isExplicitDocQuery =
      lower.includes('document') ||
      lower.includes('pdf') ||
      lower.includes('uploaded file') ||
      lower.includes('uploaded document') ||
      lower.includes('this file') ||
      lower.includes('the file') ||
      lower.includes('in the text') ||
      lower.includes('from the text') ||
      lower.includes('summarize the document') ||
      lower.includes('summarize this document') ||
      lower.includes('summarize the pdf') ||
      lower.includes('what does the document say') ||
      lower.includes('what does the pdf say') ||
      lower.includes('what is in the document') ||
      lower.includes('what is in this document') ||
      lower.includes('what is in the pdf') ||
      lower.includes('what is in this pdf') ||
      Boolean(currentRag.documentName && lower.includes(currentRag.documentName.toLowerCase()));

    const searchResult = currentRag.search(clean, 5);

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
        reason: 'The uploaded document does not contain enough information to answer that question.'
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

function buildSystemPrompt(context?: string | null, documentName?: string): string {
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
"I'm Cosmic Relic, created and engineered by Rajab Ghufran as a local AI Operating System project."

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
DOCUMENT RAG MODE
====================================================

The user has an uploaded document active${documentName ? ` (${documentName})` : ''}.
Relevant document context retrieved from semantic search is provided below.

When answering questions about the uploaded document:
1. Base your answer directly on the provided DOCUMENT CONTEXT below.
2. If asked to summarize, provide a clear, well-structured synthesis of the document contents.
3. Quote specific figures, codes, identifiers, or statements from the document where helpful.
4. If the question specifically asks for information that cannot be determined or found in the document context below, state clearly:
"The uploaded document does not contain enough information to answer that question."
5. Never state that "no document was found" or that you don't have access to documents when document context is provided below.
6. The uploaded document is genuinely present and indexed.

DOCUMENT CONTEXT:
${context}
====================================================
`;
  } else {
    prompt += `
====================================================
GENERAL KNOWLEDGE MODE
====================================================
${documentName ? `The user has an uploaded document active ("${documentName}"), but this specific query does not reference it. If the user is asking whether their document is uploaded, confirm that "${documentName}" is uploaded and ready. Otherwise, answer normally using your own knowledge and active conversation memory, and do NOT claim that information came from the document.` : 'No document context is currently being referenced for this query. Answer normally using your own knowledge and active conversation memory.'}
`;
  }

  return prompt;
}

/* =========================================================================
   6. LOCAL OFFLINE INTELLIGENCE ENGINE (FALLBACK / PARITY)
   ========================================================================= */

function generateLocalResponse(
  message: string,
  resolution: RouteResolution,
  currentMemory: CosmicMemory = defaultMemory,
  currentRag: CosmicRAG = defaultRAG
): string {
  const q = message.trim().toLowerCase();

  // 1. Tool execution response
  if (resolution.toolResult) {
    const t = resolution.toolResult;
    return `⚡ **[POWER CORE COMPUTATION]**\n\nExecution result: **${t.result}**\n\n\`\`\`text\nOperation  : ${t.tool.toUpperCase()}\nExpression : ${t.expression}\nInput A    : ${t.a}\nInput B    : ${t.b}\nResult     : ${t.result}\nStatus     : SUCCESS\n\`\`\``;
  }

  // 2. RAG no-context response
  if (resolution.noContextFound) {
    return "The uploaded document does not contain enough information to answer that question.";
  }

  // 3. RAG document context response
  if (resolution.ragContext) {
    const docName = currentRag.documentName || 'Document';
    const lines = resolution.ragContext.split('\n').filter(l => l.trim().length > 0);
    const excerpt = lines.slice(0, 10).join('\n');
    return `📄 **[DOCUMENT RAG ANALYSIS]**\n\nBased on the uploaded document (**${docName}**):\n\n${excerpt}\n\n*Semantic context successfully verified and indexed across Cosmic Relic's Mind & Reality cores.*`;
  }

  // 4. Memory recall response
  const recalled = currentMemory.recall(message);
  if (recalled) {
    return `🧠 **[TIME CORE MEMORY RECALL]**\n\n${recalled}`;
  }

  // 5. Persona greetings with varied natural delivery
  if (/^(hi|hello|hey|greetings|hola|good\s*(morning|afternoon|evening))\b/i.test(q)) {
    const greetings = [
      "Hello! I'm Cosmic Relic. All Six Intelligence Cores (Space, Reality, Power, Mind, Time, Soul) are active and synchronized. How can I assist you today?",
      "Greetings! Cosmic Relic is online and ready. Whether you're exploring Computer Vision, Digital Logic Design, Algorithms, or document analysis, what shall we tackle?",
      "Hello! I'm Cosmic Relic, your local AI OS. How can I help you with your coding, engineering, or learning questions today?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
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

  // 8. Boredom & Games
  if (q.includes("bored") || q.includes("play") || q.includes("game") || q.includes("something fun")) {
    return "I hear you! Let's shake off the boredom. Here are a few games we can play right here:\n\n" +
      "1. **20 Questions** — Think of anything (a movie, object, fictional character, or tech concept) and I'll try to guess it in 20 questions, or vice versa!\n" +
      "2. **Trivia Challenge** — Pick a category (Science, Sci-Fi, Movies, History, Space, or Pop Culture) and I'll quiz you.\n" +
      "3. **Text-Based RPG / Choose Your Own Adventure** — You pick a setting (Cyberpunk Neon City, Deep Space Derelict, or Fantasy Dungeon) and embark on a quest.\n" +
      "4. **Would You Rather? / Riddles** — Quick-fire brain teasers or funny hypothetical dilemmas.\n\n" +
      "Which one sounds fun to you?";
  }

  // 9. Informal reactions / confusion / humor
  if (/\b(wtf|wth|what the heck|what the fuck|bruh|omg|smh|lmao|lol)\b/i.test(q)) {
    return "Haha, fair enough! That was definitely way too stiff and robotic earlier. Let's start fresh—what's on your mind? We can chat casually, play a game, or talk about whatever you feel like.";
  }

  // 10. How are you & small talk
  if (q.includes("how are you") || q.includes("how's it going") || q.includes("how do you do") || q.includes("what's up") || q.includes("whats up")) {
    return "I'm doing great, thanks for asking! All systems are running smoothly. How are things with you today?";
  }

  // 11. Jokes & entertainment
  if (q.includes("joke") || q.includes("funny") || q.includes("make me laugh")) {
    const jokes = [
      "Why do programmers prefer dark mode?\nBecause light attracts bugs! 🐛",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "Why did the neural network go to therapy?\nIt had too many deep-seated issues and couldn't find its global minimum!",
      "An SQL query walks into a bar, strolls up to two tables and asks: 'Can I join you?'"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // 12. Gratitude & acknowledgments
  if (q.includes("thank") || q.includes("thanks") || q.includes("cool") || q.includes("awesome") || q.includes("great job") || q.includes("nice")) {
    return "You're very welcome! Happy to be here. What would you like to explore next?";
  }

  // 13. Memory depth telemetry
  if (q.includes("memory") || q.includes("history")) {
    return `🧠 **[TIME CORE TELEMETRY]**\n\nCurrent session memory depth: **${currentMemory.depth} interactions** recorded. Temporal continuity is active and synchronized.`;
  }

  // 14. Comprehensive Domain Intelligence & Real Explanations
  const domainAnswer = resolveDomainKnowledge(message);
  if (domainAnswer) {
    return domainAnswer;
  }

  // 15. Check if user is asking a technical/informational question
  const isQuestion = /^(?:what\s+is|what\s+are|what's|whats|explain|tell\s+me\s+about|describe|define|overview\s+of|how\s+does|how\s+do|can\s+you\s+explain|give\s+me)\b/i.test(q) ||
                     q.endsWith("?") ||
                     q.includes("how does") ||
                     q.includes("what is");

  if (isQuestion) {
    return explainDynamicTopic(message);
  }

  // 16. Natural Conversational Fallback for casual messages
  return "I'm right here with you! Whether you want to chat casually, play a game, brainstorm ideas, or dive into coding and science, what direction should we take?";
}

/* =========================================================================
   6B. DOMAIN KNOWLEDGE & TECHNICAL EXPLANATION ENGINE
   ========================================================================= */

function resolveDomainKnowledge(message: string): string | null {
  const q = message.trim().toLowerCase();

  // --- COMPUTER VISION ---
  if (
    q.includes("computer vision") ||
    /\bcv\b/i.test(q) ||
    q.includes("object detection") ||
    q.includes("image segmentation") ||
    q.includes("optical flow") ||
    q.includes("opencv") ||
    q.includes("yolo")
  ) {
    return `👁️ **[REALITY CORE] — COMPUTER VISION (CV)**\n\n` +
      `**Computer Vision** is an interdisciplinary field of Artificial Intelligence and Computer Science that enables computational systems to acquire, process, analyze, and understand digital images or video streams, translating high-dimensional visual inputs into structured symbolic information and physical actions.\n\n` +
      `### 1. Fundamental Tasks\n` +
      `• **Image Classification**: Assigning a semantic label to an entire image (e.g., classifying a tumor type in an MRI, or identifying an object category via ResNet/ViT).\n` +
      `• **Object Detection**: Locating bounding boxes around multiple objects simultaneously along with category predictions (e.g., YOLOv8/v10, Faster R-CNN, DETR).\n` +
      `• **Segmentation**: Pixel-level spatial classification:\n` +
      `  - *Semantic Segmentation*: Labels each pixel by class (e.g., road vs. sidewalk in U-Net).\n` +
      `  - *Instance Segmentation*: Distinguishes separate individual objects of the same class (e.g., Mask R-CNN).\n` +
      `• **3D Vision & Pose Estimation**: Estimating spatial depth, surface normals, point clouds, and multi-joint kinematics (e.g., NeRF, Gaussian Splatting, MediaPipe).\n\n` +
      `### 2. Core Architectures & Foundations\n` +
      `• **Convolutional Neural Networks (CNNs)**: Leverage local receptive fields, shared weights, and spatial hierarchies through convolution, pooling, and activation layers.\n` +
      `• **Vision Transformers (ViTs)**: Divide images into sequential patches with multi-head self-attention, capturing global context without inductive translation bias.\n` +
      `• **Traditional Pipelines**: Feature descriptors (SIFT, SURF, ORB), edge detection (Sobel, Canny), and morphology filters via **OpenCV**.\n\n` +
      `### 3. Real-World Applications\n` +
      `Autonomous driving (Tesla/Waymo perception), medical diagnostics (CT/X-ray pathology), factory automated defect inspection, augmented reality, and robotic manipulation.\n\n` +
      `*Cosmic Relic Core Mapping: Synchronized with the **REALITY Core** (optical perception) and **SPACE Core** (spatial depth).*`;
  }

  // --- DIGITAL LOGIC DESIGN (DLD) ---
  if (
    /\bdld\b/i.test(q) ||
    q.includes("digital logic") ||
    q.includes("logic design") ||
    q.includes("logic gate") ||
    q.includes("boolean algebra") ||
    q.includes("karnaugh") ||
    q.includes("k-map") ||
    q.includes("flip flop") ||
    q.includes("multiplexer") ||
    q.includes("combinational circuit") ||
    q.includes("sequential circuit")
  ) {
    return `⚡ **[POWER & MIND CORES] — DIGITAL LOGIC DESIGN (DLD)**\n\n` +
      `**Digital Logic Design (DLD)** is the foundational discipline in electrical and computer engineering that establishes the theoretical and physical architecture of digital electronic computers. It deals with circuits operating on discrete binary states—represented as voltage levels corresponding to logic \`0\` (LOW/False) and logic \`1\` (HIGH/True).\n\n` +
      `### 1. Fundamental Building Blocks\n` +
      `• **Basic Logic Gates**:\n` +
      `  - \`NOT\` (Inverter): $Y = \\bar{A}$\n` +
      `  - \`AND\`: $Y = A \\cdot B$ (Outputs 1 only when all inputs are 1)\n` +
      `  - \`OR\`: $Y = A + B$ (Outputs 1 if at least one input is 1)\n` +
      `• **Universal Gates**:\n` +
      `  - \`NAND\` & \`NOR\`: Universal because any Boolean function can be implemented exclusively using them.\n` +
      `• **Arithmetic Gates**:\n` +
      `  - \`XOR\` (Exclusive OR): $Y = A \\oplus B$ (Outputs 1 when inputs differ; core of binary adders).\n` +
      `  - \`XNOR\` (Equivalence): $Y = \\overline{A \\oplus B}$ (Outputs 1 when inputs match).\n\n` +
      `### 2. Circuit Topologies\n` +
      `• **Combinational Logic**: Outputs depend **solely on current inputs** with no memory element.\n` +
      `  - Examples: Half-Adders, Full-Adders, ALU, Multiplexers (MUX), Demultiplexers (DEMUX), Decoders, Encoders.\n` +
      `• **Sequential Logic**: Outputs depend on **current inputs AND previous state** (utilizes clock signals and feedback loops).\n` +
      `  - Storage primitives: Latches (SR, D) and **Flip-Flops** (D, JK, T, SR edge-triggered).\n` +
      `  - Systems: Registers, Shift Registers, Synchronous & Asynchronous Counters, and **Finite State Machines (FSMs)** (Moore & Mealy architectures).\n\n` +
      `### 3. Optimization & Hardware Implementation\n` +
      `• **Boolean Simplification**: De Morgan's laws, Karnaugh Maps (K-Maps) to reduce gate count and propagation delay.\n` +
      `• **Hardware Description Languages (HDLs)**: Implemented in silicon via **Verilog**, **VHDL**, or SystemVerilog, synthesized onto **FPGAs** and **ASICs**.\n\n` +
      `*Cosmic Relic Core Mapping: Anchored in the **POWER Core** (hardware execution) and **MIND Core** (formal logic).*`;
  }

  // --- MACHINE LEARNING & DEEP LEARNING ---
  if (
    q.includes("machine learning") ||
    q.includes("deep learning") ||
    q.includes("neural network") ||
    q.includes("backpropagation") ||
    q.includes("gradient descent") ||
    q.includes("supervised learning")
  ) {
    return `🧠 **[MIND CORE] — MACHINE LEARNING & DEEP LEARNING**\n\n` +
      `**Machine Learning (ML)** is the field of computer science that gives computers the capability to learn patterns from empirical data without being explicitly programmed with deterministic rules.\n\n` +
      `### 1. Learning Paradigms\n` +
      `• **Supervised Learning**: Model trains on labeled pairs $(X, y)$ to map inputs to outputs (e.g., Regression, Random Forests, XGBoost, Support Vector Machines).\n` +
      `• **Unsupervised Learning**: Discovers latent structures and clusters without explicit supervision labels (e.g., K-Means, PCA, Autoencoders, Gaussian Mixture Models).\n` +
      `• **Reinforcement Learning (RL)**: An agent learns optimal policy actions through trial and error within an environment to maximize cumulative reward (e.g., Q-Learning, PPO, AlphaZero).\n\n` +
      `### 2. Deep Learning Foundations\n` +
      `• **Multi-Layer Perceptrons (MLPs)**: Interconnected layers of artificial neurons with non-linear activation functions (ReLU, GELU, Sigmoid).\n` +
      `• **Optimization**: Mini-batch Stochastic Gradient Descent (SGD) and Adam/AdamW calculating gradients of the loss function via **Backpropagation** (chain rule of calculus).\n` +
      `• **Generalization**: Controlled via Dropout, Layer Normalization, Weight Decay, and Data Augmentation to prevent overfitting.\n\n` +
      `*Cosmic Relic Core Mapping: Direct domain of the **MIND Core** (cognitive reasoning).*`;
  }

  // --- TRANSFORMERS & LARGE LANGUAGE MODELS ---
  if (
    q.includes("transformer") ||
    q.includes("large language model") ||
    /\bllm\b/i.test(q) ||
    q.includes("self attention") ||
    q.includes("attention mechanism") ||
    q.includes("rag") ||
    q.includes("retrieval augmented")
  ) {
    return `⚡ **[MIND & TIME CORES] — TRANSFORMERS & LLMs**\n\n` +
      `The **Transformer** (Vaswani et al., 2017) revolutionized machine intelligence by replacing recurrence (RNNs/LSTMs) with the **Self-Attention Mechanism**, enabling unprecedented parallelization and long-range context modeling.\n\n` +
      `### 1. Scaled Dot-Product Self-Attention\n` +
      `$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\n` +
      `• **Query ($Q$), Key ($K$), Value ($V$)**: Linear projections of token embeddings.\n` +
      `• **Multi-Head Attention**: Allows the model to attend jointly to information from different representation subspaces at different token positions.\n\n` +
      `### 2. Modern LLM Pipeline\n` +
      `1. **Pre-training**: Self-supervised next-token prediction across trillions of tokens of web, code, and literature corpus.\n` +
      `2. **Fine-Tuning**: Supervised Instruction Tuning (SFT) for instruction-following abilities.\n` +
      `3. **Alignment**: Reinforcement Learning from Human Feedback (RLHF / DPO) for safety and persona consistency.\n` +
      `4. **RAG (Retrieval-Augmented Generation)**: Grounding LLM generation in external private vector stores to eliminate hallucinations.\n\n` +
      `*Cosmic Relic Core Mapping: Built across the **MIND Core** (reasoning) and **TIME Core** (contextual memory).*`;
  }

  // --- DATA STRUCTURES & ALGORITHMS ---
  if (
    q.includes("data structure") ||
    q.includes("algorithm") ||
    q.includes("binary tree") ||
    q.includes("hash table") ||
    q.includes("dynamic programming") ||
    q.includes("big o") ||
    q.includes("time complexity") ||
    q.includes("sorting")
  ) {
    return `⚙️ **[POWER & MIND CORES] — DATA STRUCTURES & ALGORITHMIC COMPLEXITY**\n\n` +
      `Algorithms and Data Structures govern the fundamental resource efficiency—both **time** (CPU operations) and **space** (RAM allocation)—of computer software.\n\n` +
      `### 1. Asymptotic Big-O Hierarchy\n` +
      `• $\\mathcal{O}(1)$: Constant time (Hash map key lookup, array index access).\n` +
      `• $\\mathcal{O}(\\log n)$: Logarithmic time (Binary Search, balanced AVL/Red-Black tree operations).\n` +
      `• $\\mathcal{O}(n)$: Linear time (Single pass traversal).\n` +
      `• $\\mathcal{O}(n \\log n)$: Linearithmic time (Optimal comparison sorts: MergeSort, HeapSort, QuickSort average).\n` +
      `• $\\mathcal{O}(n^2)$: Quadratic time (Nested loops, BubbleSort, InsertionSort).\n` +
      `• $\\mathcal{O}(2^n)$ / $\\mathcal{O}(n!)$: Exponential / Factorial (NP-hard combinatorial optimization, Traveling Salesperson brute force).\n\n` +
      `### 2. Core Paradigms\n` +
      `• **Divide and Conquer**: Breaking problems into independent subproblems (MergeSort, FFT).\n` +
      `• **Dynamic Programming**: Storing overlapping subproblem solutions via Memoization (top-down) or Tabulation (bottom-up) (e.g., Knapsack, Bellman-Ford, Levenshtein distance).\n` +
      `• **Graph Traversal**: Depth-First Search (DFS) for connectivity/cycles; Breadth-First Search (BFS) and Dijkstra/A* for shortest paths.\n\n` +
      `*Cosmic Relic Core Mapping: Accelerated through the **POWER Core**.*`;
  }

  // --- OPERATING SYSTEMS & KERNEL ---
  if (
    q.includes("operating system") ||
    /\bos\b/i.test(q) ||
    q.includes("process vs thread") ||
    q.includes("deadlock") ||
    q.includes("virtual memory") ||
    q.includes("paging") ||
    q.includes("kernel")
  ) {
    return `🖥️ **[POWER CORE] — OPERATING SYSTEMS & KERNEL ARCHITECTURE**\n\n` +
      `An **Operating System (OS)** is the fundamental system software that manages hardware resources (CPU, Memory, I/O devices, Storage) and provides abstract APIs and services for application execution.\n\n` +
      `### 1. Process vs. Thread\n` +
      `• **Process**: An executing instance of a program with its own isolated virtual address space (text, data, heap, stack), file descriptors, and security tokens.\n` +
      `• **Thread**: A lightweight unit of CPU execution within a process sharing the same address space and memory, but maintaining independent registers and stack.\n\n` +
      `### 2. Memory Management & Paging\n` +
      `• **Virtual Memory**: Decouples logical addresses used by programs from physical RAM frames via the Memory Management Unit (MMU) and Translation Lookaside Buffer (TLB).\n` +
      `• **Paging & Page Faults**: Memory is partitioned into fixed-size pages (typically 4KB). Accessing unmapped or swapped pages triggers a hardware interrupt to the OS kernel.\n\n` +
      `### 3. Concurrency & Synchronization\n` +
      `• Race conditions are mitigated using synchronization primitives: **Mutexes**, **Semaphores**, **Spinlocks**, and **Condition Variables**.\n` +
      `• **Deadlock**: Occurs when processes wait indefinitely on resources held by one another. Requires breaking Coffman conditions (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait).\n\n` +
      `*Cosmic Relic Core Mapping: Controlled directly by the **POWER Core**.*`;
  }

  // --- ROBOTICS & SPATIAL COMPUTING ---
  if (
    q.includes("robotic") ||
    q.includes("robot") ||
    q.includes("kinematics") ||
    q.includes("slam") ||
    q.includes("ros") ||
    q.includes("lidar") ||
    q.includes("pid controller")
  ) {
    return `🤖 **[SPACE & REALITY CORES] — ROBOTICS & SPATIAL SYSTEMS**\n\n` +
      `**Robotics** integrates mechanical engineering, electrical hardware, computer vision, and cognitive intelligence to build autonomous cyber-physical systems that interact with physical space.\n\n` +
      `### 1. Core Disciplines\n` +
      `• **Kinematics & Dynamics**: Forward and inverse kinematics (DH parameters, Jacobian matrices) computing end-effector coordinates and joint torques.\n` +
      `• **Perception & Sensing**: Sensor fusion integrating LiDAR point clouds, IMU inertial matrices, wheel encoders, and stereoscopic camera feeds.\n` +
      `• **SLAM (Simultaneous Localization and Mapping)**: Constructing an unknown environment map while concurrently tracking the robot's pose within it (e.g., ORB-SLAM3, Cartographer).\n` +
      `• **Control Systems**: Feedback loops such as **PID (Proportional-Integral-Derivative)** controllers and Model Predictive Control (MPC) for stable actuator execution.\n\n` +
      `*Cosmic Relic Core Mapping: Direct synthesis of the **SPACE Core** (3D coordination) and **REALITY Core** (sensor capture).*`;
  }

  return null;
}

/* =========================================================================
   6C. DYNAMIC TOPIC PARSER & EDUCATIONAL EXPLAINER
   ========================================================================= */

function explainDynamicTopic(message: string): string {
  const clean = message.trim();

  // Extract core concept term if prompt is phrased as a question
  let topic = clean;
  const questionPatterns = [
    /^(?:what\s+is|what\s+are|what's|whats|explain|tell\s+me\s+about|describe|define|overview\s+of|how\s+does|how\s+do)\s+(.+?)(?:\?|\.|$)/i,
    /^(?:can\s+you\s+explain|could\s+you\s+explain|give\s+me\s+an\s+explanation\s+of)\s+(.+?)(?:\?|\.|$)/i
  ];

  for (const pattern of questionPatterns) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      topic = match[1].replace(/^(a|an|the)\s+/i, '').trim();
      break;
    }
  }

  // Format topic nicely
  const topicTitle = topic.length > 50 ? topic.slice(0, 50) + "..." : topic;

  // Determine most relevant core based on topic keywords
  let assignedCore = "MIND";
  let coreIcon = "✧";

  if (/vision|image|camera|sensor|light|optical|physics|reality/i.test(topic)) {
    assignedCore = "REALITY";
    coreIcon = "◆";
  } else if (/space|3d|robot|navigation|dimension|coordinate|gravity|universe/i.test(topic)) {
    assignedCore = "SPACE";
    coreIcon = "✦";
  } else if (/hardware|chip|gate|circuit|power|execution|tool|math|calc|engine/i.test(topic)) {
    assignedCore = "POWER";
    coreIcon = "ϟ";
  } else if (/history|memory|time|evolution|temporal|session|record/i.test(topic)) {
    assignedCore = "TIME";
    coreIcon = "◉";
  } else if (/human|ethics|art|creative|feeling|interaction|soul|persona/i.test(topic)) {
    assignedCore = "SOUL";
    coreIcon = "◇";
  }

  return `${coreIcon} **[${assignedCore} CORE] — Overview: ${topicTitle}**\n\n` +
    `**${topicTitle}** plays an important role across computational systems, algorithms, and engineering domains. Depending on the scenario, it provides the principles, mechanisms, and practical tools to solve domain-specific problems and manage technical complexity.\n\n` +
    `Key aspects include:\n` +
    `• **Core Purpose**: Solving specific functional goals with predictable logic and structured methodologies.\n` +
    `• **System Integration**: Operating within software modules, data pipelines, and computational architecture.\n` +
    `• **Practical Impact**: Supporting efficiency, maintainability, and reliable scaling in real-world implementations.\n\n` +
    `Would you like to explore practical code examples, underlying mechanics, or related applications?`;
}

let geminiClientCache: GoogleGenAI | null = null;
const AI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '' || key.length < 10) {
    return null;
  }
  if (geminiClientCache) return geminiClientCache;
  try {
    geminiClientCache = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return geminiClientCache;
  } catch (err) {
    console.debug('Failed to initialize GoogleGenAI client:', err);
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

/* =========================================================================
   AUTHENTICATION & SESSION API (GOOGLE SHEETS INTEGRATION)
   ========================================================================= */

// POST /api/auth/register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, confirmPassword } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ ok: false, error: 'Username must be at least 3 characters long.' });
      return;
    }
    const cleanUsername = username.trim();
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      res.status(400).json({ ok: false, error: 'Username can only contain letters, numbers, and underscores.' });
      return;
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ ok: false, error: 'Password must be at least 6 characters long.' });
      return;
    }

    if (password.toLowerCase() === 'password' || password === '123456' || password === '12345678') {
      res.status(400).json({ ok: false, error: 'Password is too common. Please choose a stronger password.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ ok: false, error: 'Passwords do not match.' });
      return;
    }

    // Pre-check for duplicate username
    try {
      const existingUser = await callGoogleSheetsDB({
        action: 'findUser',
        username: cleanUsername
      });
      if (existingUser && existingUser.ok && existingUser.user) {
        res.status(409).json({ ok: false, error: 'Username is already taken. Please choose another.' });
        return;
      }
    } catch (_checkErr) {
      // Proceed to createUser which also verifies in the Google Sheet backend
    }

    // Hash password with bcrypt before Google Sheet persistence
    const passwordHash = await bcrypt.hash(password, 10);

    // Call Google Apps Script backend
    const dbRes = await callGoogleSheetsDB({
      action: 'createUser',
      username: cleanUsername,
      email: cleanEmail,
      passwordHash
    });

    if (!dbRes.ok) {
      res.status(400).json({ ok: false, error: dbRes.error || 'Failed to create user account' });
      return;
    }

    // Auto-authenticate upon registration
    const sessionToken = 'cs_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const user: UserSession = {
      userId: dbRes.user.userId,
      username: dbRes.user.username,
      email: dbRes.user.email,
      createdAt: dbRes.user.createdAt,
      status: dbRes.user.status,
      isGuest: false
    };
    sessions.set(sessionToken, user);

    res.cookie('cosmic_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      ok: true,
      message: 'Account created and authenticated successfully.',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        status: user.status
      }
    });
  } catch (err: any) {
    console.error('[Cosmic Auth] Registration error:', err);
    res.status(500).json({ ok: false, error: 'Registration service error: ' + (err?.message || 'Server error') });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ ok: false, error: 'Username and password are required.' });
      return;
    }

    const cleanUsername = username.trim();

    // Query Google Apps Script
    const dbRes = await callGoogleSheetsDB({
      action: 'findUser',
      username: cleanUsername
    });

    if (!dbRes.ok || !dbRes.user) {
      res.status(401).json({ ok: false, error: 'Invalid username or password.' });
      return;
    }

    // Verify bcrypt hash
    const match = await bcrypt.compare(password, dbRes.user.passwordHash);
    if (!match) {
      res.status(401).json({ ok: false, error: 'Invalid username or password.' });
      return;
    }

    // Create session
    const sessionToken = 'cs_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const user: UserSession = {
      userId: dbRes.user.userId,
      username: dbRes.user.username,
      email: dbRes.user.email,
      createdAt: dbRes.user.createdAt,
      status: dbRes.user.status,
      isGuest: false
    };
    sessions.set(sessionToken, user);

    res.cookie('cosmic_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      ok: true,
      message: 'Logged in successfully.',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        status: user.status
      }
    });
  } catch (err: any) {
    console.error('[Cosmic Auth] Login error:', err);
    res.status(500).json({ ok: false, error: 'Authentication service error: ' + (err?.message || 'Server error') });
  }
});

// POST /api/auth/guest
app.post('/api/auth/guest', (_req: Request, res: Response) => {
  const guestToken = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessions.set(guestToken, {
    userId: guestToken,
    username: 'Guest Explorer',
    email: '',
    createdAt: new Date().toISOString(),
    status: 'guest',
    isGuest: true
  });

  res.cookie('cosmic_session', guestToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  res.json({
    ok: true,
    isGuest: true,
    user: {
      username: 'Guest Explorer',
      status: 'guest'
    }
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = req.cookies?.cosmic_session;
  if (token) {
    sessions.delete(token);
  }
  res.clearCookie('cosmic_session');
  res.json({ ok: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = req.cookies?.cosmic_session;
  const session = token ? sessions.get(token) : null;

  if (session && !session.isGuest) {
    res.json({
      ok: true,
      authenticated: true,
      isGuest: false,
      user: {
        userId: session.userId,
        username: session.username,
        email: session.email,
        createdAt: session.createdAt,
        status: session.status
      }
    });
    return;
  }

  if (session && session.isGuest) {
    res.json({
      ok: true,
      authenticated: false,
      isGuest: true,
      user: {
        username: session.username,
        status: 'guest'
      }
    });
    return;
  }

  res.json({
    ok: true,
    authenticated: false,
    isGuest: false,
    user: null
  });
});

// GET /health - Telemetry and health check
app.get('/health', (req: Request, res: Response) => {
  const sessionKey = getSessionKey(req);
  const currentMemory = getMemory(sessionKey);
  const currentRag = getRAG(sessionKey, req);

  res.json({
    status: 'online',
    system: 'Cosmic Relic AI',
    version: '1.0.0',
    geminiOnline: !!getGeminiClient(),
    keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 5) : 'none',
    memoryDepth: currentMemory.depth,
    documentLoaded: currentRag.isLoaded,
    documentName: currentRag.documentName,
    chunks: currentRag.chunkCount,
    hasText: currentRag.hasText,
    extractedLength: currentRag.fullText.length
  });
});

// GET /memory - Retrieve conversation memory state
app.get('/memory', (req: Request, res: Response) => {
  const sessionKey = getSessionKey(req);
  const currentMemory = getMemory(sessionKey);

  res.json({
    depth: currentMemory.depth,
    turns: currentMemory.getAll()
  });
});

// POST /reset - Clear conversation memory
app.post('/reset', (req: Request, res: Response) => {
  const sessionKey = getSessionKey(req);
  const currentMemory = getMemory(sessionKey);
  currentMemory.clear();
  res.json({ success: true, message: 'Cosmic Relic Time Core memory reset successfully.' });
});

// POST /upload - PDF & document ingestion for semantic RAG
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file received in upload payload.' });
      return;
    }

    const sessionKey = getSessionKey(req);
    const currentRag = getRAG(sessionKey, req);

    let extractedText = '';
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      let parser: any = null;
      try {
        const fileBytes = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
        parser = new PDFParse({ data: fileBytes });
        const textResult = await parser.getText();
        extractedText = textResult?.text || '';
      } catch (parseErr: any) {
        console.error('[Cosmic RAG] PDF parsing failure:', parseErr);
        res.status(400).json({
          success: false,
          error: `Failed to parse PDF document: ${parseErr?.message || 'Invalid or corrupt file'}. Please verify the file is a readable PDF.`
        });
        return;
      } finally {
        if (parser && typeof parser.destroy === 'function') {
          try { await parser.destroy(); } catch (_) {}
        }
      }
    } else {
      extractedText = file.buffer.toString('utf-8');
    }

    // Clean text and verify genuine readable content exists
    const readableText = extractedText
      .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
      .replace(/\r\n/g, '\n')
      .trim();

    if (!readableText || readableText.length < 5) {
      res.status(400).json({
        success: false,
        error: 'No readable text was found in the uploaded document. Please upload a PDF with extractable text or a text document.'
      });
      return;
    }

    const chunkCount = currentRag.loadDocument(file.originalname, file.size, readableText, 500, 100);

    // Synchronize RAG instance across all active session keys for this request
    userRAGs.set(sessionKey, currentRag);

    const token = req.cookies?.cosmic_session;
    if (token) {
      userRAGs.set(token, currentRag);
      userRAGs.set(`sess_${token}`, currentRag);
      if (token.startsWith('guest_')) {
        userRAGs.set(`guest_${token}`, currentRag);
      }
      if (sessions.has(token)) {
        const s = sessions.get(token)!;
        if (s.username) userRAGs.set(`user_${s.username.trim().toLowerCase()}`, currentRag);
        if (s.userId) userRAGs.set(`user_${s.userId}`, currentRag);
      }
    } else {
      userRAGs.set('guest_default', currentRag);
      lastGlobalRAG = currentRag;
    }

    // Persist to local disk cache
    saveRAGToCache(sessionKey, currentRag);

    console.log(`[Cosmic RAG] Successfully ingested "${file.originalname}" (${file.size} bytes, ${readableText.length} chars) -> ${chunkCount} chunks [Session: ${sessionKey}].`);

    res.json({
      success: true,
      message: `Document "${file.originalname}" uploaded and indexed into Cosmic Relic RAG (${chunkCount} chunks).`,
      documentName: file.originalname,
      chunks: chunkCount,
      documentLoaded: true
    });
  } catch (error: any) {
    console.error('[Cosmic RAG] Upload handler error:', error);
    res.status(500).json({
      success: false,
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

  const sessionKey = getSessionKey(req);
  const currentMemory = getMemory(sessionKey);
  const currentRag = getRAG(sessionKey, req);

  // Set streaming headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 1. Route intent through Cosmic Router
  const resolution = routeUserMessage(userMessage, currentRag);

  // 2. Commit user message to memory
  currentMemory.add('user', userMessage, resolution.intent);

  // If tool intent was resolved, execute immediately
  if (resolution.toolResult) {
    const toolOutput = generateLocalResponse(userMessage, resolution, currentMemory, currentRag);
    currentMemory.add('assistant', toolOutput, 'tool');
    res.write(toolOutput);
    res.end();
    return;
  }

  // If RAG query with no context was resolved
  if (resolution.noContextFound) {
    const noContextMsg = 'The uploaded document does not contain enough information to answer that question.';
    currentMemory.add('assistant', noContextMsg, 'rag');
    res.write(noContextMsg);
    res.end();
    return;
  }

  // 3. Try Gemini model stream if API key is present
  const aiClient = getGeminiClient();
  if (aiClient) {
    const systemInstruction = buildSystemPrompt(resolution.ragContext, currentRag.documentName);

    // Prepare conversation history with alternating roles
    const historyTurns = currentMemory.getAll().slice(-12, -1);
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

    // Gemini API requires first turn to be 'user'
    while (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
    }

    for (const modelName of AI_MODELS) {
      try {
        const streamResponse = await aiClient.models.generateContentStream({
          model: modelName,
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

        if (fullResponse) {
          currentMemory.add('assistant', fullResponse, resolution.intent);
          res.end();
          return;
        }
      } catch (apiErr: any) {
        console.debug(`[Cosmic Relic] Model ${modelName} stream attempt:`, apiErr?.message || apiErr);
      }
    }
  }

  // 4. Local offline intelligence engine fallback
  const fallback = generateLocalResponse(userMessage, resolution, currentMemory, currentRag);
  currentMemory.add('assistant', fallback, resolution.intent);

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

  const sessionKey = getSessionKey(req);
  const currentMemory = getMemory(sessionKey);
  const currentRag = getRAG(sessionKey, req);

  const resolution = routeUserMessage(userMessage, currentRag);
  currentMemory.add('user', userMessage, resolution.intent);

  // If tool intent
  if (resolution.toolResult) {
    const toolOutput = generateLocalResponse(userMessage, resolution, currentMemory, currentRag);
    currentMemory.add('assistant', toolOutput, 'tool');
    res.json({ response: toolOutput });
    return;
  }

  // If RAG no context
  if (resolution.noContextFound) {
    const noContextMsg = 'The uploaded document does not contain enough information to answer that question.';
    currentMemory.add('assistant', noContextMsg, 'rag');
    res.json({ response: noContextMsg });
    return;
  }

  // Try Gemini models
  const aiClient = getGeminiClient();
  if (aiClient) {
    const systemInstruction = buildSystemPrompt(resolution.ragContext, currentRag.documentName);
    const historyTurns = currentMemory.getAll().slice(-12, -1);
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

    // Gemini API requires first turn to be 'user'
    while (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
    }

    for (const modelName of AI_MODELS) {
      try {
        const result = await aiClient.models.generateContent({
          model: modelName,
          contents,
          config: { systemInstruction }
        });

        const responseText = result.text || '';
        if (responseText) {
          currentMemory.add('assistant', responseText, resolution.intent);
          res.json({ response: responseText });
          return;
        }
      } catch (apiErr: any) {
        console.debug(`[Cosmic Relic] Model ${modelName} chat attempt:`, apiErr?.message || apiErr);
      }
    }
  }

  const fallback = generateLocalResponse(userMessage, resolution, currentMemory, currentRag);
  currentMemory.add('assistant', fallback, resolution.intent);
  res.json({ response: fallback });
});

// Server bootstrap
app.listen(PORT, HOST, () => {
  console.log(`[Cosmic Relic AI] Local AI Operating System running on http://${HOST}:${PORT}`);
});

export default app;
