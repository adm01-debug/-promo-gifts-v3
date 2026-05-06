// supabase/functions/_shared/validate-upload.ts
/**
 * Utilities for validating file uploads in edge functions.
 * Includes magic bytes validation for common file types.
 */

export const ALLOWED_MIME_TYPES = {
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_GIF: 'image/gif',
  IMAGE_WEBP: 'image/webp',
  APPLICATION_PDF: 'application/pdf',
};

export const MAGIC_BYTES = {
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  GIF87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  GIF89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  PDF: [0x25, 0x50, 0x44, 0x46, 0x2D],
  WEBP: [0x52, 0x49, 0x46, 0x46], // Followed by file size, then 'WEBP'
};

/**
 * Validates file buffer against magic bytes.
 */
export async function validateMagicBytes(
  buffer: Uint8Array,
  expectedMimeType: string
): Promise<boolean> {
  const check = (bytes: number[]) => {
    for (let i = 0; i < bytes.length; i++) {
      if (buffer[i] !== bytes[i]) return false;
    }
    return true;
  };

  switch (expectedMimeType) {
    case ALLOWED_MIME_TYPES.IMAGE_JPEG:
      return check(MAGIC_BYTES.JPEG);
    case ALLOWED_MIME_TYPES.IMAGE_PNG:
      return check(MAGIC_BYTES.PNG);
    case ALLOWED_MIME_TYPES.IMAGE_GIF:
      return check(MAGIC_BYTES.GIF87a) || check(MAGIC_BYTES.GIF89a);
    case ALLOWED_MIME_TYPES.APPLICATION_PDF:
      return check(MAGIC_BYTES.PDF);
    case ALLOWED_MIME_TYPES.IMAGE_WEBP:
      // WEBP starts with RIFF, then 4 bytes of size, then WEBP
      if (!check(MAGIC_BYTES.WEBP)) return false;
      const webpHeader = new TextDecoder().decode(buffer.slice(8, 12));
      return webpHeader === 'WEBP';
    default:
      return false;
  }
}

/**
 * Convenience function to validate an uploaded file (Blob/File).
 */
export async function validateUpload(
  file: Blob,
  allowedMimeTypes: string[] = Object.values(ALLOWED_MIME_TYPES)
): Promise<{ valid: boolean; error?: string }> {
  if (!allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: `Invalid MIME type: ${file.type}` };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const isValidMagic = await validateMagicBytes(buffer, file.type);

  if (!isValidMagic) {
    return { valid: false, error: 'File content does not match its extension (magic bytes mismatch)' };
  }

  return { valid: true };
}
