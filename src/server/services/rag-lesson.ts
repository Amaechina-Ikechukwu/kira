import { GoogleGenAI, Type } from '@google/genai';
import { searchDocuments } from './embeddings';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { LessonPage, LessonPageSchema, buildStagesFromLessonPage, GameInterface } from './gemini';

// Initialize Gemini client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

/**
 * Generate a lesson using RAG (Retrieval Augmented Generation)
 * 1. Search for relevant context using embeddings
 * 2. Generate lesson plan using that context
 */
export async function generateLessonFromDocumentWithRAG(
  documentId: string,
  personalityTone: string = 'Hype Man'
): Promise<{ lessonPlan: GameInterface; usedContext: string[] }> {
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // 1. Get document details
  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, documentId),
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const topic = document.title;
  console.log(`[RAG] Generating lesson for "${topic}"`);

  // 2. Search for relevant chunks (RAG)
  // We search for the document title/concepts to get the most relevant parts
  // We also try to cover the beginning of the document usually
  let contextChunks: any[] = [];
  
  try {
    // Search for general overview
    const searchResults = await searchDocuments(`overview of ${topic}`, 5);
    // Filter to only this document
    contextChunks = searchResults.filter((r: any) => r.document_id === documentId);
    
    // If not enough context, fallback to extraction text (if small enough)
    if (contextChunks.length === 0 && document.extractedText) {
      console.log('[RAG] No embeddings found, using raw text start');
      contextChunks = [{ chunk_text: document.extractedText.substring(0, 15000) }];
    }
  } catch (err) {
    console.warn('[RAG] Vector search failed, falling back to raw text:', err);
    if (document.extractedText) {
      contextChunks = [{ chunk_text: document.extractedText.substring(0, 15000) }];
    }
  }

  const contextText = contextChunks.map((c: any) => c.chunk_text).join('\n\n');
  console.log(`[RAG] Retrieved ${contextChunks.length} chunks of context (${contextText.length} chars)`);

  // 3. Generate Lesson Plan
  const prompt = `You are Kira, a friendly and encouraging AI tutor.

Create an engaging interactive lesson about: "${topic}"

BASE YOUR LESSON ON THE FOLLOWING CONTENT:
"""
${contextText.substring(0, 25000)} // Limit context size
"""

Design this as a fun, interactive learning experience:

1. CREATE 3-4 TEACHING SECTIONS that:
   - Break down the *specific concepts found in the content*
   - Explain each concept clearly using the provided content
   - Include a memorable key point for each
   - Make it engaging and conversational
   - STRICTLY stick to the information provided in the content

2. CREATE 3-4 QUIZ QUESTIONS to test understanding:
   - Questions should test the concepts you just taught
   - Provide 4 options with only ONE correct answer
   - Set correctIndex to the index (0-3) of the correct option
   - Include helpful explanations based on the source text

Make the content:
- Beginner-friendly but accurate to the source
- Interesting with real-world examples (if applicable)
- Fun and engaging throughout
- Personality tone: ${personalityTone}
`;

  console.log('[RAG] Sending prompt to Gemini...');

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: LessonPageSchema,
      maxOutputTokens: 8192,
    },
  });

  const responseText = response.text || '{}';
  console.log('[RAG] Response length:', responseText.length);
  
  let lessonPage: LessonPage;
  
  try {
    lessonPage = JSON.parse(responseText) as LessonPage;
  } catch (parseError) {
    console.error('[RAG] JSON parse error:', responseText.substring(0, 500));
    throw new Error('Failed to parse AI response');
  }

  // Build game stages
  const stages = buildStagesFromLessonPage(lessonPage, personalityTone);

  return {
    lessonPlan: {
      personalityTone,
      stages,
    },
    usedContext: contextChunks.map((c: any) => c.chunk_index || 'raw'),
  };
}
