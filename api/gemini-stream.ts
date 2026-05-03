import type { VercelRequest, VercelResponse } from '@vercel/node';
import { streamText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter.js';
import { buildLookalikePrompt, getExamStyleDescription } from './utils/lookalikePrompt.js';

/**
 * Streaming Exam Generation Endpoint
 *
 * Uses Server-Sent Events (SSE) to stream generated exam questions
 * one-by-one as they are parsed from the AI response. This allows
 * the student to start the exam while remaining questions generate.
 */

export const maxDuration = 60;

// Model configuration - same as gemini.ts
const GEMINI_MODEL_FLASH = process.env.GEMINI_MODEL || 'google/gemini-2.0-flash';
const GEMINI_MODEL_PRO = process.env.GEMINI_MODEL_PRO || 'google/gemini-2.5-pro';
const EXACT_SUBJECTS = ['Wiskunde B', 'Wiskunde A', 'Natuurkunde', 'Scheikunde'];
const PRO_LEVELS = ['HAVO', 'VWO'];

function getModelForSubject(subject?: string, level?: string) {
  const modelId = (subject && level && EXACT_SUBJECTS.includes(subject) && PRO_LEVELS.includes(level))
    ? GEMINI_MODEL_PRO
    : GEMINI_MODEL_FLASH;
  return gateway(modelId);
}

/**
 * Incrementally extract complete JSON objects from a streaming buffer.
 * Uses brace-depth tracking with string-awareness to find balanced {...} blocks.
 */
function extractCompleteObjects(buffer: string): { objects: any[]; remaining: string } {
  const objects: any[] = [];
  let startIdx = -1;
  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;
  let lastExtractEnd = 0;

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      if (braceDepth === 0) startIdx = i;
      braceDepth++;
    } else if (char === '}') {
      braceDepth--;
      if (braceDepth === 0 && startIdx !== -1) {
        const jsonStr = buffer.substring(startIdx, i + 1);
        try {
          const obj = JSON.parse(jsonStr);
          objects.push(obj);
          lastExtractEnd = i + 1;
        } catch {
          // Malformed JSON - skip this object
          lastExtractEnd = i + 1;
        }
        startIdx = -1;
      }
    }
  }

  const remaining = startIdx !== -1
    ? buffer.substring(startIdx)
    : buffer.substring(lastExtractEnd);

  return { objects, remaining };
}

/**
 * Transform a raw AI-generated question object into a proper Question shape
 * with ID, metadata, and validation.
 */
function transformRawQuestion(
  q: any,
  index: number,
  now: number,
  subject: string,
  level: string,
  examStyleDesc: string
): any | null {
  if (!q.text || typeof q.text !== 'string') return null;

  const baseQuestion = {
    id: `lookalike-${now}-${index}`,
    type: q.type || 'MULTIPLE_CHOICE',
    level,
    subject,
    text: q.text.trim(),
    contextText: q.contextText ? q.contextText.trim() : undefined,
    examType: 'practice',
    source: `Look-alike Examen (${level} - ${examStyleDesc})`,
  };

  if (q.type === 'OPEN') {
    return {
      ...baseQuestion,
      type: 'OPEN',
      modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
      score: typeof q.score === 'number' ? q.score : 2,
    };
  } else {
    if (!Array.isArray(q.options) || q.options.length < 2) return null;
    const correctIndex = typeof q.correctIndex === 'number'
      ? Math.max(0, Math.min(q.correctIndex, q.options.length - 1))
      : 0;
    return {
      ...baseQuestion,
      type: 'MULTIPLE_CHOICE',
      options: q.options.map((opt: any) => String(opt).trim()),
      correctIndex,
      score: 1,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(`ai:${clientIP}`, rateLimits.aiApi);

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' });
  }

  const { subject, level, count = 10, topic, examStyle } = req.body;

  if (!subject || !level) {
    return res.status(400).json({ error: 'Subject en level zijn verplicht.' });
  }

  const examStyleDesc = getExamStyleDescription(examStyle);
  const prompt = buildLookalikePrompt(subject, level, count, topic, examStyle);

  // Verify API key
  if (!process.env.AI_GATEWAY_API_KEY) {
    return res.status(500).json({ error: 'AI_GATEWAY_API_KEY not configured' });
  }

  const model = getModelForSubject(subject, level);

  // Set SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const result = streamText({ model, prompt });

    let buffer = '';
    let questionIndex = 0;
    const now = Date.now();

    for await (const chunk of result.textStream) {
      buffer += chunk;

      const { objects, remaining } = extractCompleteObjects(buffer);
      buffer = remaining;

      for (const obj of objects) {
        const question = transformRawQuestion(obj, questionIndex, now, subject, level, examStyleDesc);
        if (question) {
          res.write(`data: ${JSON.stringify(question)}\n\n`);
          questionIndex++;
        }
      }
    }

    // Try to parse any remaining buffer content
    if (buffer.trim()) {
      const { objects } = extractCompleteObjects(buffer);
      for (const obj of objects) {
        const question = transformRawQuestion(obj, questionIndex, now, subject, level, examStyleDesc);
        if (question) {
          res.write(`data: ${JSON.stringify(question)}\n\n`);
          questionIndex++;
        }
      }
    }

    if (questionIndex === 0) {
      res.write(`data: ${JSON.stringify({ error: 'Geen examenvragen gegenereerd.' })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[Gemini Stream] Error:', error.message);

    let errorMessage = 'Er ging iets mis met de AI service';
    if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      errorMessage = 'API key configuratie probleem';
    } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
      errorMessage = 'API limiet bereikt, probeer het later opnieuw';
    }

    // If headers already sent (streaming started), send error as SSE event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
}
