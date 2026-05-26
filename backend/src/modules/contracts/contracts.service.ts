// Contracts service - CRUD + orchestrate render

import { ContractStatus, FileKind, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { filesService } from '@/modules/files/files.service';
import { templatesService } from '@/modules/templates/templates.service';
import { docxService, prepareContractData } from '@/services/docx.service';
import { pdfService } from '@/services/pdf.service';
import { generateContractHtml } from '@/services/html.service';
import { generateContractNumber, slugify } from '@/utils/format';
import { storage } from '@/services/storage.service';
import { CreateContractInput, UpdateContractInput } from './contracts.schemas';

const CONTRACT_PREFIX = 'HĐTCTSGLĐ';

class ContractsService {
  async listByUser(userId: number, opts: { page: number; limit: number; status?: ContractStatus }) {
    const where: Prisma.ContractWhereInput = { userId };
    if (opts.status) where.status = opts.status;

    const [total, items] = await prisma.$transaction([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: {
          docxFile: { select: { id: true, fileName: true } },
          pdfFile: { select: { id: true, fileName: true } },
        },
      }),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async listAll(opts: { page: number; limit: number; status?: ContractStatus; search?: string }) {
    const where: Prisma.ContractWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.search) {
      where.OR = [
        { contractNumber: { contains: opts.search, mode: 'insensitive' } },
        { user: { email: { contains: opts.search, mode: 'insensitive' } } },
        { user: { fullName: { contains: opts.search, mode: 'insensitive' } } },
      ];
    }
    const [total, items] = await prisma.$transaction([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          docxFile: { select: { id: true, fileName: true } },
          pdfFile: { select: { id: true, fileName: true } },
        },
      }),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async findById(id: number, userId?: number, isAdmin = false) {
    const c = await prisma.contract.findUnique({
      where: { id },
      include: {
        template: true,
        docxFile: true,
        pdfFile: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!c) throw HttpError.notFound('Không tìm thấy hợp đồng');
    if (!isAdmin && c.userId !== userId) {
      throw HttpError.forbidden('Không có quyền xem hợp đồng này');
    }
    return c;
  }

  async create(userId: number, input: CreateContractInput) {
    const template = await prisma.contractTemplate.findUnique({ where: { code: input.template_code } });
    if (!template) {
      throw HttpError.notFound(`Không tìm thấy template "${input.template_code}". Admin cần upload template trước.`);
    }

    // Sinh contract number cho năm hiện tại
    const year = new Date().getFullYear();
    const count = await prisma.contract.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const contractNumber = generateContractNumber(CONTRACT_PREFIX, count + 1, year);

    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        userId,
        templateId: template.id,
        formData: input.form_data as Prisma.InputJsonValue,
        status: input.draft ? 'draft' : 'rendered',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        event: 'contract_created',
        targetType: 'contract',
        targetId: contract.id,
        detail: { contractNumber },
      },
    });

    return contract;
  }

  async update(id: number, userId: number, input: UpdateContractInput) {
    const c = await this.findById(id, userId);
    if (c.status !== 'draft') {
      throw HttpError.badRequest('Hợp đồng đã được xuất file, không thể chỉnh sửa');
    }
    return prisma.contract.update({
      where: { id },
      data: { formData: input.form_data as Prisma.InputJsonValue },
    });
  }

  async delete(id: number, userId: number) {
    const c = await this.findById(id, userId);
    if (c.status !== 'draft') {
      throw HttpError.badRequest('Chỉ có thể xóa hợp đồng ở trạng thái nháp');
    }
    // Xóa các generated files liên quan (nếu có) - cascade qua DB foreign key
    await prisma.contract.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        event: 'contract_deleted',
        targetType: 'contract',
        targetId: id,
      },
    });
  }

  /**
   * Render DOCX + PDF, upload lên Supabase, lưu metadata
   */
  async render(id: number, userId: number, isAdmin = false) {
    const contract = await this.findById(id, userId, isAdmin);

    const prepared = prepareContractData(
      contract.formData as Parameters<typeof prepareContractData>[0],
      contract.contractNumber
    );

    // 1. DOCX
    const docxBuffer = await docxService.render(contract.templateId, prepared);
    const docxFile = await filesService.uploadAndRegister(docxBuffer, {
      kind: FileKind.contract_docx,
      bucket: env.SUPABASE_STORAGE_BUCKET,
      key: storage.keys.contractDocx(contract.id, `${slugify(contract.contractNumber)}.docx`),
      fileName: `ho-so-${slugify(contract.contractNumber)}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      createdById: userId,
      contractId: contract.id,
      upsert: true,
    });

    // 2. PDF (best-effort - nếu Puppeteer fail thì lưu HTML fallback)
    const html = generateContractHtml(prepared, contract.contractNumber);
    let pdfFileId: number | null = null;
    let pdfMethod: 'pdf' | 'html_fallback' = 'pdf';
    try {
      const pdfBuffer = await pdfService.renderFromHtml(html);
      const pdfFile = await filesService.uploadAndRegister(pdfBuffer, {
        kind: FileKind.contract_pdf,
        bucket: env.SUPABASE_STORAGE_BUCKET,
        key: storage.keys.contractPdf(contract.id, `${slugify(contract.contractNumber)}.pdf`),
        fileName: `ho-so-${slugify(contract.contractNumber)}.pdf`,
        mimeType: 'application/pdf',
        createdById: userId,
        contractId: contract.id,
        upsert: true,
      });
      pdfFileId = pdfFile.id;
    } catch (e) {
      const err = e as Error;
      logger.warn('[contracts] PDF render failed, lưu HTML fallback', { error: err.message });
      const htmlFile = await filesService.uploadAndRegister(Buffer.from(html, 'utf-8'), {
        kind: FileKind.contract_html,
        bucket: env.SUPABASE_STORAGE_BUCKET,
        key: storage.keys.contractHtml(contract.id, `${slugify(contract.contractNumber)}.html`),
        fileName: `ho-so-${slugify(contract.contractNumber)}.html`,
        mimeType: 'text/html; charset=utf-8',
        createdById: userId,
        contractId: contract.id,
        upsert: true,
      });
      pdfFileId = htmlFile.id;
      pdfMethod = 'html_fallback';
    }

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'rendered',
        docxFileId: docxFile.id,
        pdfFileId,
      },
      include: {
        docxFile: true,
        pdfFile: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        event: 'contract_rendered',
        targetType: 'contract',
        targetId: contract.id,
        detail: { docxFileId: docxFile.id, pdfFileId, pdfMethod },
      },
    });

    return {
      contract: updated,
      docxFileId: docxFile.id,
      pdfFileId,
      pdfMethod,
    };
  }

  async getStats() {
    const [total, draft, rendered, today, byDay] = await Promise.all([
      prisma.contract.count(),
      prisma.contract.count({ where: { status: 'draft' } }),
      prisma.contract.count({ where: { status: 'rendered' } }),
      prisma.contract.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.$queryRaw<Array<{ d: string; cnt: bigint }>>`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d,
               COUNT(*)::bigint as cnt
        FROM contracts
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY 1 ORDER BY 1
      `,
    ]);
    return {
      total,
      draft,
      rendered,
      today,
      byDay: byDay.map((r) => ({ d: r.d, cnt: Number(r.cnt) })),
    };
  }
}

export const contractsService = new ContractsService();
