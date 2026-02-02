import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary';
import { extractTextFromPdf } from '../services/pdf';
import { generateExploratoryLesson } from '../services/gemini';
import { processDocumentEmbeddings } from '../services/embeddings';
import { generateLessonFromDocumentWithRAG } from '../services/rag-lesson';
import { requireAuth } from './auth';
import { setSession } from '../stores/sessionStore';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// All document routes require authentication
router.use(requireAuth);

/**
 * Upload a document
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[Documents] Uploading ${file.originalname} for user ${userId}`);

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(
      file.buffer,
      file.originalname
    );

    // Extract text from PDF
    let extractedText = '';
    try {
      extractedText = await extractTextFromPdf(file.buffer);
    } catch (err) {
      console.warn('[Documents] Text extraction failed:', err);
    }

    // Get title from filename or body
    const title = req.body.title || file.originalname.replace(/\.[^/.]+$/, '');

    // Save to database
    const [document] = await db.insert(schema.documents).values({
      userId,
      title,
      originalFilename: file.originalname,
      cloudinaryUrl: cloudinaryResult.url,
      cloudinaryPublicId: cloudinaryResult.publicId,
      extractedText: extractedText.substring(0, 100000), // Limit text size
    }).returning();

    // Generate embeddings in background (don't partial await to speed up response)
    processDocumentEmbeddings(document.id).catch(err => {
      console.error('[Documents] Background embedding generation failed:', err);
    });

    res.json({
      id: document.id,
      title: document.title,
      filename: document.originalFilename,
      url: document.cloudinaryUrl,
      textLength: extractedText.length,
      createdAt: document.createdAt,
    });

  } catch (error) {
    console.error('[Documents] Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process document embeddings (manual trigger)
 */
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const documentId = req.params.id as string;

    const doc = await db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });

    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Trigger processing
    await processDocumentEmbeddings(documentId);

    res.json({ message: 'Document processed successfully' });

  } catch (error) {
    console.error('[Documents] Processing error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

/**
 * List user's documents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const docs = await db.query.documents.findMany({
      where: eq(schema.documents.userId, userId),
      orderBy: (documents, { desc }) => [desc(documents.createdAt)],
    });

    res.json(docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      filename: doc.originalFilename,
      url: doc.cloudinaryUrl,
      createdAt: doc.createdAt,
    })));

  } catch (error) {
    console.error('[Documents] List error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * Get a single document
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const documentId = req.params.id as string;

    const doc = await db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });

    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: doc.id,
      title: doc.title,
      filename: doc.originalFilename,
      url: doc.cloudinaryUrl,
      extractedText: doc.extractedText,
      createdAt: doc.createdAt,
    });

  } catch (error) {
    console.error('[Documents] Get error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

/**
 * Generate lesson from document
 */
router.post('/:id/lesson', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userEmail = (req as any).userEmail;
    const documentId = req.params.id as string;
    const { personalityTone = 'Hype Man' } = req.body;

    const doc = await db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });

    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!doc.extractedText) {
      return res.status(400).json({ error: 'Document has no extracted text' });
    }

    console.log(`[Documents] Generating lesson from "${doc.title}" for user ${userId}`);

    // Generate lesson using RAG (Retrieval Augmented Generation)
    const { lessonPlan } = await generateLessonFromDocumentWithRAG(doc.id, personalityTone);
    
    // Create session ID and store in memory (so LessonPage can access it)
    const sessionId = uuidv4();
    setSession(sessionId, {
      id: sessionId,
      email: userEmail,
      topic: doc.title,
      currentStage: 1,
      lessonPlan,
      personalityTone,
      createdAt: new Date(),
    });

    console.log(`[Documents] Lesson session created: ${sessionId}`);

    res.json({
      sessionId, // This is what the frontend needs
      documentId: doc.id,
      topic: doc.title,
      stages: lessonPlan.stages.length,
    });

  } catch (error) {
    console.error('[Documents] Lesson generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate lesson',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete a document
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const documentId = req.params.id as string;

    const doc = await db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });

    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(doc.cloudinaryPublicId);

    // Delete from database
    await db.delete(schema.documents).where(eq(schema.documents.id, documentId));

    res.json({ message: 'Document deleted' });

  } catch (error) {
    console.error('[Documents] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
