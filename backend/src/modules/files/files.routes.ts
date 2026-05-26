// Files routes - signed URL + stream download
// User upload chung không có ở MVP (chỉ contract DOCX/PDF được generate)

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { requireAuth, AuthedRequest } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { filesService } from './files.service';
import { prisma } from '@/lib/prisma';

export const filesRouter = Router();

/**
 * GET /api/files/:id/signed-url
 * Trả về signed URL có TTL để frontend redirect/fetch
 */
filesRouter.get(
  '/:id/signed-url',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');

    const file = await filesService.findById(id);
    if (!file) throw HttpError.notFound('File không tồn tại');

    // Lookup owner của contract liên quan (nếu có)
    let ownerId: number | null = null;
    if (file.contractId) {
      const c = await prisma.contract.findUnique({
        where: { id: file.contractId },
        select: { userId: true },
      });
      ownerId = c?.userId ?? null;
    }
    if (!filesService.canAccess(file, req.user!, ownerId)) {
      throw HttpError.forbidden('Không có quyền tải file này');
    }

    const { url } = await filesService.getSignedUrl(id, { download: true });
    res.json({
      success: true,
      url,
      file: {
        id: file.id,
        file_name: file.fileName,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
      },
    });
  })
);

/**
 * GET /api/files/:id/download
 * Stream file trực tiếp (backend proxy). Dùng khi không muốn expose signed URL.
 */
filesRouter.get(
  '/:id/download',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');

    const file = await filesService.findById(id);
    if (!file) throw HttpError.notFound('File không tồn tại');

    let ownerId: number | null = null;
    if (file.contractId) {
      const c = await prisma.contract.findUnique({
        where: { id: file.contractId },
        select: { userId: true },
      });
      ownerId = c?.userId ?? null;
    }
    if (!filesService.canAccess(file, req.user!, ownerId)) {
      throw HttpError.forbidden('Không có quyền tải file này');
    }

    const { buffer, contentType } = await filesService.streamContent(id);
    res.setHeader('Content-Type', contentType || file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(buffer);
  })
);
