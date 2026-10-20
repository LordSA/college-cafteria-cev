import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../types/env';

export interface PresignRequest {
  file_type: 'food_image' | 'profile_image';
  content_type: string;
  file_size: number;
}

export interface PresignResponse {
  upload_url: string;
  object_key: string;
  public_url: string;
  expires_in: number;
}

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

const MAX_FOOD_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

export function getR2Client(env: Env): S3Client | null {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME
  ) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export function getPublicImageUrl(objectKey: string, env: Env): string {
  if (!objectKey) return '';
  if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
    return objectKey;
  }
  const baseUrl = env.R2_PUBLIC_URL || 'https://images.cafteria.local';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanKey = objectKey.startsWith('/') ? objectKey.slice(1) : objectKey;
  return `${cleanBase}/${cleanKey}`;
}

export async function generatePresignedUploadUrl(
  params: PresignRequest,
  userId: string,
  isAdmin: boolean,
  env: Env
): Promise<{ success: true; data: PresignResponse } | { success: false; code: string; message: string; statusCode: number }> {
  if (params.file_type === 'food_image' && !isAdmin) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only canteen administrators can upload food catalog images',
      statusCode: 403,
    };
  }

  const extension = ALLOWED_MIME_TYPES.get(params.content_type.toLowerCase());
  if (!extension) {
    return {
      success: false,
      code: 'INVALID_MIME_TYPE',
      message: 'Unsupported image type. Allowed: image/jpeg, image/png, image/webp, image/avif',
      statusCode: 400,
    };
  }

  const maxSize = params.file_type === 'food_image' ? MAX_FOOD_IMAGE_SIZE : MAX_PROFILE_IMAGE_SIZE;
  if (params.file_size > maxSize) {
    return {
      success: false,
      code: 'FILE_TOO_LARGE',
      message: `File exceeds maximum permitted size of ${Math.round(maxSize / (1024 * 1024))}MB`,
      statusCode: 400,
    };
  }

  const randomId = crypto.randomUUID();
  const objectKey =
    params.file_type === 'food_image'
      ? `food/${randomId}.${extension}`
      : `profiles/${userId}/${randomId}.${extension}`;

  const client = getR2Client(env);

  if (!client || !env.R2_BUCKET_NAME) {
    const mockUploadUrl = `http://localhost:8787/api/v1/uploads/mock-sink?key=${encodeURIComponent(objectKey)}`;
    return {
      success: true,
      data: {
        upload_url: mockUploadUrl,
        object_key: objectKey,
        public_url: getPublicImageUrl(objectKey, env),
        expires_in: 300,
      },
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: params.content_type,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return {
      success: true,
      data: {
        upload_url: uploadUrl,
        object_key: objectKey,
        public_url: getPublicImageUrl(objectKey, env),
        expires_in: 300,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      code: 'PRESIGN_FAILED',
      message: err.message || 'Failed to generate presigned upload URL',
      statusCode: 500,
    };
  }
}
