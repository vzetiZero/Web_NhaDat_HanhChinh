// Files service - quản lý generated files
// DB lưu metadata; Supabase Storage lưu binary

import { Prisma, FileKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { storage, Bucket } from '@/services/storage.service';
import { env } from '@/config/env';
import { HttpError } from '@/lib/http-error';

export interface RegisterFileInput {
  kind: FileKind;
  bucket: Bucket;
  key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdById?: number | null;
  contractId?: number | null;
  metadata?: Prisma.InputJsonValue;
}

class FilesService {
  /**
   * Upload buffer lên storage + lưu metadata vào DB
   */
  async uploadAndRegister(
    body: Buffer,
    input: Omit<RegisterFileInput, 'sizeBytes'> & { upsert?: boolean }
  ) {
    await storage.upload({
      bucket: input.bucket,
      key: input.key,
      body,
      contentType: input.mimeType,
      upsert: input.upsert ?? false,
    });
    return prisma.generatedFile.create({
      data: {
        kind: input.kind,
        storageBucket: input.bucket,
        storageKey: input.key,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: body.byteLength,
        createdById: input.createdById ?? null,
        contractId: input.contractId ?? null,
        metadata: input.metadata,
      },
    });
  }

  async findById(id: number) {
    return prisma.generatedFile.findUnique({ where: { id } });
  }

  async getSignedUrl(fileId: number, opts?: { download?: boolean }) {
    const file = await this.findById(fileId);
    if (!file) throw HttpError.notFound('File không tồn tại');
    const url = await storage.createSignedUrl(
      file.storageBucket,
      file.storageKey,
      env.SUPABASE_SIGNED_URL_TTL,
      opts?.download ? { download: file.fileName } : undefined
    );
    return { url, file };
  }

  /**
   * Stream file content cho controller (cho trường hợp muốn ép tải qua backend
   * thay vì redirect signed URL, dùng cho file < 50MB)
   */
  async streamContent(fileId: number) {
    const file = await this.findById(fileId);
    if (!file) throw HttpError.notFound('File không tồn tại');
    const dl = await storage.download(file.storageBucket, file.storageKey);
    return { file, ...dl };
  }

  async delete(fileId: number) {
    const file = await this.findById(fileId);
    if (!file) return;
    await storage.delete(file.storageBucket, file.storageKey);
    await prisma.generatedFile.delete({ where: { id: fileId } });
  }

  /**
   * User chỉ xem được file của họ; admin xem tất.
   * Trả về true nếu user có quyền truy cập file.
   */
  canAccess(file: { createdById: number | null; contractId: number | null }, user: { userId: number; isAdmin: boolean }, contractOwnerId?: number | null): boolean {
    if (user.isAdmin) return true;
    if (file.createdById === user.userId) return true;
    if (contractOwnerId === user.userId) return true;
    return false;
  }
}

export const filesService = new FilesService();
