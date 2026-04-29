import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import logger from '../utils/logger';
import { AIService } from '../services/aiService';
import { FactCheckRequestSchema, LocaleSchema } from '../openapi/schemas';

const router = Router();

// AuthRequest is populated upstream by authMiddleware (mounted in server/index.ts:167).
// Adding authMiddleware here is the documented anti-pattern (RESEARCH.md mount-order).
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((e) => e.message).join(', ');
}

/**
 * Belt-and-suspenders prompt-injection rejection (T-38-12).
 *
 * Rejects user claims that contain role-play markers an LLM might honor as
 * instruction overrides. The prompt-template `<<<CLAIM>>>` delimiter in the
 * factCheckPrompt builder (Plan 38-02) is the second layer; the schema-level
 * 10-500 char cap is the third. Defense in depth.
 */
const INJECTION_PATTERN = /\n\s*(ignore\s+previous|system\s*:|###\s*instruction|assistant\s*:)/i;

const localeQuerySchema = z.object({ locale: LocaleSchema.optional() });

// Multi-provider AI setup with fallback chain
let anthropicClient: Anthropic | null = null;
let openrouterClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

// Initialize available clients
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic();
  logger.info('AI Routes: Anthropic client initialized');
}
if (process.env.OPENROUTER_API_KEY) {
  openrouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });
  logger.info('AI Routes: OpenRouter client initialized');
}
if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  logger.info('AI Routes: Gemini client initialized');
}

// Helper: Call AI with fallback chain
async function callAIWithFallback(
  systemPrompt: string,
  userPrompt: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  // Try Gemini first (free)
  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const fullPrompt = `${systemPrompt}\n\n${conversationHistory?.map(m => `${m.role}: ${m.content}`).join('\n') || ''}\n\nUser: ${userPrompt}`;
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      if (text) return text;
    } catch {
      logger.debug('Gemini failed, trying next provider');
    }
  }

  // Try OpenRouter second (cheap)
  if (openrouterClient) {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];
      if (conversationHistory) {
        messages.push(...conversationHistory);
      }
      messages.push({ role: 'user', content: userPrompt });

      const response = await openrouterClient.chat.completions.create({
        model: 'google/gemma-3-27b-it:free',
        messages,
        max_tokens: 1024,
      });
      const text = response.choices[0]?.message?.content;
      if (text) return text;
    } catch {
      logger.debug('OpenRouter failed, trying next provider');
    }
  }

  // Try Anthropic last (premium)
  if (anthropicClient) {
    try {
      const messages: Anthropic.MessageParam[] = [];
      if (conversationHistory && conversationHistory.length > 0) {
        // Limit to last 4 messages for token efficiency (already optimized by frontend)
        const recentHistory = conversationHistory.slice(-4);
        messages.push(...recentHistory);
      }
      messages.push({ role: 'user', content: userPrompt });

      const message = await anthropicClient.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      const content = message.content[0];
      if (content.type === 'text') return content.text;
    } catch (err) {
      logger.error('Anthropic failed:', err);
    }
  }

  throw new Error('All AI providers failed or unavailable');
}

interface ArticleContext {
  id: string;
  title: string;
  summary: string;
  source: string;
  perspective: string;
  sentiment?: string; // Optional - frontend may omit for token savings
  url: string;
}

// Coverage gap detection (per D-04, D-05, D-06)
// Exported for unit testing
export function detectCoverageGap(context: ArticleContext[]): {
  hasGap: boolean;
  regionCount: number;
  regions: string[];
} {
  const perspectives = context
    .map(a => a.perspective)
    .filter(p => typeof p === 'string' && p.length > 0);
  const uniqueRegions = [...new Set(perspectives)];
  const regionCount = uniqueRegions.length;
  // Gap exists if we have sources but fewer than 3 regions (per D-05)
  const hasGap = regionCount > 0 && regionCount < 3;
  return { hasGap, regionCount, regions: uniqueRegions };
}

export function buildGapInstruction(hasGap: boolean, regionCount: number, regions: string[]): string {
  if (!hasGap) return '';
  return `\nHINWEIS: Die Quellen stammen nur aus ${regionCount} Region(en) (${regions.join(', ')}). Erwaehne am Ende deiner Antwort kurz, dass weitere Perspektiven hilfreich sein koennten.`;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// RAG-style Ask AI endpoint with conversation history support
router.post('/ask', async (req, res) => {
  try {
    const { question, context, conversationHistory } = req.body as {
      question: string;
      context: ArticleContext[];
      conversationHistory?: ConversationMessage[];
    };

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Build compact context from articles (optimized for token efficiency)
    const articleContext = context
      .map(
        (a, i) =>
          `[${i + 1}] ${a.title} | ${a.source} (${a.perspective})\n${a.summary?.slice(0, 150) || ''}`
      )
      .join('\n\n');

    // Detect coverage gap (per D-04, D-05)
    const { hasGap, regionCount, regions } = detectCoverageGap(context);
    const gapInstruction = buildGapInstruction(hasGap, regionCount, regions);

    const systemPrompt = `Nachrichtenanalyse-Assistent. ${context.length} Artikel verfügbar.

ZITIER-PFLICHT: Jede Aussage mit [1], [2] etc. belegen. Mehrere Quellen: [1][2][3].${gapInstruction}

Aufgaben: Fragen anhand der Artikel beantworten, Perspektiven vergleichen, Unterschiede aufzeigen, neutral bleiben.

Antworte auf Deutsch, prägnant.`;

    const userPrompt = `ARTIKEL:
${articleContext}

FRAGE: ${question}

Antworte basierend auf den Artikeln. Zitiere mit [1], [2] etc.`;

    // Check if any AI provider is available
    if (!geminiClient && !openrouterClient && !anthropicClient) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'Please configure GEMINI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY'
      });
    }

    // Use fallback chain to get response
    const responseText = await callAIWithFallback(systemPrompt, userPrompt, conversationHistory);

    // CITATION TRACKING: Extract article references from AI response
    // Claude is instructed to cite sources as [1], [2], [3] etc.
    // We parse these and map back to article IDs for frontend display
    // Find referenced sources (look for [1], [2], etc. in response)
    const sourceRefs = responseText.match(/\[(\d+)\]/g) || [];
    const uniqueRefs = [...new Set(sourceRefs.map((r) => parseInt(r.slice(1, -1))))];
    const sources = uniqueRefs
      .filter((idx) => idx > 0 && idx <= context.length)
      .map((idx) => ({
        id: context[idx - 1].id,
        title: context[idx - 1].title,
        url: context[idx - 1].url,
      }));

    res.json({
      answer: responseText,
      sources,
      model: 'claude-3-haiku',
    });
  } catch (error) {
    console.error('AI Ask error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// Propaganda detection endpoint
router.post('/propaganda', async (req, res) => {
  try {
    const { title, content, source, perspective } = req.body as {
      title: string;
      content: string;
      source: string;
      perspective: string;
    };

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const systemPrompt = `Du bist ein Experte für Medienanalyse und Propaganda-Erkennung.
Analysiere den folgenden Nachrichtenartikel auf Propaganda-Indikatoren.

Bewerte auf einer Skala von 0-100, wobei:
- 0-30: Niedrig (sachliche Berichterstattung)
- 31-60: Mittel (einige tendenziöse Elemente)
- 61-100: Hoch (stark propagandistisch)

Suche nach folgenden Indikatoren:
- emotional_language: Übermäßig emotionale Sprache
- one_sided: Einseitige Darstellung ohne Gegenperspektiven
- missing_sources: Fehlende oder vage Quellenangaben
- loaded_words: Stark wertende/geladene Begriffe
- false_dilemma: Falsche Schwarz-Weiß-Darstellungen
- appeal_to_fear: Angst- oder Panikappelle
- bandwagon: "Alle denken so" Argumentationen
- ad_hominem: Persönliche Angriffe statt Sachargumente

Antworte NUR mit validem JSON im folgenden Format:
{
  "score": <0-100>,
  "indicators": [
    {
      "type": "<indicator_type>",
      "description": "<kurze Beschreibung>",
      "severity": "<low|medium|high>",
      "examples": ["<Zitat aus dem Text>"]
    }
  ],
  "summary": "<1-2 Sätze Zusammenfassung>",
  "recommendations": ["<Empfehlung 1>", "<Empfehlung 2>"]
}`;

    const userPrompt = `QUELLE: ${source} (${perspective})

TITEL: ${title}

INHALT:
${content.substring(0, 3000)}

Analysiere diesen Artikel auf Propaganda-Indikatoren.`;

    // Check if any AI provider is available
    if (!geminiClient && !openrouterClient && !anthropicClient) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'Please configure GEMINI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY'
      });
    }

    // Use fallback chain to get response
    const responseText = await callAIWithFallback(systemPrompt, userPrompt);

    // Parse JSON response
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        res.json(analysis);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // Fallback response if parsing fails
      res.json({
        score: 50,
        indicators: [],
        summary: 'Analyse konnte nicht vollständig durchgeführt werden.',
        recommendations: ['Bitte überprüfen Sie die Informationen aus mehreren Quellen.'],
      });
    }
  } catch (error) {
    console.error('Propaganda detection error:', error);
    res.status(500).json({ error: 'Failed to analyze article' });
  }
});

// =============================================================================
// Phase 38 — Advanced AI Features (Plan 38-03)
// =============================================================================
// New handlers route through AIService.getInstance() (the singleton that owns
// the multi-provider fallback chain) — they do NOT extend `callAIWithFallback`
// above, which is a legacy helper used only by /ask + /propaganda.
//
// Auth + tier-limiting come from the upstream chain at server/index.ts:167:
//   app.use('/api/ai', authMiddleware, aiTierLimiter, aiRoutes);
// Adding authMiddleware here is the anti-pattern in RESEARCH.md.

/**
 * POST /api/ai/fact-check — exported handler (testable in isolation).
 */
export async function handleFactCheck(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = FactCheckRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ success: false, error: formatZodError(result.error) });
      return;
    }

    // Belt-and-suspenders prompt-injection rejection (T-38-12).
    if (INJECTION_PATTERN.test(result.data.claim)) {
      res.status(400).json({ success: false, error: 'Claim contains forbidden patterns' });
      return;
    }

    const userId = req.user!.userId;
    const { claim, articleId, language } = result.data;
    const locale = language ?? 'en';

    const aiService = AIService.getInstance();
    const verdict = await aiService.factCheckClaim({ claim, articleId, userId, locale });

    res.json({ success: true, data: verdict });
  } catch (err) {
    logger.error('Fact-check error:', err);
    res.status(500).json({ success: false, error: 'Failed to fact-check claim' });
  }
}

/**
 * GET /api/ai/source-credibility/:sourceId — exported handler.
 *
 * Note: per Plan 38-02 fallbackCredibility, the service NEVER throws on
 * unknown sourceId — it returns a degraded score=0 result. So 404 is not
 * a normal flow here; the OpenAPI spec lists 404 only for forward-compat.
 */
export async function handleSourceCredibility(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { sourceId } = req.params;
    const queryParse = localeQuerySchema.safeParse(req.query);
    if (!queryParse.success) {
      res.status(400).json({ success: false, error: formatZodError(queryParse.error) });
      return;
    }
    const locale = queryParse.data.locale ?? 'en';

    const aiService = AIService.getInstance();
    const data = await aiService.getSourceCredibility(sourceId, locale);

    res.set('Cache-Control', 'public, max-age=600');
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Source-credibility error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch source credibility' });
  }
}

router.post('/fact-check', handleFactCheck);
router.get('/source-credibility/:sourceId', handleSourceCredibility);

export default router;
