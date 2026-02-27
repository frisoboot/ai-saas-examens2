/**
 * Vercel Serverless Function - Firecrawl PDF Exam Scraper
 * Extraheert examenvragen uit PDF documenten via Firecrawl
 * Admin-only endpoint
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Firecrawl from '@mendable/firecrawl-js';
import { z } from 'zod';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, rateLimits } from './utils/rateLimiter.js';

// Check of email een admin is
const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

// Stricter rate limit for Firecrawl (costs credits per page)
const firecrawlRateLimit = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000 // 10 per 15 minutes
};

// Zod schema for structured exam question extraction
const ExamQuestionSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(['MULTIPLE_CHOICE', 'OPEN']),
    text: z.string().describe('De volledige vraagtekst inclusief vraagnummer'),
    contextText: z.string().optional().describe('Brontekst of context bij de vraag'),
    options: z.array(z.string()).optional().describe('Antwoordopties bij meerkeuze (bijv. A, B, C, D)'),
    correctAnswer: z.string().optional().describe('Het juiste antwoord bij meerkeuze'),
    modelAnswer: z.string().optional().describe('Modelantwoord bij open vragen'),
    score: z.number().optional().describe('Maximaal aantal punten voor deze vraag'),
    section: z.string().optional().describe('Sectie/onderdeel titel'),
    sectionIntro: z.string().optional().describe('Introductietekst van het onderdeel'),
  }))
});

// Extraction prompt optimized for Dutch exams
const EXTRACTION_PROMPT = `Extraheer alle examenvragen uit dit PDF-document. Dit is een officieel Nederlands eindexamen.

Regels:
- Elke genummerde vraag is een aparte vraag
- Type MULTIPLE_CHOICE als er antwoordopties zijn (A/B/C/D of meerkeuze)
- Type OPEN als de leerling zelf een antwoord moet formuleren
- Neem de volledige vraagtekst over, inclusief eventuele deelvragen
- Neem bronteksten en context mee als die bij een vraag horen
- Geef het aantal punten per vraag als vermeld (bijv. "2p" betekent score: 2)
- Als het examen in onderdelen/secties is verdeeld, geef de sectienaam en introductietekst mee
- Bewaar de originele Nederlandse tekst exact zoals deze in het document staat`;

// Valid subjects list (matches constants/subjects.ts)
const VALID_SUBJECTS = [
  'Aardrijkskunde', 'Bedrijfseconomie', 'Biologie', 'Duits', 'Economie',
  'Engels', 'Frans', 'Geschiedenis', 'Kunst Algemeen', 'Maatschappijwetenschappen',
  'Natuurkunde', 'Nederlands', 'Scheikunde', 'Wiskunde A', 'Wiskunde B', 'Wiskunde C'
];

const VALID_LEVELS = ['VMBO-TL', 'HAVO', 'VWO'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check server config
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    if (!firecrawlApiKey) {
      return res.status(500).json({ error: 'Firecrawl API key niet geconfigureerd' });
    }

    // Admin auth
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    // Rate limiting per admin user
    const rateLimitResult = checkRateLimit(`firecrawl:${user.id}`, firecrawlRateLimit);

    if (!rateLimitResult.allowed) {
      res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
      return res.status(429).json({
        error: 'Te veel scrape verzoeken. Probeer het later opnieuw.',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Input validation
    const { url, subject, level, examYear } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is verplicht' });
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'Alleen HTTP(S) URLs zijn toegestaan' });
      }
    } catch {
      return res.status(400).json({ error: 'Ongeldige URL' });
    }

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
      return res.status(400).json({ error: `Ongeldig vak. Geldige vakken: ${VALID_SUBJECTS.join(', ')}` });
    }

    if (!level || !VALID_LEVELS.includes(level)) {
      return res.status(400).json({ error: 'Ongeldig niveau. Gebruik: VMBO-TL, HAVO, of VWO' });
    }

    if (!examYear || typeof examYear !== 'number' || examYear < 2000 || examYear > 2100) {
      return res.status(400).json({ error: 'Examenjaar moet tussen 2000 en 2100 liggen' });
    }

    // Call Firecrawl
    const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

    console.log(`[Firecrawl] Scraping exam PDF: ${url} (${subject} ${level} ${examYear})`);

    const scrapeResult = await firecrawl.scrapeUrl(url, {
      formats: ['extract'],
      extract: {
        schema: ExamQuestionSchema,
        prompt: EXTRACTION_PROMPT,
      }
    });

    if (!scrapeResult.success) {
      console.error('[Firecrawl] Scrape failed:', scrapeResult);
      return res.status(500).json({ error: 'Kon de PDF niet verwerken. Controleer of de URL correct is.' });
    }

    // Extract questions from result
    const extractedData = scrapeResult.extract as { questions?: any[] } | undefined;
    const rawQuestions = extractedData?.questions || [];

    if (rawQuestions.length === 0) {
      return res.status(200).json({
        success: true,
        questions: [],
        metadata: { questionsFound: 0 }
      });
    }

    // Map to BulkImportQuestion format with injected metadata
    const questions = rawQuestions
      .filter((q: any) => q.text && q.text.trim().length > 0)
      .map((q: any) => ({
        subject,
        level,
        type: q.type === 'MULTIPLE_CHOICE' ? 'MULTIPLE_CHOICE' : 'OPEN',
        text: q.text.trim(),
        examYear,
        examType: 'official_exam',
        source: url,
        contextText: q.contextText?.trim() || undefined,
        options: q.type === 'MULTIPLE_CHOICE' && Array.isArray(q.options) ? q.options : undefined,
        correctAnswer: q.correctAnswer || undefined,
        modelAnswer: q.modelAnswer || undefined,
        score: typeof q.score === 'number' ? q.score : undefined,
        section: q.section || undefined,
        sectionIntro: q.sectionIntro || undefined,
      }));

    console.log(`[Firecrawl] Extracted ${questions.length} questions from ${url}`);

    return res.status(200).json({
      success: true,
      questions,
      metadata: {
        questionsFound: questions.length,
      }
    });

  } catch (error: any) {
    console.error('[Firecrawl API] Error:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });

    let errorMessage = 'Er ging iets mis bij het verwerken van de PDF';
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      errorMessage = 'Het verwerken van de PDF duurde te lang. Probeer een kleiner document.';
    } else if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
      errorMessage = 'Firecrawl rate limit bereikt. Probeer het over een paar minuten opnieuw.';
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Firecrawl API key is ongeldig. Neem contact op met de beheerder.';
    }

    return res.status(500).json({ error: errorMessage });
  }
}
