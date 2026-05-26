// Site Settings service - singleton row (id=1)
// - Public fields: name/logo/favicon/contact/modal cho mọi client
// - Admin fields: tất cả (cập nhật qua admin form)

import { prisma } from '@/lib/prisma';

const SETTINGS_ID = 1;

const URL_PATTERN = /^https?:\/\/[^\s]+$/;
const PHONE_PATTERN = /^[+()\d\s.-]{6,30}$/;

export interface SiteSettingsInput {
  siteName?: string;
  siteLogoUrl?: string | null;
  faviconUrl?: string | null;
  adminPhone?: string | null;
  adminZaloUrl?: string | null;
  adminFacebookUrl?: string | null;
  adminTelegramUrl?: string | null;
  adminEmail?: string | null;
  supportNoticeTitle?: string | null;
  supportNoticeContent?: string | null;
  pendingUserMessage?: string | null;
  rejectedUserMessage?: string | null;
  modalEnabled?: boolean;
  modalTitle?: string | null;
  modalContent?: string | null;
  modalButtonText?: string | null;
  modalButtonUrl?: string | null;
}

class SettingsService {
  async ensureRow() {
    const found = await prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (found) return found;
    return prisma.siteSettings.create({
      data: { id: SETTINGS_ID, siteName: 'Chứng Từ Nhà Đất' },
    });
  }

  async getAll() {
    return this.ensureRow();
  }

  /**
   * Public payload - không leak field nội bộ.
   * (Hiện tại tất cả field đều có thể public, nhưng tách hàm để sau dễ filter.)
   */
  async getPublic() {
    const s = await this.ensureRow();
    return {
      siteName: s.siteName,
      siteLogoUrl: s.siteLogoUrl,
      faviconUrl: s.faviconUrl,
      adminPhone: s.adminPhone,
      adminZaloUrl: s.adminZaloUrl,
      adminFacebookUrl: s.adminFacebookUrl,
      adminTelegramUrl: s.adminTelegramUrl,
      adminEmail: s.adminEmail,
      supportNoticeTitle: s.supportNoticeTitle,
      supportNoticeContent: s.supportNoticeContent,
      pendingUserMessage: s.pendingUserMessage,
      rejectedUserMessage: s.rejectedUserMessage,
      modal: s.modalEnabled
        ? {
            enabled: true,
            title: s.modalTitle,
            content: s.modalContent,
            buttonText: s.modalButtonText,
            buttonUrl: s.modalButtonUrl,
          }
        : { enabled: false },
    };
  }

  async update(input: SiteSettingsInput) {
    // Validate URL/phone trước khi lưu
    const urlFields: (keyof SiteSettingsInput)[] = [
      'siteLogoUrl',
      'faviconUrl',
      'adminZaloUrl',
      'adminFacebookUrl',
      'adminTelegramUrl',
      'modalButtonUrl',
    ];
    for (const f of urlFields) {
      const v = input[f];
      if (typeof v === 'string' && v.trim() && !URL_PATTERN.test(v.trim())) {
        throw new Error(`Trường ${f} phải là URL hợp lệ (http/https)`);
      }
    }
    if (typeof input.adminPhone === 'string' && input.adminPhone.trim() && !PHONE_PATTERN.test(input.adminPhone.trim())) {
      throw new Error('Số điện thoại không hợp lệ');
    }
    if (typeof input.adminEmail === 'string' && input.adminEmail.trim() && !/^[^\s@]+@[^\s@]+$/.test(input.adminEmail.trim())) {
      throw new Error('Email admin không hợp lệ');
    }

    await this.ensureRow();
    const trimmedString = (v: unknown): string | null | undefined => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      if (typeof v !== 'string') return undefined;
      const t = v.trim();
      return t === '' ? null : t;
    };

    const data = {
      siteName: typeof input.siteName === 'string' && input.siteName.trim()
        ? input.siteName.trim()
        : undefined,
      siteLogoUrl: trimmedString(input.siteLogoUrl),
      faviconUrl: trimmedString(input.faviconUrl),
      adminPhone: trimmedString(input.adminPhone),
      adminZaloUrl: trimmedString(input.adminZaloUrl),
      adminFacebookUrl: trimmedString(input.adminFacebookUrl),
      adminTelegramUrl: trimmedString(input.adminTelegramUrl),
      adminEmail: trimmedString(input.adminEmail),
      supportNoticeTitle: trimmedString(input.supportNoticeTitle),
      supportNoticeContent: trimmedString(input.supportNoticeContent),
      pendingUserMessage: trimmedString(input.pendingUserMessage),
      rejectedUserMessage: trimmedString(input.rejectedUserMessage),
      modalEnabled: typeof input.modalEnabled === 'boolean' ? input.modalEnabled : undefined,
      modalTitle: trimmedString(input.modalTitle),
      modalContent: trimmedString(input.modalContent),
      modalButtonText: trimmedString(input.modalButtonText),
      modalButtonUrl: trimmedString(input.modalButtonUrl),
    };

    return prisma.siteSettings.update({ where: { id: SETTINGS_ID }, data });
  }
}

export const settingsService = new SettingsService();
