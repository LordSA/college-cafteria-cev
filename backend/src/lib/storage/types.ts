export type StorageProviderType = 'supabase' | 'r2';

export interface UploadAuthParams {
  fileType: 'food_image' | 'profile_image';
  contentType: string;
  fileSize: number;
  userId: string;
  isAdmin: boolean;
}

export interface UploadAuthResult {
  upload_url: string;
  object_key: string;
  bucket: string;
  public_url: string | null;
  method: 'PUT' | 'POST';
  headers?: Record<string, string>;
  expires_in: number;
  provider: StorageProviderType;
}

export interface DisplayUrlParams {
  objectKey: string;
  fileType?: 'food_image' | 'profile_image';
  expiresIn?: number;
}

export interface ObjectMetadata {
  key: string;
  size: number;
  contentType?: string;
  lastModified?: string;
}

export interface IStorageProvider {
  readonly providerName: StorageProviderType;
  createUploadAuthorization(
    params: UploadAuthParams
  ): Promise<
    | { success: true; data: UploadAuthResult }
    | { success: false; code: string; message: string; statusCode: number }
  >;
  getDisplayUrl(params: DisplayUrlParams): Promise<string>;
  deleteObject(bucket: string, objectKey: string): Promise<boolean>;
  verifyObject(bucket: string, objectKey: string): Promise<ObjectMetadata | null>;
}
