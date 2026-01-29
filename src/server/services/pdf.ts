// Use require for CommonJS module (pdf-parse 1.1.1)
const pdf = require('pdf-parse');

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Get PDF metadata
 */
export async function getPdfMetadata(buffer: Buffer): Promise<{
  numPages: number;
  info: Record<string, unknown>;
}> {
  const data = await pdf(buffer);
  return {
    numPages: data.numpages,
    info: data.info,
  };
}
