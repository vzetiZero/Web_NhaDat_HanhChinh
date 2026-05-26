// Contracts routes - CRUD + render + list files

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { validate } from '@/middleware/validate';
import { requireAuth, AuthedRequest } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { prisma } from '@/lib/prisma';
import { filesService } from '@/modules/files/files.service';
import {
  createContractSchema,
  updateContractSchema,
  listContractsQuerySchema,
} from './contracts.schemas';
import { contractsService } from './contracts.service';

export const contractsRouter = Router();

contractsRouter.get(
  '/',
  requireAuth,
  validate(listContractsQuerySchema, 'query'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = await contractsService.listByUser(req.user!.userId, req.query as never);
    res.json({ success: true, ...data });
  })
);

contractsRouter.post(
  '/',
  requireAuth,
  validate(createContractSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const contract = await contractsService.create(req.user!.userId, req.body);
    res.json({ success: true, contract });
  })
);

contractsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const contract = await contractsService.findById(id, req.user!.userId, req.user!.isAdmin);
    res.json({ success: true, contract });
  })
);

contractsRouter.patch(
  '/:id',
  requireAuth,
  validate(updateContractSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const contract = await contractsService.update(id, req.user!.userId, req.body);
    res.json({ success: true, contract });
  })
);

contractsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await contractsService.delete(id, req.user!.userId);
    res.json({ success: true, message: 'Đã xóa hợp đồng' });
  })
);

/**
 * POST /api/contracts/:id/generate
 * Render DOCX + PDF, lưu lên Supabase, trả về fileIds + signed URLs
 */
contractsRouter.post(
  '/:id/generate',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const result = await contractsService.render(id, req.user!.userId, req.user!.isAdmin);

    // Tạo luôn signed URLs cho frontend tải về
    const docxUrl = await filesService.getSignedUrl(result.docxFileId, { download: true });
    const pdfUrl = result.pdfFileId ? await filesService.getSignedUrl(result.pdfFileId, { download: true }) : null;

    res.json({
      success: true,
      contract: result.contract,
      pdfMethod: result.pdfMethod,
      download: {
        docx: { fileId: result.docxFileId, url: docxUrl.url },
        pdf: result.pdfFileId && pdfUrl
          ? { fileId: result.pdfFileId, url: pdfUrl.url }
          : null,
      },
    });
  })
);

/**
 * GET /api/contracts/:id/files
 * List tất cả file đã render cho contract
 */
contractsRouter.get(
  '/:id/files',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const contract = await contractsService.findById(id, req.user!.userId, req.user!.isAdmin);
    const files = await prisma.generatedFile.findMany({
      where: { contractId: contract.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, items: files });
  })
);
