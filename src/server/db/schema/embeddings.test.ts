import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { chunkText, generateEmbedding, generateEmbeddings, _resetClient } from '../../services/embeddings';

// Mock dependencies
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
}));

describe('Embeddings Service', () => {
  const originalEnv = process.env;
  let mockEmbedContent: any;

  beforeEach(() => {
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
    vi.clearAllMocks();
    _resetClient(); // Reset the lazy singleton
    
    // Setup mock for this test run
    mockEmbedContent = vi.fn().mockResolvedValue({
      embedding: { values: [0.1, 0.2, 0.3] }
    });
    
    (GoogleGenAI as any).mockImplementation(() => ({
      models: {
        embedContent: mockEmbedContent,
      }
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('chunkText', () => {
    it('should split text into chunks based on size', () => {
      const text = 'Sentence 1. Sentence 2. Sentence 3. Sentence 4.';
      const chunks = chunkText(text, 20, 5); // Small chunks for testing
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain('Sentence 1');
    });

    it('should handle empty text', () => {
      const chunks = chunkText('');
      expect(chunks).toEqual([]);
    });

    it('should respect max chunk size approximately', () => {
      const longText = 'A'.repeat(100);
      const chunks = chunkText(longText, 10, 0);
      
      const sentenceText = 'Word. '.repeat(50); // 300 chars
      const chunks2 = chunkText(sentenceText, 50, 0);
      
      // Should have multiple chunks
      expect(chunks2.length).toBeGreaterThan(1);
      // Each chunk should be reasonably sized (logic is approximate)
      expect(chunks2[0].length).toBeLessThanOrEqual(50 + 20); // allow some buffer for last sentence
    });
  });

  describe('generateEmbedding', () => {
    it('should call Gemini API and return embedding', async () => {
      const embedding = await generateEmbedding('Hello world');
      
      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: 'text-embedding-004',
        contents: 'Hello world',
      });
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should return empty array for empty input', async () => {
      const embedding = await generateEmbedding('');
      expect(embedding).toEqual([]);
      expect(mockEmbedContent).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockEmbedContent.mockRejectedValue(new Error('API Error'));
      await expect(generateEmbedding('text')).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('generateEmbeddings (batch)', () => {
    it('should process multiple texts', async () => {
      const texts = ['Text 1', 'Text 2'];
      const result = await generateEmbeddings(texts);
      
      expect(result).toHaveLength(2);
      expect(mockEmbedContent).toHaveBeenCalledTimes(2);
      expect(result[0]).toEqual([0.1, 0.2, 0.3]);
    });
  });
});
