// Use require for CommonJS module (pdf-parse 1.1.1)
const pdf = require('pdf-parse');

/**
 * Extract text from a PDF buffer
 */
/**
 * Sanitize text by removing null bytes and other problematic characters
 * PostgreSQL UTF-8 encoding doesn't accept null bytes (0x00)
 */
function sanitizeText(text: string): string {
  // Remove null bytes (0x00) which PostgreSQL doesn't accept
  // Also remove other control characters except newlines and tabs
  return text
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove other control chars (keep \t, \n, \r)
    .trim();
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return sanitizeText(data.text);
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
