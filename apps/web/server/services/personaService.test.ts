/**
 * Unit tests for PersonaService
 * Tests singleton pattern, persona retrieval, user state, keyword matching, and AI integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock AIService before imports - must define class inside factory for hoisting
const mockAnalyzeText = vi.fn();

vi.mock('./aiService', () => {
  // Define the mock class inside the factory function
  class MockAIService {
    static instance: MockAIService | null = null;

    static getInstance() {
      if (!MockAIService.instance) {
        MockAIService.instance = new MockAIService();
      }
      return MockAIService.instance;
    }

    // Must provide callWithFallback since personaService.ts extends prototype with analyzeText
    // that calls callWithFallback
    async callWithFallback(prompt: string) {
      return (globalThis as unknown as { __mockAnalyzeText: (p: string) => Promise<string | null> }).__mockAnalyzeText(prompt);
    }

    async analyzeText(prompt: string) {
      // Access the outer mock function through global
      return (globalThis as unknown as { __mockAnalyzeText: (p: string) => Promise<string | null> }).__mockAnalyzeText(prompt);
    }
  }

  return {
    AIService: MockAIService,
  };
});

// Expose mockAnalyzeText globally so mock class can access it
(globalThis as unknown as { __mockAnalyzeText: typeof mockAnalyzeText }).__mockAnalyzeText = mockAnalyzeText;

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import after mocks
import { PersonaService, DEFAULT_PERSONAS, type Persona } from './personaService';

describe('PersonaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyzeText.mockReset();
  });

  afterEach(() => {
    // Reset singleton instance between tests
    (PersonaService as unknown as { instance: PersonaService | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = PersonaService.getInstance();
      const instance2 = PersonaService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with 8 default personas', () => {
      const service = PersonaService.getInstance();
      const personas = service.getPublicPersonas();
      expect(personas.length).toBe(8);
    });
  });

  describe('Persona Retrieval', () => {
    it('getPublicPersonas should return all 8 public personas', () => {
      const service = PersonaService.getInstance();
      const personas = service.getPublicPersonas();

      expect(personas.length).toBe(8);
      expect(personas.every((p) => p.isPublic)).toBe(true);
    });

    it('getPersona should return persona by ID', () => {
      const service = PersonaService.getInstance();
      const persona = service.getPersona('neutral-analyst');

      expect(persona).not.toBeNull();
      expect(persona!.id).toBe('neutral-analyst');
      expect(persona!.name).toBe('Neutraler Analyst');
    });

    it('getPersona should return null for unknown ID', () => {
      const service = PersonaService.getInstance();
      const persona = service.getPersona('non-existent-persona');

      expect(persona).toBeNull();
    });

    it('getDefaultPersona should return neutral-analyst', () => {
      const service = PersonaService.getInstance();
      const persona = service.getDefaultPersona();

      expect(persona.id).toBe('neutral-analyst');
      expect(persona.isDefault).toBe(true);
    });

    it('getDefaultPersona should fallback to first persona if neutral-analyst missing', () => {
      const service = PersonaService.getInstance();
      // Access private personas map and remove neutral-analyst
      const personasMap = (service as unknown as { personas: Map<string, Persona> }).personas;
      personasMap.delete('neutral-analyst');

      const persona = service.getDefaultPersona();

      // Should return first persona from DEFAULT_PERSONAS array
      expect(persona).toBeDefined();
      expect(persona.id).toBe(DEFAULT_PERSONAS[0].id);
    });
  });

  describe('User Active Persona', () => {
    it('getUserActivePersona should return default for new user', () => {
      const service = PersonaService.getInstance();
      const persona = service.getUserActivePersona('new-user-123');

      expect(persona.id).toBe('neutral-analyst');
    });

    it('setUserActivePersona should return true for valid persona', () => {
      const service = PersonaService.getInstance();
      const result = service.setUserActivePersona('user-123', 'economist');

      expect(result).toBe(true);
    });

    it('setUserActivePersona should return false for invalid persona', () => {
      const service = PersonaService.getInstance();
      const result = service.setUserActivePersona('user-123', 'non-existent-persona');

      expect(result).toBe(false);
    });

    it('getUserActivePersona should return set persona after setUserActivePersona', () => {
      const service = PersonaService.getInstance();

      // Set a different persona
      service.setUserActivePersona('user-456', 'historian');

      // Retrieve it
      const persona = service.getUserActivePersona('user-456');

      expect(persona.id).toBe('historian');
      expect(persona.name).toBe('Historiker');
    });
  });

  describe('Custom Personas', () => {
    it('addCustomPersona should add new persona', () => {
      const service = PersonaService.getInstance();

      const customPersona: Persona = {
        id: 'custom-analyst',
        name: 'Custom Analyst',
        description: 'A custom persona for testing',
        systemPrompt: 'You are a custom analyst.',
        icon: '🧪',
        color: '#ff00ff',
        isDefault: false,
        isPublic: false,
      };

      const result = service.addCustomPersona(customPersona);

      expect(result).toBe(true);

      // Verify it was added
      const retrieved = service.getPersona('custom-analyst');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Custom Analyst');
    });

    it('addCustomPersona should return false for duplicate ID', () => {
      const service = PersonaService.getInstance();

      const duplicatePersona: Persona = {
        id: 'neutral-analyst', // Already exists
        name: 'Duplicate Persona',
        description: 'This should fail',
        systemPrompt: 'Duplicate',
        icon: '❌',
        color: '#000000',
        isDefault: false,
        isPublic: false,
      };

      const result = service.addCustomPersona(duplicatePersona);

      expect(result).toBe(false);
    });
  });

  describe('Prompt Generation', () => {
    it('getAnalysisPrompt should combine persona system prompt with user prompt', () => {
      const service = PersonaService.getInstance();
      const prompt = service.getAnalysisPrompt('economist', 'What are the economic impacts?');

      expect(prompt).toContain('Wirtschaftsanalyst');
      expect(prompt).toContain('Makroökonomische');
      expect(prompt).toContain('What are the economic impacts?');
      expect(prompt).toContain('---');
      expect(prompt).toContain('Benutzeranfrage:');
    });

    it('getAnalysisPrompt should use default persona for unknown ID', () => {
      const service = PersonaService.getInstance();
      const prompt = service.getAnalysisPrompt('unknown-persona', 'Test question');

      // Should use neutral-analyst (default)
      expect(prompt).toContain('neutraler Nachrichtenanalyst');
      expect(prompt).toContain('Fakten von Meinungen zu trennen');
      expect(prompt).toContain('Test question');
    });
  });

  describe('Keyword-Based Suggestion', () => {
    it('suggestPersona should return economist for wirtschaft keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Was sind die Wirtschaft Auswirkungen?');

      expect(persona.id).toBe('economist');
    });

    it('suggestPersona should return economist for sanktion keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Welche Sanktionen wurden verhängt?');

      expect(persona.id).toBe('economist');
    });

    it('suggestPersona should return historian for geschichte keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Wie war die Geschichte dieses Konflikts?');

      expect(persona.id).toBe('historian');
    });

    it('suggestPersona should return humanitarian for fluchtling keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Wie geht es den Flüchtlingen?');

      expect(persona.id).toBe('humanitarian');
    });

    it('suggestPersona should return media-critic for propaganda keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Gibt es Propaganda in der Berichterstattung?');

      expect(persona.id).toBe('media-critic');
    });

    it('suggestPersona should return geopolitical-strategist for macht keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Wer hat die Macht in dieser Region?');

      expect(persona.id).toBe('geopolitical-strategist');
    });

    it('suggestPersona should return explainer for warum keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Warum ist das passiert?');

      expect(persona.id).toBe('explainer');
    });

    it('suggestPersona should return devil-advocate for kritisch keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Ich möchte das kritisch betrachten');

      expect(persona.id).toBe('devil-advocate');
    });

    it('suggestPersona should return default for no keyword match', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Random question without keywords');

      expect(persona.id).toBe('neutral-analyst');
    });

    // Additional edge case tests for keyword matching
    it('suggestPersona should handle case insensitivity', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('WIRTSCHAFT in Großbuchstaben');

      expect(persona.id).toBe('economist');
    });

    it('suggestPersona should return historian for historisch keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Historisch gesehen ist das wichtig');

      expect(persona.id).toBe('historian');
    });

    it('suggestPersona should return humanitarian for humanitar keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Die humanitäre Lage ist kritisch');

      expect(persona.id).toBe('humanitarian');
    });

    it('suggestPersona should return media-critic for medien keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Wie berichten die Medien darüber?');

      expect(persona.id).toBe('media-critic');
    });

    it('suggestPersona should return geopolitical-strategist for strateg keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Die strategische Bedeutung ist enorm');

      expect(persona.id).toBe('geopolitical-strategist');
    });

    it('suggestPersona should return explainer for erklar keyword', () => {
      const service = PersonaService.getInstance();
      const persona = service.suggestPersona('Kannst du das erklären?');

      expect(persona.id).toBe('explainer');
    });
  });

  describe('AI Analysis Integration', () => {
    it('analyzeWithPersona should call AIService.analyzeText', async () => {
      mockAnalyzeText.mockResolvedValue('Mock AI analysis response');

      const service = PersonaService.getInstance();
      await service.analyzeWithPersona('economist', 'What is the impact?', 'Context here');

      expect(mockAnalyzeText).toHaveBeenCalled();
      const callArg = mockAnalyzeText.mock.calls[0][0];
      expect(callArg).toContain('Wirtschaftsanalyst');
      expect(callArg).toContain('What is the impact?');
      expect(callArg).toContain('Context here');
    });

    it('analyzeWithPersona should return response with persona', async () => {
      mockAnalyzeText.mockResolvedValue('Detailed economic analysis');

      const service = PersonaService.getInstance();
      const result = await service.analyzeWithPersona('economist', 'Question', 'Context');

      expect(result.response).toBe('Detailed economic analysis');
      expect(result.persona.id).toBe('economist');
      expect(result.persona.name).toBe('Wirtschaftsanalyst');
    });

    it('analyzeWithPersona should use default persona for unknown ID', async () => {
      mockAnalyzeText.mockResolvedValue('Neutral analysis');

      const service = PersonaService.getInstance();
      const result = await service.analyzeWithPersona(
        'non-existent-persona',
        'Question',
        'Context'
      );

      expect(result.persona.id).toBe('neutral-analyst');
      expect(result.response).toBe('Neutral analysis');
    });

    it('analyzeWithPersona should return fallback message when AI returns null', async () => {
      mockAnalyzeText.mockResolvedValue(null);

      const service = PersonaService.getInstance();
      const result = await service.analyzeWithPersona('historian', 'Question', 'Context');

      expect(result.response).toBe('Analyse konnte nicht durchgeführt werden.');
      expect(result.persona.id).toBe('historian');
    });
  });

  describe('Persona Properties', () => {
    it('all default personas should have required properties', () => {
      const service = PersonaService.getInstance();
      const personas = service.getPublicPersonas();

      for (const persona of personas) {
        expect(persona.id).toBeTruthy();
        expect(persona.name).toBeTruthy();
        expect(persona.description).toBeTruthy();
        expect(persona.systemPrompt).toBeTruthy();
        expect(persona.icon).toBeTruthy();
        expect(persona.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(typeof persona.isDefault).toBe('boolean');
        expect(typeof persona.isPublic).toBe('boolean');
      }
    });

    it('only neutral-analyst should be marked as default', () => {
      const service = PersonaService.getInstance();
      const personas = service.getPublicPersonas();

      const defaultPersonas = personas.filter((p) => p.isDefault);
      expect(defaultPersonas.length).toBe(1);
      expect(defaultPersonas[0].id).toBe('neutral-analyst');
    });

    it('all default personas should have unique IDs', () => {
      const service = PersonaService.getInstance();
      const personas = service.getPublicPersonas();

      const ids = personas.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all expected persona IDs should exist', () => {
      const service = PersonaService.getInstance();
      const expectedIds = [
        'neutral-analyst',
        'devil-advocate',
        'geopolitical-strategist',
        'media-critic',
        'historian',
        'economist',
        'humanitarian',
        'explainer',
      ];

      for (const id of expectedIds) {
        const persona = service.getPersona(id);
        expect(persona).not.toBeNull();
      }
    });
  });
});
