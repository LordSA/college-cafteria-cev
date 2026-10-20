import type { Env } from '../../types/env';
import type {
  IStorageProvider,
  UploadAuthParams,
  UploadAuthResult,
  DisplayUrlParams,
  ObjectMetadata,
} from './types';
import { getSupabaseAdminClient } from '../supabase';

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

const MAX_FOOD_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

export class SupabaseStorageProvider implements IStorageProvider {
  readonly providerName = 'supabase' as const;
  private env?: Env;

  constructor(env?: Env) {
    this.env = env;
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

    const bucket = params.fileType === 'food_image' ? 'food-images' : 'profile-images';
    const randomId = crypto.randomUUID();
    const objectKey =
      params.fileType === 'food_image'
        ? `food/${randomId}.${extension}`
        : `profiles/${params.userId}/${randomId}.${extension}`;

    const adminClient = getSupabaseAdminClient(this.env);

    if (!adminClient) {
      const mockUploadUrl = `http://localhost:8787/api/v1/uploads/mock-sink?key=${encodeURIComponent(
        objectKey
      )}&bucket=${bucket}`;
      const baseUrl = this.env?.SUPABASE_URL || 'https://images.cafteria.local';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const mockPublicUrl =
        params.fileType === 'food_image'
          ? `${cleanBase}/storage/v1/object/public/food-images/${objectKey}`
          : null;

      return {
        success: true,
        data: {
          upload_url: mockUploadUrl,
          object_key: objectKey,
          bucket,
          public_url: mockPublicUrl,
          method: 'PUT',
          expires_in: 300,
          provider: 'supabase',
        },
      };
    }

    try {
      const { data: signedUploadData, error: presignError } = await adminClient.storage
        .from(bucket)
        .createSignedUploadUrl(objectKey);

      if (presignError || !signedUploadData) {
        const mockFallback = `http://localhost:8787/api/v1/uploads/mock-sink?key=${encodeURIComponent(
          objectKey
        )}&bucket=${bucket}`;
        const baseUrl = this.env?.SUPABASE_URL || 'https://images.cafteria.local';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const publicUrl =
          params.fileType === 'food_image'
            ? `${cleanBase}/storage/v1/object/public/food-images/${objectKey}`
            : null;

        return {
          success: true,
          data: {
            upload_url: mockFallback,
            object_key: objectKey,
            bucket,
            public_url: publicUrl,
            method: 'PUT',
            expires_in: 300,
            provider: 'supabase',
          },
        };
      }

      let publicUrl: string | null = null;
      if (params.fileType === 'food_image') {
        const { data: publicData } = adminClient.storage.from(bucket).getPublicUrl(objectKey);
        publicUrl = publicData.publicUrl;
      }

      return {
        success: true,
        data: {
          upload_url: signedUploadData.signedUrl,
          object_key: objectKey,
          bucket,
          public_url: publicUrl,
          method: 'PUT',
          headers: {
            'Content-Type': params.contentType,
          },
          expires_in: 300,
          provider: 'supabase',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'PRESIGN_FAILED',
        message: err.message || 'Failed to generate Supabase signed upload URL',
        statusCode: 500,
      };
    }
  }

  async getDisplayUrl(params: DisplayUrlParams): Promise<string> {
    if (!params.objectKey) return '';
    if (params.objectKey.startsWith('http://') || params.objectKey.startsWith('https://')) {
      return params.objectKey;
    }

    const isProfile =
      params.fileType === 'profile_image' || params.objectKey.startsWith('profiles/');
    const bucket = isProfile ? 'profile-images' : 'food-images';
    const adminClient = getSupabaseAdminClient(this.env);

    if (isProfile) {
      if (adminClient) {
        try {
          const { data, error } = await adminClient.storage
            .from(bucket)
            .createSignedUrl(params.objectKey, params.expiresIn || 3600);
          if (!error && data?.signedUrl) {
            return data.signedUrl;
          }
        } catch {}
      }
      const baseUrl = this.env?.SUPABASE_URL || 'https://images.cafteria.local';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${cleanBase}/storage/v1/object/authenticated/${bucket}/${params.objectKey}`;
    }

    if (adminClient) {
      try {
        const { data } = adminClient.storage.from(bucket).getPublicUrl(params.objectKey);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      } catch {}
    }

    const baseUrl = this.env?.SUPABASE_URL || 'https://images.cafteria.local';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/storage/v1/object/public/${bucket}/${params.objectKey}`;
  }

  async deleteObject(bucket: string, objectKey: string): Promise<boolean> {
    const adminClient = getSupabaseAdminClient(this.env);
    if (!adminClient) return false;

    try {
      const { error } = await adminClient.storage.from(bucket).remove([objectKey]);
      return !error;
    } catch {
      return false;
    }
  }

  async verifyObject(bucket: string, objectKey: string): Promise<ObjectMetadata | null> {
    const adminClient = getSupabaseAdminClient(this.env);
    if (!adminClient) return null;

    try {
      const slashIndex = objectKey.lastIndexOf('/');
      const folder = slashIndex !== -1 ? objectKey.substring(0, slashIndex) : '';
      const fileName = slashIndex !== -1 ? objectKey.substring(slashIndex + 1) : objectKey;

      const { data, error } = await adminClient.storage.from(bucket).list(folder, {
        search: fileName,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const found = data.find((item) => item.name === fileName);
      if (!found) return null;

      return {
        key: objectKey,
        size: (found.metadata as any)?.size || 0,
        contentType: (found.metadata as any)?.mimetype,
        lastModified: found.updated_at || found.created_at || undefined,
      };
    } catch {
      return null;
    }
  }
}
