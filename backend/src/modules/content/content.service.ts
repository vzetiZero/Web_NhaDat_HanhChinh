// Content module: CRUD cho banners, faqs, template_samples
// Sanitize input để chống XSS trong câu hỏi/đáp/banner

import { prisma } from '@/lib/prisma';

const URL_PATTERN = /^https?:\/\/[^\s]+$/;

function sanitizeText(s: unknown, max = 2000): string {
  if (typeof s !== 'string') return '';
  const stripped = s
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
  return stripped.trim().slice(0, max);
}

function validateUrl(v: unknown, field: string): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  if (!URL_PATTERN.test(t)) throw new Error(`${field} phải là URL hợp lệ (http/https)`);
  return t;
}

function parseInt0(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function parseBool(v: unknown, fallback = true): boolean {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true' || v === '1' || v === 'on';
  return Boolean(v);
}

// ============ BANNERS ============

export interface BannerInput {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

class ContentService {
  // ----- Banners -----
  async listBanners(activeOnly = false) {
    return prisma.banner.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getBanner(id: number) {
    return prisma.banner.findUnique({ where: { id } });
  }

  async createBanner(input: BannerInput) {
    const title = sanitizeText(input.title, 200);
    if (!title) throw new Error('Tiêu đề bắt buộc');
    return prisma.banner.create({
      data: {
        title,
        subtitle: sanitizeText(input.subtitle, 500) || null,
        imageUrl: validateUrl(input.imageUrl, 'Image URL'),
        buttonText: sanitizeText(input.buttonText, 80) || null,
        buttonUrl: validateUrl(input.buttonUrl, 'Button URL'),
        sortOrder: parseInt0(input.sortOrder),
        isActive: parseBool(input.isActive, true),
      },
    });
  }

  async updateBanner(id: number, input: BannerInput) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      const t = sanitizeText(input.title, 200);
      if (!t) throw new Error('Tiêu đề bắt buộc');
      data.title = t;
    }
    if (input.subtitle !== undefined) data.subtitle = sanitizeText(input.subtitle, 500) || null;
    if (input.imageUrl !== undefined) data.imageUrl = validateUrl(input.imageUrl, 'Image URL');
    if (input.buttonText !== undefined) data.buttonText = sanitizeText(input.buttonText, 80) || null;
    if (input.buttonUrl !== undefined) data.buttonUrl = validateUrl(input.buttonUrl, 'Button URL');
    if (input.sortOrder !== undefined) data.sortOrder = parseInt0(input.sortOrder);
    if (input.isActive !== undefined) data.isActive = parseBool(input.isActive, true);
    return prisma.banner.update({ where: { id }, data });
  }

  async deleteBanner(id: number) {
    await prisma.banner.delete({ where: { id } });
  }

  // ----- FAQs -----
  async listFaqs(activeOnly = false) {
    return prisma.faq.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getFaq(id: number) {
    return prisma.faq.findUnique({ where: { id } });
  }

  async createFaq(input: { question?: string; answer?: string; category?: string; sortOrder?: number; isActive?: boolean }) {
    const question = sanitizeText(input.question, 500);
    const answer = sanitizeText(input.answer, 5000);
    if (!question) throw new Error('Câu hỏi bắt buộc');
    if (!answer) throw new Error('Câu trả lời bắt buộc');
    return prisma.faq.create({
      data: {
        question,
        answer,
        category: sanitizeText(input.category, 80) || null,
        sortOrder: parseInt0(input.sortOrder),
        isActive: parseBool(input.isActive, true),
      },
    });
  }

  async updateFaq(id: number, input: { question?: string; answer?: string; category?: string; sortOrder?: number; isActive?: boolean }) {
    const data: Record<string, unknown> = {};
    if (input.question !== undefined) {
      const v = sanitizeText(input.question, 500);
      if (!v) throw new Error('Câu hỏi bắt buộc');
      data.question = v;
    }
    if (input.answer !== undefined) {
      const v = sanitizeText(input.answer, 5000);
      if (!v) throw new Error('Câu trả lời bắt buộc');
      data.answer = v;
    }
    if (input.category !== undefined) data.category = sanitizeText(input.category, 80) || null;
    if (input.sortOrder !== undefined) data.sortOrder = parseInt0(input.sortOrder);
    if (input.isActive !== undefined) data.isActive = parseBool(input.isActive, true);
    return prisma.faq.update({ where: { id }, data });
  }

  async deleteFaq(id: number) {
    await prisma.faq.delete({ where: { id } });
  }

  // ----- Template Samples -----
  async listSamples(activeOnly = false) {
    return prisma.templateSample.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getSample(id: number) {
    return prisma.templateSample.findUnique({ where: { id } });
  }

  async createSample(input: {
    name?: string;
    description?: string;
    previewImageUrl?: string;
    category?: string;
    templateId?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const name = sanitizeText(input.name, 200);
    if (!name) throw new Error('Tên mẫu bắt buộc');
    const tplId = input.templateId === null || input.templateId === undefined || (input.templateId as unknown) === ''
      ? null
      : Number(input.templateId);
    if (tplId !== null && (!Number.isInteger(tplId) || tplId <= 0)) {
      throw new Error('templateId không hợp lệ');
    }
    return prisma.templateSample.create({
      data: {
        name,
        description: sanitizeText(input.description, 2000) || null,
        previewImageUrl: validateUrl(input.previewImageUrl, 'Preview image URL'),
        category: sanitizeText(input.category, 80) || null,
        templateId: tplId,
        sortOrder: parseInt0(input.sortOrder),
        isActive: parseBool(input.isActive, true),
      },
    });
  }

  async updateSample(id: number, input: {
    name?: string;
    description?: string;
    previewImageUrl?: string;
    category?: string;
    templateId?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const v = sanitizeText(input.name, 200);
      if (!v) throw new Error('Tên mẫu bắt buộc');
      data.name = v;
    }
    if (input.description !== undefined) data.description = sanitizeText(input.description, 2000) || null;
    if (input.previewImageUrl !== undefined) data.previewImageUrl = validateUrl(input.previewImageUrl, 'Preview image URL');
    if (input.category !== undefined) data.category = sanitizeText(input.category, 80) || null;
    if (input.templateId !== undefined) {
      const tplId = input.templateId === null || (input.templateId as unknown) === ''
        ? null
        : Number(input.templateId);
      if (tplId !== null && (!Number.isInteger(tplId) || tplId <= 0)) {
        throw new Error('templateId không hợp lệ');
      }
      data.templateId = tplId;
    }
    if (input.sortOrder !== undefined) data.sortOrder = parseInt0(input.sortOrder);
    if (input.isActive !== undefined) data.isActive = parseBool(input.isActive, true);
    return prisma.templateSample.update({ where: { id }, data });
  }

  async deleteSample(id: number) {
    await prisma.templateSample.delete({ where: { id } });
  }
}

export const contentService = new ContentService();
