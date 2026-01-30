import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Validate configuration
if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.error('[Cloudinary] Missing configuration:', {
    hasCloudName: !!cloudinaryConfig.cloud_name,
    hasApiKey: !!cloudinaryConfig.api_key,
    hasApiSecret: !!cloudinaryConfig.api_secret,
  });
}

cloudinary.config(cloudinaryConfig);

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

/**
 * Upload a file buffer to Cloudinary
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = 'kira-documents'
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw', // For PDFs and documents
        public_id: `${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}`,
        format: filename.split('.').pop() || 'pdf',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        } else {
          reject(new Error('No result from Cloudinary'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

/**
 * Get a signed URL for private access (if needed)
 */
export function getSignedUrl(publicId: string, expiresInSeconds: number = 3600): string {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    sign_url: true,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}
