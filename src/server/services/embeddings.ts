import { GoogleGenAI } from '@google/genai';
import { db, schema } from '../db';
import { eq, sql } from 'drizzle-orm';
import { DocumentEmbedding, NewDocumentEmbedding } from '../db/schema/embeddings';

// Initialize Gemini client lazily to allow mocking in tests
let genAI: GoogleGenAI | null = null;

export function _resetClient() {
  genAI = null;
}

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });
  }
  return genAI;
}

// Default embedding model
const EMBEDDING_MODEL = 'text-embedding-004';

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embedding for a single text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Gemini requires non-empty string
  if (!text || text.trim().length === 0) {
    return [];
  }

  try {
    const client = getGenAI();
    const result = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });

    if (!result.embedding || !result.embedding.values) {
      throw new Error('No embedding returned from API');
    }

    return result.embedding.values;
  } catch (error) {
    console.error('[Embeddings] Generation error:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple text strings (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Process sequentially to avoid rate limits (can optimize to parallel batches later)
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}

// ============================================================================
// Document Processing
// ============================================================================

/**
 * Chunk text into smaller segments
 * Simple implementation: split by sentences then group by max tokens (approx chars)
 */
export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  if (!text) return [];

  // Simple splitting by periods/newlines to get sentences roughly
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap (last ~200 chars of previous chunk)
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Process a document: Chunk it, generate embeddings, and save to DB
 */
export async function processDocumentEmbeddings(documentId: string): Promise<void> {
  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, documentId),
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const content = document.extractedText;
  if (!content) {
    console.log('[Embeddings] No content to process for document:', documentId);
    return;
  }

  console.log('[Embeddings] Processing document:', documentId);

  // 1. Chunk the text
  const chunks = chunkText(content);
  console.log(`[Embeddings] Created ${chunks.length} chunks`);

  // 2. Generate embeddings for each chunk
  const embeddings = await generateEmbeddings(chunks);

  // 3. Delete existing embeddings for this document (re-processing)
  await db.delete(schema.documentEmbeddings)
    .where(eq(schema.documentEmbeddings.documentId, documentId));

  // 4. Save new embeddings
  const embeddingRecords = chunks.map((chunk, index) => ({
    documentId,
    chunkIndex: index,
    chunkText: chunk,
    embedding: embeddings[index],
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: embeddings[index].length,
    metadata: {
      hasCode: chunk.includes('```') || chunk.includes('function') || chunk.includes('const '),
      section: `Chunk ${index + 1}`,
    },
  }));

  // Batch insert
  if (embeddingRecords.length > 0) {
    await db.insert(schema.documentEmbeddings).values(embeddingRecords);
  }

  console.log(`[Embeddings] Saved ${embeddingRecords.length} embeddings for document ${documentId}`);
}

// ============================================================================
// Vector Search
// ============================================================================

/**
 * Search distinct documents by semantic similarity
 * Note: Uses cosine distance. Requires pgvector extension for efficient search.
 * Currently falls back to client-side sorting if vector ops aren't available in raw SQL types yet.
 * 
 * When pgvector is enabled:
 * ORDER BY embedding <=> '[...]' LIMIT n
 */
export async function searchDocuments(query: string, limit: number = 5): Promise<any[]> {
  const queryEmbedding = await generateEmbedding(query);
  
  // Since we don't have pgvector helper in drizzle-orm pure js, and might not have the extension enabled yet,
  // we strictly perform cosine similarity calculation here using raw SQL if possible, 
  // OR fetch candidate chunks and compute cosine similarity in application memory (fallback for small datasets).
  //
  // For production with pgvector:
  // const similarity = sql`embedding <=> ${JSON.stringify(queryEmbedding)}`;
  //
  // For now, I will assume we might NOT have pgvector enabled on the user's local instance yet,
  // and implementing full vector search in JS for all chunks is expensive.
  // BUT the user asked to "Enable pgvector extension", so ideally we use sql operators.
  
  // Let's try the pgvector syntax. If it fails, the user needs to enable the extension.
  // Operator <=> is cosine distance. 1 - distance = similarity.
  // We want smallest distance.
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    const results = await db.execute(sql`
      SELECT 
        id, 
        document_id, 
        chunk_text, 
        chunk_index,
        1 - (embedding::vector <=> ${embeddingStr}::vector) as similarity
      FROM ${schema.documentEmbeddings}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return results.rows; // Adjust based on driver response structure
  } catch (error: any) {
    if (error.message?.includes('type "vector" does not exist')) {
      console.warn('[Embeddings] pgvector extension not enabled. Falling back to simple keyword search.');
      // Fallback: simple text search (very basic)
      return await db.query.documentEmbeddings.findMany({
        where: sql`chunk_text ILIKE ${`%${query}%`}`,
        limit: limit,
      });
    }
    throw error;
  }
}
