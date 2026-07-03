import { api } from '../services/api';

export type LocalUploadFile = {
  uri: string;
  name: string;
  type?: string;
  size?: number;
};

/**
 * Infer MIME type from file extension or default based on upload type
 */
function inferMimeType(file: LocalUploadFile, uploadType: 'image' | 'document'): string {
  const fileName = file.name?.toLowerCase() || '';
  
  // Image types
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  if (fileName.endsWith('.heic')) return 'image/heic';
  if (fileName.endsWith('.gif')) return 'image/gif';
  
  // Document types
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.doc')) return 'application/msword';
  if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  // Fallback
  return uploadType === 'image' ? 'image/jpeg' : 'application/pdf';
}

/**
 * Check if file is a supported image format
 */
function isSupportedImageFile(file: LocalUploadFile): boolean {
  const fileName = file.name?.toLowerCase() || '';
  return fileName.endsWith('.jpg') || 
         fileName.endsWith('.jpeg') || 
         fileName.endsWith('.png') || 
         fileName.endsWith('.webp') || 
         fileName.endsWith('.heic');
}

/**
 * Upload a single file to the backend storage
 * @param file - The local file to upload
 * @param uploadType - Type of upload ('image' or 'document')
 * @returns The public URL of the uploaded file
 */
export async function uploadSingleFile(
  file: LocalUploadFile, 
  uploadType: 'image' | 'document'
): Promise<string> {
  // Validate image format
  if (uploadType === 'image' && !isSupportedImageFile(file)) {
    throw new Error('Unsupported image format. Please use JPG, PNG, WEBP, or HEIC.');
  }

  const fileName = file.name || `upload.${uploadType === 'image' ? 'jpg' : 'pdf'}`;
  const fileType = inferMimeType(file, uploadType);

  // Fetch the local file as a blob
  const localFileResponse = await fetch(file.uri);
  const localFileBlob = await localFileResponse.blob();
  const fileSize = typeof file.size === 'number' && file.size > 0 ? file.size : localFileBlob.size;

  if (!fileSize || fileSize < 1) {
    throw new Error('Selected file appears empty. Please choose another file.');
  }

  // Request presigned upload URL from backend
  const uploadMeta = await api.post('/files/upload-url', {
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize,
    upload_type: uploadType,
  }) as { upload_url: string; public_url: string };

  // Upload file to storage (R2/S3)
  const uploadResponse = await fetch(uploadMeta.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': fileType },
    body: localFileBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error('Unable to upload file to storage.');
  }

  // Confirm upload with backend
  await api.post('/files/confirm-upload', { file_url: uploadMeta.public_url });
  
  return uploadMeta.public_url;
}

/**
 * Convert an image picker result to LocalUploadFile format
 */
export function imagePickerAssetToFile(asset: {
  uri: string;
  fileName?: string | null;
  type?: string;
  fileSize?: number;
}): LocalUploadFile {
  return {
    uri: asset.uri,
    name: asset.fileName || `photo_${Date.now()}.jpg`,
    type: asset.type,
    size: asset.fileSize,
  };
}
