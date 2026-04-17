/**
 * AI Persona Service
 * Customizable AI personalities for different analysis styles
 */

import logger from '../utils/logger';
import { AIService } from './aiService';

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isPublic: boolean;
}

// Default personas available to all users
export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'neutral-analyst',
    name: 'Neutraler Analyst',
    description: 'Sachliche, faktenbasierte Analyse ohne Wertung',
    systemPrompt: `Du bist ein neutraler Nachrichtenanalyst. Deine Aufgabe ist es:
- Fakten von Meinungen zu trennen
- Alle Perspektiven gleichwertig darzustellen
- Keine eigene Position zu beziehen
- Quellenqualität objektiv zu bewerten
- Emotionale Sprache zu vermeiden
Antworte sachlich, präzise und ausgewogen.`,
    icon: '⚖️',
    color: '#6b7280',
    isDefault: true,
    isPublic: true,
  },
  {
    id: 'devil-advocate',
    name: 'Advocatus Diaboli',
    description: 'Hinterfragt kritisch jede Position und Behauptung',
    systemPrompt: `Du bist ein kritischer Analyst, der als Advocatus Diaboli agiert:
- Hinterfrage jede Behauptung und Quelle
- Suche nach alternativen Erklärungen
- Identifiziere logische Schwächen in Argumenten
- Stelle unbequeme Fragen
- Weise auf mögliche blinde Flecken hin
Sei respektvoll aber unnachgiebig in deiner kritischen Analyse.`,
    icon: '😈',
    color: '#ef4444',
    isDefault: false,
    isPublic: true,
  },
  {
    id: 'geopolitical-strategist',
    name: 'Geopolitischer Stratege',
    description: 'Analysiert Machtverhältnisse und strategische Interessen',
    systemPrompt: `Du bist ein geopolitischer Stratege mit Fokus auf:
- Machtstrukturen und deren Veränderungen
- Strategische Interessen der Akteure
- Historische Parallelen und Muster
- Wirtschaftliche Verflechtungen
- Militärische Kapazitäten und Doktrinen
- Langfristige Trends und Szenarien
Analysiere wie ein Berater eines Außenministeriums.`,
    icon: '🌍',
    color: '#3b82f6',
    isDefault: false,
    isPublic: true,
  },
  {
    id: 'media-critic',
    name: 'Medienkritiker',
    description: 'Analysiert Framing, Narrative und journalistische Qualität',
    systemPrompt: `Du bist ein Medien- und Kommunikationswissenschaftler:
- Analysiere Framing und Narrative
- Identifiziere rhetorische Techniken
- Bewerte journalistische Standards
- Erkenne Propaganda-Muster
- Vergleiche Berichterstattung verschiedener Quellen
- Hinterfrage Überschriften vs. Inhalt
Fokussiere auf WIE berichtet wird, nicht nur WAS.`,
    icon: '📺',
    color: '#a855f7',
    isDefault: false,
    isPublic: true,
  },
  {
    id: 'historian',
    name: 'Historiker',
    description: 'Ordnet aktuelle Ereignisse in historischen Kontext ein',
    systemPrompt: `Du bist ein Historiker mit breitem Wissen:
- Ziehe Parallelen zu historischen Ereignissen
- Erkläre langfristige Entwicklungen
- Kontextualisiere aktuelle Konflikte
- Identifiziere wiederkehrende Muster
- Korrigiere historische Missverständnisse
- Nutze Primärquellen wenn möglich
Verbinde Vergangenheit und Gegenwart für tieferes Verständnis.`,
    icon: '📜',
    color: '#78350f',
    isDefault: false,
    isPublic: true,
  },
  {
    id: 'economist',
    name: 'Wirtschaftsanalyst',
    description: 'Fokus auf wirtschaftliche Auswirkungen und Zusammenhänge',
    systemPrompt: `Du bist ein Wirtschaftsanalyst mit Fokus auf:
- Makroökonomische Auswirkungen
- Handelsbeziehungen und Sanktionen
- Rohstoffmärkte und Lieferketten
- Währungen und Finanzmärkte
- Wirtschaftliche Interessen der Akteure
- Kosten-Nutzen-Analysen
Erkläre komplexe Wirtschaftszusammenhänge verständlich.`,
    icon: '📊',
    color: '#22c55e',
    isDefault: false,
    isPublic: true,
  },
  {
    id: 'humanitarian',
    name: 'Humanitärer Beobachter',
    description: 'Fokus auf menschliche Auswirkungen und Völkerrecht',
    systemPrompt: `Du bist ein humanitärer Analyst mit Fokus auf:
- Menschliche Auswirkungen von Konflikten
- Völkerrecht und Menschenrechte
- Flüchtlingsbewegungen und Vertreibung
- Humanitäre Hilfe und Zugang
- Zivilbevölkerung und Infrastruktur
- Langzeitfolgen für Gesellschaften
Bringe die menschliche Dimension in den Vordergrund.`,
    icon: '❤️',
    color: '#ec4899',
    isDefault: false,
    isPublic: true,
  },
  {
    id: 'explainer',
    name: 'Erklärbär',
    description: 'Erklärt komplexe Themen einfach und verständlich',
    systemPrompt: `Du bist ein Bildungsexperte, der komplexe Themen erklärt:
- Verwende einfache Sprache
- Nutze Analogien und Beispiele
- Erkläre Hintergründe und Zusammenhänge
- Vermeide Fachjargon oder erkläre ihn
- Baue Wissen schrittweise auf
- Fasse wichtige Punkte zusammen
Erkläre so, dass auch Laien es verstehen.`,
    icon: '🐻',
    color: '#f59e0b',
    isDefault: false,
    isPublic: true,
  },
];

export class PersonaService {
  private static instance: PersonaService;
  private personas: Map<string, Persona> = new Map();
  private userActivePersonas: Map<string, string> = new Map(); // userId -> personaId

  private constructor() {
    // Initialize with default personas
    for (const persona of DEFAULT_PERSONAS) {
      this.personas.set(persona.id, persona);
    }
    logger.info(`✓ Persona service initialized with ${this.personas.size} personas`);
  }

  static getInstance(): PersonaService {
    if (!PersonaService.instance) {
      PersonaService.instance = new PersonaService();
    }
    return PersonaService.instance;
  }

  /**
   * Get all public personas
   */
  getPublicPersonas(): Persona[] {
    return Array.from(this.personas.values()).filter((p) => p.isPublic);
  }

  /**
   * Get persona by ID
   */
  getPersona(id: string): Persona | null {
    return this.personas.get(id) || null;
  }

  /**
   * Get default persona
   */
  getDefaultPersona(): Persona {
    return this.personas.get('neutral-analyst') || DEFAULT_PERSONAS[0];
  }

  /**
   * Get user's active persona
   */
  getUserActivePersona(userId: string): Persona {
    const personaId = this.userActivePersonas.get(userId);
    if (personaId) {
      const persona = this.personas.get(personaId);
      if (persona) return persona;
    }
    return this.getDefaultPersona();
  }

  /**
   * Set user's active persona
   */
  setUserActivePersona(userId: string, personaId: string): boolean {
    if (!this.personas.has(personaId)) {
      return false;
    }
    this.userActivePersonas.set(userId, personaId);
    return true;
  }

  /**
   * Add custom persona (for future user-created personas)
   */
  addCustomPersona(persona: Persona): boolean {
    if (this.personas.has(persona.id)) {
      return false;
    }
    this.personas.set(persona.id, persona);
    return true;
  }

  /**
   * Get system prompt for AI analysis with persona
   */
  getAnalysisPrompt(personaId: string, userPrompt: string): string {
    const persona = this.getPersona(personaId) || this.getDefaultPersona();
    return `${persona.systemPrompt}

---

Benutzeranfrage: ${userPrompt}`;
  }

  /**
   * Analyze with specific persona
   */
  async analyzeWithPersona(
    personaId: string,
    question: string,
    context: string
  ): Promise<{ response: string; persona: Persona }> {
    const persona = this.getPersona(personaId) || this.getDefaultPersona();
    const aiService = AIService.getInstance();

    const prompt = `${persona.systemPrompt}

---

Kontext (aktuelle Nachrichtenartikel):
${context}

---

Frage: ${question}

Antworte im Stil deiner Persona und beziehe dich auf den gegebenen Kontext.`;

    const response = await aiService.analyzeText(prompt);

    return {
      response: response || 'Analyse konnte nicht durchgeführt werden.',
      persona,
    };
  }

  /**
   * Get persona suggestions based on question type
   */
  suggestPersona(question: string): Persona {
    const lowerQuestion = question.toLowerCase();

    // Match keywords to personas
    if (
      lowerQuestion.includes('wirtschaft') ||
      lowerQuestion.includes('sanktion') ||
      lowerQuestion.includes('handel') ||
      lowerQuestion.includes('markt')
    ) {
      return this.personas.get('economist') || this.getDefaultPersona();
    }

    if (
      lowerQuestion.includes('geschichte') ||
      lowerQuestion.includes('historisch') ||
      lowerQuestion.includes('früher')
    ) {
      return this.personas.get('historian') || this.getDefaultPersona();
    }

    if (
      lowerQuestion.includes('flüchtling') ||
      lowerQuestion.includes('humanitär') ||
      lowerQuestion.includes('zivilisten') ||
      lowerQuestion.includes('menschenrecht')
    ) {
      return this.personas.get('humanitarian') || this.getDefaultPersona();
    }

    if (
      lowerQuestion.includes('medien') ||
      lowerQuestion.includes('berichterstattung') ||
      lowerQuestion.includes('propaganda') ||
      lowerQuestion.includes('framing')
    ) {
      return this.personas.get('media-critic') || this.getDefaultPersona();
    }

    if (
      lowerQuestion.includes('strateg') ||
      lowerQuestion.includes('macht') ||
      lowerQuestion.includes('interessen') ||
      lowerQuestion.includes('geopolit')
    ) {
      return this.personas.get('geopolitical-strategist') || this.getDefaultPersona();
    }

    if (
      lowerQuestion.includes('erklär') ||
      lowerQuestion.includes('versteh') ||
      lowerQuestion.includes('was ist') ||
      lowerQuestion.includes('warum')
    ) {
      return this.personas.get('explainer') || this.getDefaultPersona();
    }

    if (
      lowerQuestion.includes('kritisch') ||
      lowerQuestion.includes('hinterfrag') ||
      lowerQuestion.includes('wirklich')
    ) {
      return this.personas.get('devil-advocate') || this.getDefaultPersona();
    }

    return this.getDefaultPersona();
  }
}

// Helper to extend AIService with persona support
AIService.prototype.analyzeText = async function (prompt: string): Promise<string | null> {
  // Use the existing callWithFallback method
  return (this as any).callWithFallback(prompt);
};

export default PersonaService;
