import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../../types/env';
import type {
  IStorageProvider,
  UploadAuthParams,
  UploadAuthResult,
  DisplayUrlParams,
  ObjectMetadata,
} from './types';

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

const MAX_FOOD_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

export class R2StorageProvider implements IStorageProvider {
  readonly providerName = 'r2' as const;
  private env?: Env;
  private client: S3Client | null = null;

  constructor(env?: Env) {
    this.env = env;
    if (
      env?.R2_ACCOUNT_ID &&
      env?.R2_ACCESS_KEY_ID &&
      env?.R2_SECRET_ACCESS_KEY &&
      env?.R2_BUCKET_NAME
    ) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  assertConfigured(): void {
    if (
      !this.env?.R2_ACCOUNT_ID ||
      !this.env?.R2_ACCESS_KEY_ID ||
      !this.env?.R2_SECRET_ACCESS_KEY ||
      !this.env?.R2_BUCKET_NAME
    ) {
      throw new Error(
        'Cloudflare R2 storage provider is missing required credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)'
      );
    }
  }

  async createUploadAuthorization(
    params: UploadAuthParams
  ): Promise<
    | { success: true; data: UploadAuthResult }
    | { success: false; code: string; message: string; statusCode: number }
  > {
    if (params.fileType === 'food_image' && !params.isAdmin) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'Only canteen administrators can upload food catalog images',
        statusCode: 403,
      };
    }

    if (params.fileType === 'profile_image' && !params.userId) {
      return {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'User authentication required for profile avatar uploads',
        statusCode: 401,
      };
    }

    const extension = ALLOWED_MIME_TYPES.get(params.contentType.toLowerCase());
    if (!extension) {
      return {
        success: false,
        code: 'INVALID_MIME_TYPE',
        message: 'Unsupported image type. Allowed: image/jpeg, image/png, image/webp, image/avif',
        statusCode: 400,
      };
    }

    const maxSize =
      params.fileType === 'food_image' ? MAX_FOOD_IMAGE_SIZE : MAX_PROFILE_IMAGE_SIZE;
    if (params.fileSize > maxSize) {
      return {
        success: false,
        code: 'FILE_TOO_LARGE',
        message: `File exceeds maximum permitted size of ${Math.round(maxSize / (1024 * 1024))}MB`,
        statusCode: 400,
      };
    }

    const randomId = crypto.randomUUID();
    const objectKey =
      params.fileType === 'food_image'
        ? `food/${randomId}.${extension}`
        : `profiles/${params.userId}/${randomId}.${extension}`;

    const bucket = this.env?.R2_BUCKET_NAME || 'cafteria-assets';

    if (!this.client || !this.env?.R2_BUCKET_NAME) {
      const mockUploadUrl = `http://localhost:8787/api/v1/uploads/mock-sink?key=${encodeURIComponent(
        objectKey
      )}&bucket=${bucket}`;
      return {
        success: true,
        data: {
          upload_url: mockUploadUrl,
          object_key: objectKey,
          bucket,
          public_url: await this.getDisplayUrl({ objectKey, fileType: params.fileType }),
          method: 'PUT',
          expires_in: 300,
          provider: 'r2',
        },
      };
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: params.contentType,
      });

      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });

      return {
        success: true,
        data: {
          upload_url: uploadUrl,
          object_key: objectKey,
          bucket,
          public_url: await this.getDisplayUrl({ objectKey, fileType: params.fileType }),
          method: 'PUT',
          headers: {
            'Content-Type': params.contentType,
          },
          expires_in: 300,
          provider: 'r2',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'PRESIGN_FAILED',
        message: err.message || 'Failed to generate R2 presigned upload URL',
        statusCode: 500,
      };
    }
  }

  async getDisplayUrl(params: DisplayUrlParams): Promise<string> {
    if (!params.objectKey) return '';
    if (params.objectKey.startsWith('http://') || params.objectKey.startsWith('https://')) {
      return params.objectKey;
    }
    const baseUrl = this.env?.R2_PUBLIC_URL || 'https://images.cafteria.local';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanKey = params.objectKey.startsWith('/') ? params.objectKey.slice(1) : params.objectKey;
    return `${cleanBase}/${cleanKey}`;
  }

  async deleteObject(bucket: string, objectKey: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async verifyObject(bucket: string, objectKey: string): Promise<ObjectMetadata | null> {
    if (!this.client) return null;
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      });
      const response = await this.client.send(command);
      return {
        key: objectKey,
        size: response.ContentLength || 0,
        contentType: response.ContentType,
        lastModified: response.LastModified?.toISOString(),
      };
    } catch {
      return null;
    }
  }
}
