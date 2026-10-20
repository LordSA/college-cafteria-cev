import type { Env } from '../../types/env';
import type {
  IStorageProvider,
  StorageProviderType,
} from './types';
import { SupabaseStorageProvider } from './supabaseProvider';
import { R2StorageProvider } from './r2Provider';

export * from './types';
export { SupabaseStorageProvider } from './supabaseProvider';
export { R2StorageProvider } from './r2Provider';

export function getStorageProvider(env?: Env): IStorageProvider {
  const provider = (env?.STORAGE_PROVIDER || 'supabase').toLowerCase() as StorageProviderType;

  if (provider === 'supabase') {
    return new SupabaseStorageProvider(env);
  }

  if (provider === 'r2') {
    const r2 = new R2StorageProvider(env);
    r2.assertConfigured();
    return r2;
  }

  throw new Error(`Unsupported storage provider: "${provider}". Expected "supabase" or "r2"`);
}

export function getPublicImageUrl(objectKey: string, env?: Env): string {
  if (!objectKey) return '';
  if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
    return objectKey;
  }

  const provider = (env?.STORAGE_PROVIDER || 'supabase').toLowerCase();
  const cleanKey = objectKey.startsWith('/') ? objectKey.slice(1) : objectKey;

  if (provider === 'r2') {
    const baseUrl = env?.R2_PUBLIC_URL || 'https://images.cafteria.local';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/${cleanKey}`;
  }

  const baseUrl = env?.SUPABASE_URL || 'https://images.cafteria.local';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}/storage/v1/object/public/food-images/${cleanKey}`;
}

export async function generatePresignedUploadUrl(
  params: {
    file_type: 'food_image' | 'profile_image';
    content_type: string;
    file_size: number;
  },
  userId: string,
  isAdmin: boolean,
  env?: Env
): Promise<
  | {
      success: true;
      data: {
        upload_url: string;
        object_key: string;
        public_url: string | null;
        bucket: string;
        provider: StorageProviderType;
        expires_in: number;
        method: 'PUT' | 'POST';
        headers?: Record<string, string>;
      };
    }
  | { success: false; code: string; message: string; statusCode: number }
> {
  try {
    const provider = getStorageProvider(env);
    const result = await provider.createUploadAuthorization({
      fileType: params.file_type,
      contentType: params.content_type,
      fileSize: params.file_size,
      userId,
      isAdmin,
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        upload_url: result.data.upload_url,
        object_key: result.data.object_key,
        public_url: result.data.public_url,
        bucket: result.data.bucket,
        provider: result.data.provider,
        expires_in: result.data.expires_in,
        method: result.data.method,
        headers: result.data.headers,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      code: 'CONFIG_ERROR',
      message: err.message || 'Storage configuration error',
      statusCode: 500,
    };
  }
}
