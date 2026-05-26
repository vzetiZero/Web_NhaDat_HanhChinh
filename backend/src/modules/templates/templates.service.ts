// Templates service - admin upload DOCX template gốc

import { prisma } from '@/lib/prisma';
import { storage } from '@/services/storage.service';
import { env } from '@/config/env';
import { HttpError } from '@/lib/http-error';

export interface UploadTemplateInput {
  code: string;
  name: string;
  description?: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  adminId: number;
}

class TemplatesService {
  async list() {
    return prisma.contractTemplate.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    const t = await prisma.contractTemplate.findUnique({ where: { id } });
    if (!t) throw HttpError.notFound('Template không tồn tại');
    return t;
  }

  async findByCode(code: string) {
    return prisma.contractTemplate.findUnique({ where: { code } });
  }

  /**
   * Upload DOCX template lên Supabase + lưu metadata
   * Validate: .docx mime type, kích thước <= 10MB
   */
  async upload(input: UploadTemplateInput) {
    const { file, code, name, description, adminId } = input;
    if (file.size > 10 * 1024 * 1024) {
      throw HttpError.badRequest('Template tối đa 10MB');
    }
    const validMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream', // một số browser/clients send octet-stream
    ];
    if (!validMimes.includes(file.mimetype) && !file.originalname.toLowerCase().endsWith('.docx')) {
      throw HttpError.badRequest('Chỉ chấp nhận file .docx');
    }

    // Upsert template record trước để có ID
    let template = await this.findByCode(code);
    if (!template) {
      template = await prisma.contractTemplate.create({
        data: {
          code,
          name,
          description: description || null,
          storageBucket: env.SUPABASE_TEMPLATE_BUCKET,
          storageKey: 'pending', // tạm
        },
      });
    }

    const safeName = storage.sanitizeFilename(file.originalname || 'template.docx');
    const key = storage.keys.template(template.id, safeName);
    await storage.upload({
      bucket: env.SUPABASE_TEMPLATE_BUCKET,
      key,
      body: file.buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });

    const updated = await prisma.contractTemplate.update({
      where: { id: template.id },
      data: {
        name,
        description: description || null,
        storageBucket: env.SUPABASE_TEMPLATE_BUCKET,
        storageKey: key,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        event: 'admin_upload_template',
        targetType: 'template',
        targetId: template.id,
        detail: { code, key, size: file.size },
      },
    });

    return updated;
  }

  async getSignedDownloadUrl(id: number) {
    const t = await this.findById(id);
    const url = await storage.createSignedUrl(t.storageBucket, t.storageKey, 300);
    return { url, template: t };
  }

  async loadTemplateBuffer(id: number): Promise<Buffer> {
    const t = await this.findById(id);
    const dl = await storage.download(t.storageBucket, t.storageKey);
    return dl.buffer;
  }
}

export const templatesService = new TemplatesService();
