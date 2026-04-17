import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger';

const router = Router();

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
    } catch (err) {
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
    } catch (err) {
      logger.debug('OpenRouter failed, trying next provider');
    }
  }

  // Try Anthropic last (premium)
  if (anthropicClient) {
    try {
      const messages: Anthropic.MessageParam[] = [];
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
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
  sentiment: string;
  url: string;
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

    // Build context from articles
    const articleContext = context
      .map(
        (a, i) =>
          `[${i + 1}] "${a.title}" (${a.source}, ${a.perspective}, ${a.sentiment})\n${a.summary}`
      )
      .join('\n\n');

    const systemPrompt = `Du bist ein KI-Assistent für Nachrichtenanalyse zum Nahost-Konflikt.
Du hast Zugang zu ${context.length} aktuellen Artikeln aus verschiedenen Perspektiven.

KRITISCH WICHTIG - ZITIER-REGELN:
- Du MUSST für JEDE Behauptung eine Quelle angeben
- Format: [1], [2], [3] etc. entsprechend der Artikel-Nummern
- Mehrere Quellen für gleiche Info: [1][2][3]
- NIEMALS Informationen ohne Zitat nennen

Beispiel guter Antwort:
"Laut westlichen Quellen wurden Verhandlungen aufgenommen [1][3], während nahöstliche Medien von anhaltenden Spannungen berichten [2][5]. Die türkische Berichterstattung fokussiert auf diplomatische Bemühungen [4]."

Deine Aufgaben:
- Beantworte Fragen NUR basierend auf den bereitgestellten Artikeln
- Vergleiche verschiedene Perspektiven objektiv
- Weise auf Unterschiede in der Berichterstattung hin
- Bleibe neutral und faktenbasiert
- Bei widersprüchlichen Informationen: zeige beide Seiten mit jeweiligen Quellen

Antworte auf Deutsch, prägnant und hilfreich.`;

    const userPrompt = `ARTIKEL-KONTEXT:
${articleContext}

FRAGE: ${question}

ANWEISUNG:
Beantworte die Frage basierend AUSSCHLIESSLICH auf den obigen Artikeln.
Du MUSST nach JEDER Aussage die Quellennummer(n) in eckigen Klammern angeben: [1], [2], etc.
Wenn mehrere Artikel dieselbe Information liefern, gib alle an: [1][2][3]
Vergleiche unterschiedliche Perspektiven und zeige deren Quellen.`;

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
    } catch (parseError) {
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

export default router;
