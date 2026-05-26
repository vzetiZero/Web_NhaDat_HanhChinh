// Storage service - wrap Supabase Storage
// Mọi I/O file đi qua đây, không gọi trực tiếp supabase.storage từ controller/service khác

import { getSupabase } from '@/lib/supabase';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { HttpError } from '@/lib/http-error';

export type Bucket = string;

export interface UploadOptions {
  bucket: Bucket;
  key: string;
  body: Buffer | Uint8Array | ArrayBuffer | Blob;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  size: number;
}

class StorageService {
  /**
   * Upload buffer/Blob lên Supabase Storage
   */
  async upload(opts: UploadOptions): Promise<{ bucket: Bucket; key: string }> {
    const supabase = getSupabase();
    const { bucket, key, body, contentType, upsert = false, cacheControl } = opts;

    // Supabase JS SDK chấp nhận Blob, ArrayBuffer, File. Convert Buffer → Uint8Array để chắc ăn.
    let payload: Uint8Array | ArrayBuffer | Blob;
    if (body instanceof Buffer) payload = new Uint8Array(body);
    else if (body instanceof ArrayBuffer) payload = body;
    else if (body instanceof Uint8Array) payload = body;
    else payload = body;

    const { error } = await supabase.storage.from(bucket).upload(key, payload, {
      contentType,
      upsert,
      cacheControl: cacheControl || '3600',
    });

    if (error) {
      logger.error('[storage] upload failed', { bucket, key, message: error.message });
      throw HttpError.internal(`Upload thất bại: ${error.message}`);
    }
    return { bucket, key };
  }

  /**
   * Download file thành Buffer
   */
  async download(bucket: Bucket, key: string): Promise<DownloadResult> {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(bucket).download(key);
    if (error || !data) {
      throw HttpError.notFound(`Không tìm thấy file: ${bucket}/${key}`);
    }
    const arrayBuf = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      contentType: data.type,
      size: arrayBuf.byteLength,
    };
  }

  /**
   * Tạo signed URL có TTL - cho user tải file mà không expose service role
   * download=true → ép browser tải file thay vì preview
   */
  async createSignedUrl(
    bucket: Bucket,
    key: string,
    ttlSeconds: number = env.SUPABASE_SIGNED_URL_TTL,
    options?: { download?: string | boolean }
  ): Promise<string> {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, ttlSeconds, options?.download ? { download: options.download } : undefined);

    if (error || !data?.signedUrl) {
      logger.error('[storage] createSignedUrl failed', { bucket, key, message: error?.message });
      throw HttpError.internal(`Không tạo được signed URL: ${error?.message || 'unknown'}`);
    }
    return data.signedUrl;
  }

  async delete(bucket: Bucket, keys: string | string[]): Promise<void> {
    const supabase = getSupabase();
    const list = Array.isArray(keys) ? keys : [keys];
    const { error } = await supabase.storage.from(bucket).remove(list);
    if (error) {
      logger.warn('[storage] delete failed', { bucket, keys: list, message: error.message });
      // Không throw - delete failure thường không critical
    }
  }

  async exists(bucket: Bucket, key: string): Promise<boolean> {
    const supabase = getSupabase();
    // Supabase không có HEAD trực tiếp - dùng list với prefix
    const parts = key.split('/');
    const fileName = parts.pop()!;
    const prefix = parts.join('/');
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      search: fileName,
      limit: 1,
    });
    if (error) return false;
    return Array.isArray(data) && data.some((item) => item.name === fileName);
  }

  /**
   * Bảo đảm bucket tồn tại (idempotent). Gọi 1 lần khi boot.
   * Trả về true nếu tạo mới, false nếu đã có.
   */
  async ensureBucket(name: Bucket, isPublic = false): Promise<boolean> {
    const supabase = getSupabase();
    const { data: existing } = await supabase.storage.getBucket(name);
    if (existing) return false;

    const { error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    });
    if (error) {
      // Race condition: bucket có thể được tạo bởi instance khác giữa check và create
      if (error.message?.toLowerCase().includes('already exists')) return false;
      logger.error('[storage] ensureBucket failed', { name, message: error.message });
      throw HttpError.internal(`Không tạo được bucket ${name}: ${error.message}`);
    }
    logger.info(`[storage] Created bucket "${name}"`);
    return true;
  }

  /**
   * Sanitize filename trước khi dùng làm storage key
   * Chỉ giữ alphanumeric, dấu chấm, dash, underscore. Convert dấu tiếng Việt → ASCII.
   */
  sanitizeFilename(name: string): string {
    if (!name) return 'unnamed';
    const noDiacritics = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd');
    return noDiacritics
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[._-]+/, '')
      .slice(0, 120) || 'unnamed';
  }

  /**
   * Build storage key chuẩn cho từng loại file
   */
  keys = {
    contractDocx: (contractId: number, filename = 'contract.docx') =>
      `contracts/${contractId}/generated/${filename}`,
    contractPdf: (contractId: number, filename = 'contract.pdf') =>
      `contracts/${contractId}/generated/${filename}`,
    contractHtml: (contractId: number, filename = 'contract.html') =>
      `contracts/${contractId}/generated/${filename}`,
    template: (templateId: number, filename = 'template.docx') =>
      `templates/${templateId}/${filename}`,
    userUpload: (userId: number, filename: string) =>
      `uploads/${userId}/${Date.now()}-${this.sanitizeFilename(filename)}`,
  };
}

export const storage = new StorageService();
