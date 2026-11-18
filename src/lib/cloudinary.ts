export const CLOUDINARY_CONFIG = {
  cloudName: 'fgxdx2hq',
  uploadPreset: 'tomoyo',
  assetFolder: 'tomoyo/gambar',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
} as const;

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  originalFilename?: string;
}

export function validateImageFileForCloudinary(file: File): string | null {
  if (
    !CLOUDINARY_CONFIG.allowedMimeTypes.includes(
      file.type as (typeof CLOUDINARY_CONFIG.allowedMimeTypes)[number]
    )
  ) {
    return 'Format file tidak didukung. Gunakan gambar JPG, PNG, atau WebP.';
  }
  if (file.size <= 0) {
    return 'File gambar kosong.';
  }
  if (file.size > CLOUDINARY_CONFIG.maxFileSizeBytes) {
    return 'Ukuran gambar maksimal 5 MB.';
  }
  return null;
}

export async function uploadImageToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const validationError = validateImageFileForCloudinary(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  let data: Record<string, unknown> | null = null;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error('Respons Cloudinary tidak valid.');
  }

  if (!response.ok || !data || typeof data.secure_url !== 'string') {
    const errMessage =
      data &&
      typeof data.error === 'object' &&
      data.error !== null &&
      'message' in data.error &&
      typeof (data.error as { message?: unknown }).message === 'string'
        ? (data.error as { message: string }).message
        : `Upload ke Cloudinary gagal (HTTP ${response.status}).`;
    throw new Error(errMessage);
  }

  return {
    secureUrl: data.secure_url,
    publicId: typeof data.public_id === 'string' ? data.public_id : '',
    originalFilename:
      typeof data.original_filename === 'string' ? data.original_filename : undefined,
  };
}
