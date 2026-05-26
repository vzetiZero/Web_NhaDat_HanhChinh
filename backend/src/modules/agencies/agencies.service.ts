// Land Agency Suggestion Service
// - Smart suggestion: tìm cơ quan đăng ký đất đai phù hợp dựa vào input + tỉnh/huyện cũ
// - Multi-tier trust: admin_verified > seed_data > user_confirmed > system_suggested
// - User confirm: tăng confirmCount + ghi history; nếu nhập mới → tạo UserAgencySuggestion (pending)
// - Tích hợp với UserAgencyHistory để boost cá nhân hóa
//
// Scoring (cộng dồn):
//   +50 trùng tỉnh
//   +30 trùng huyện cũ
//   +40 normalized name full match (exact tokens)
//   +20 fuzzy token match (partial)
//   +30 trust_level = admin_verified
//   +20 trust_level = seed_data
//   +10 trust_level = user_confirmed
//   -30 chưa có province + chưa được user_confirmed (suggestion bừa)
//   +bonus: confirmCount / 5 (max +10)
//   +25 nếu xuất hiện trong UserAgencyHistory của user hiện tại

import { Prisma, LandAgency, TrustLevel, AgencyType } from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';
import {
  fullNormalize,
  tokenMatchScore,
  normalizeText,
} from '@/utils/vn-normalize';

export interface SuggestParams {
  q: string;
  provinceId?: number;
  provinceCode?: string;
  districtOldId?: number;
  userId?: number;
  limit?: number;
}

export interface AgencySuggestion {
  id: number;
  officialName: string;
  shortName: string | null;
  agencyType: AgencyType;
  province: { id: number; name: string } | null;
  districtOld: { id: number; name: string } | null;
  trustLevel: TrustLevel;
  confirmCount: number;
  score: number;
  matchReason: string[];
  fromUserHistory: boolean;
}

export interface ConfirmInput {
  userId: number;
  agencyId: number;
  rawInput?: string;
  provinceId?: number;
  districtOldId?: number;
}

export interface SuggestNewInput {
  userId?: number;
  rawInput: string;
  provinceId?: number;
  districtOldId?: number;
  userNote?: string;
}

class AgenciesService {
  private async suggestFromExternalApi(params: {
    q: string;
    provinceCode?: string;
    provinceName?: string;
    limit: number;
  }): Promise<AgencySuggestion[]> {
    if (!env.DVCQG_AGENCY_API_URL) return [];

    const url = new URL(env.DVCQG_AGENCY_API_URL);
    if (params.q) url.searchParams.set('q', params.q);
    if (params.provinceCode) url.searchParams.set('province_code', params.provinceCode);
    if (params.provinceName) url.searchParams.set('province_name', params.provinceName);
    url.searchParams.set('limit', String(params.limit));

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (env.DVCQG_API_KEY) headers.Authorization = `Bearer ${env.DVCQG_API_KEY}`;

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return [];
      const payload = (await res.json()) as any;
      const rawItems = Array.isArray(payload) ? payload : payload.items || payload.data || payload.results || [];
      if (!Array.isArray(rawItems)) return [];
      return rawItems.slice(0, params.limit).map((item: any, index: number) => {
        const officialName =
          item.officialName || item.official_name || item.name || item.agencyName || item.tenCoQuan || '';
        return {
          id: 0,
          officialName: String(officialName),
          shortName: item.shortName || item.short_name || null,
          agencyType: (item.agencyType || item.agency_type || 'other') as AgencyType,
          province: item.provinceName || item.province_name
            ? { id: 0, name: String(item.provinceName || item.province_name) }
            : null,
          districtOld: null,
          trustLevel: 'admin_verified' as TrustLevel,
          confirmCount: Number(item.confirmCount || item.confirm_count || 0),
          score: 100 - index,
          matchReason: ['nguồn API chính thức'],
          fromUserHistory: false,
        };
      }).filter((item: AgencySuggestion) => item.officialName);
    } catch {
      return [];
    }
  }

  /**
   * Gợi ý cơ quan dựa vào query + bối cảnh tỉnh/huyện
   */
  async suggest(params: SuggestParams): Promise<AgencySuggestion[]> {
    let { provinceId } = params;
    const { q, provinceCode, districtOldId, userId, limit = 10 } = params;
    if (!provinceId && provinceCode) {
      const province = await prisma.province.findUnique({ where: { code: provinceCode } });
      provinceId = province?.id;
    }
    const provinceForExternal = provinceId
      ? await prisma.province.findUnique({ where: { id: provinceId }, select: { nameCurrent: true, code: true } })
      : null;

    const externalItems = await this.suggestFromExternalApi({
      q,
      provinceCode: provinceCode || provinceForExternal?.code,
      provinceName: provinceForExternal?.nameCurrent,
      limit,
    });
    if (externalItems.length) return externalItems;
    const qNormalized = fullNormalize(q || '');
    const qTokens = qNormalized.split(' ').filter(Boolean);
    const hasQuery = qTokens.length > 0;

    // Lấy candidate set: ưu tiên theo tỉnh nếu có, fallback toàn bộ active
    const where: Prisma.LandAgencyWhereInput = {
      status: 'active',
    };
    if (provinceId) {
      // Cho phép cả agency cấp tỉnh (chưa gắn district) lẫn agency cấp huyện thuộc tỉnh đó
      where.OR = [
        { provinceId: provinceId },
        { provinceId: null }, // agency toàn quốc (hiếm, nhưng có thể)
      ];
    }

    const candidates = await prisma.landAgency.findMany({
      where,
      include: {
        province: { select: { id: true, nameCurrent: true } },
        districtOld: { select: { id: true, nameOld: true } },
        aliases: {
          where: { status: { in: ['admin_verified', 'user_confirmed'] } },
          select: { aliasNormalized: true },
        },
      },
      take: 500,
    });

    // Lấy user history để boost
    let userHistoryAgencyIds = new Set<number>();
    if (userId) {
      const history = await prisma.userAgencyHistory.findMany({
        where: { userId },
        select: { agencyId: true },
      });
      userHistoryAgencyIds = new Set(history.map((h) => h.agencyId));
    }

    const scored: AgencySuggestion[] = candidates.map((a) => {
      let score = 0;
      const reasons: string[] = [];

      // Province match
      if (provinceId && a.provinceId === provinceId) {
        score += 50;
        reasons.push('cùng tỉnh');
      }
      // District match
      if (districtOldId && a.districtOldId === districtOldId) {
        score += 30;
        reasons.push('cùng huyện cũ');
      }

      // Text matching: kiểm tra cả tên chính + aliases
      if (hasQuery) {
        const targets: string[] = [];
        if (a.nameNormalized) targets.push(a.nameNormalized);
        if (a.shortName) targets.push(fullNormalize(a.shortName));
        for (const al of a.aliases) {
          if (al.aliasNormalized) targets.push(al.aliasNormalized);
        }
        const matchScores = targets.map((t) => tokenMatchScore(qNormalized, t));
        const bestMatch = Math.max(0, ...matchScores);
        if (bestMatch > 0) {
          // tokenMatchScore: tối đa ~ N*3 + 3 với N tokens. Scale lên ~40
          const scaled = Math.min(40, bestMatch * 4);
          score += scaled;
          reasons.push(`khớp tên (+${scaled})`);
        } else {
          // Substring fallback nhẹ
          if (a.nameNormalized && a.nameNormalized.includes(qNormalized) && qNormalized.length >= 3) {
            score += 15;
            reasons.push('chứa từ khóa');
          } else if (qNormalized.length >= 3) {
            // Không match gì → cho điểm thấp dựa trên trust để vẫn ra suggestion
            // (chỉ áp dụng khi có provinceId, nếu không thì loại)
            if (!provinceId) score -= 10;
          }
        }
      }

      // Trust level
      switch (a.trustLevel) {
        case 'admin_verified':
          score += 30;
          reasons.push('admin xác minh');
          break;
        case 'seed_data':
          score += 20;
          break;
        case 'user_confirmed':
          score += 10;
          break;
        case 'system_suggested':
          if (a.confirmCount === 0) {
            score -= 30;
            reasons.push('chưa verify');
          }
          break;
      }

      // Confirm count bonus (cap +10)
      const cb = Math.min(10, Math.floor(a.confirmCount / 5));
      if (cb > 0) score += cb;

      // User history boost
      const fromUserHistory = userHistoryAgencyIds.has(a.id);
      if (fromUserHistory) {
        score += 25;
        reasons.push('đã từng dùng');
      }

      return {
        id: a.id,
        officialName: a.officialName,
        shortName: a.shortName,
        agencyType: a.agencyType,
        province: a.province
          ? { id: a.province.id, name: a.province.nameCurrent }
          : null,
        districtOld: a.districtOld
          ? { id: a.districtOld.id, name: a.districtOld.nameOld }
          : null,
        trustLevel: a.trustLevel,
        confirmCount: a.confirmCount,
        score,
        matchReason: reasons,
        fromUserHistory,
      };
    });

    // Lọc bỏ điểm âm khi có query (tránh noise), giữ top theo score giảm dần
    const filtered = scored
      .filter((s) => (hasQuery || provinceId ? s.score >= 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return filtered;
  }

  /**
   * User xác nhận đã dùng agency này
   * - Tăng confirmCount
   * - Upsert UserAgencyHistory (usageCount + 1)
   * - Audit log
   */
  async confirm(input: ConfirmInput) {
    const { userId, agencyId, rawInput, provinceId, districtOldId } = input;
    const agency = await prisma.landAgency.findUnique({ where: { id: agencyId } });
    if (!agency) throw HttpError.notFound('Cơ quan không tồn tại');

    const normalizedInput = rawInput ? fullNormalize(rawInput) : null;

    await prisma.$transaction(async (tx) => {
      await tx.landAgency.update({
        where: { id: agencyId },
        data: {
          confirmCount: { increment: 1 },
          // Tự promote system_suggested → user_confirmed sau khi có người confirm
          ...(agency.trustLevel === 'system_suggested'
            ? { trustLevel: 'user_confirmed' as TrustLevel }
            : {}),
        },
      });

      // Upsert history
      const existing = await tx.userAgencyHistory.findUnique({
        where: { userId_agencyId: { userId, agencyId } },
      });
      if (existing) {
        await tx.userAgencyHistory.update({
          where: { id: existing.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
            rawInput: rawInput || existing.rawInput,
            normalizedInput: normalizedInput || existing.normalizedInput,
            provinceId: provinceId ?? existing.provinceId,
            districtOldId: districtOldId ?? existing.districtOldId,
          },
        });
      } else {
        await tx.userAgencyHistory.create({
          data: {
            userId,
            agencyId,
            rawInput: rawInput || null,
            normalizedInput,
            provinceId: provinceId ?? null,
            districtOldId: districtOldId ?? null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          event: 'agency_confirmed',
          targetType: 'agency',
          targetId: agencyId,
          detail: { rawInput, provinceId, districtOldId },
        },
      });
    });

    return { ok: true, agencyId };
  }

  /**
   * User đề xuất 1 cơ quan mới (chưa có trong DB)
   * - Tạo UserAgencySuggestion (pending) cho admin xem xét
   * - Đồng thời tự tạo LandAgency với trust = system_suggested để user dùng tạm
   */
  async suggestNew(input: SuggestNewInput) {
    const { userId, rawInput, provinceId, districtOldId, userNote } = input;
    const trimmed = rawInput.trim();
    if (trimmed.length < 5) {
      throw HttpError.badRequest('Tên cơ quan tối thiểu 5 ký tự');
    }
    if (trimmed.length > 255) {
      throw HttpError.badRequest('Tên cơ quan tối đa 255 ký tự');
    }
    const normalized = fullNormalize(trimmed);

    // Check dup: agency đã tồn tại với tên giống vậy + cùng province
    const existing = await prisma.landAgency.findFirst({
      where: {
        nameNormalized: normalized,
        ...(provinceId ? { provinceId } : {}),
      },
    });
    if (existing) {
      // Đã có → trả về luôn, không tạo trùng
      return { ok: true, agency: existing, created: false, suggestionId: null };
    }

    return await prisma.$transaction(async (tx) => {
      // Tạo LandAgency với trust system_suggested
      const agency = await tx.landAgency.create({
        data: {
          officialName: trimmed,
          nameNormalized: normalized,
          shortName: null,
          provinceId: provinceId ?? null,
          districtOldId: districtOldId ?? null,
          agencyType: 'other' as AgencyType,
          trustLevel: 'system_suggested' as TrustLevel,
          sourceType: 'user_input',
          sourceNote: userNote || 'User đề xuất từ form hợp đồng',
          confirmCount: 0,
        },
      });

      // Tạo suggestion để admin moderate
      const suggestion = await tx.userAgencySuggestion.create({
        data: {
          userId: userId ?? null,
          rawInput: trimmed,
          normalizedInput: normalized,
          provinceId: provinceId ?? null,
          districtOldId: districtOldId ?? null,
          suggestedAgencyId: agency.id,
          userConfirmed: true,
          adminStatus: 'pending',
          userNote: userNote || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: userId ?? null,
          event: 'agency_suggested_new',
          targetType: 'agency',
          targetId: agency.id,
          detail: { rawInput: trimmed, provinceId, districtOldId, suggestionId: suggestion.id },
        },
      });

      return { ok: true, agency, created: true, suggestionId: suggestion.id };
    });
  }

  // ========= Admin moderation =========

  /**
   * List pending suggestions cho admin review
   */
  async listPendingSuggestions(params: {
    status?: 'pending' | 'approved' | 'rejected' | 'merged';
    page?: number;
    limit?: number;
  }) {
    const { status = 'pending', page = 1, limit = 20 } = params;
    const [total, items] = await prisma.$transaction([
      prisma.userAgencySuggestion.count({ where: { adminStatus: status } }),
      prisma.userAgencySuggestion.findMany({
        where: { adminStatus: status },
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          province: { select: { id: true, nameCurrent: true } },
          districtOld: { select: { id: true, nameOld: true } },
          suggestedAgency: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Admin approve suggestion → promote agency lên trust_level admin_verified
   */
  async approveSuggestion(suggestionId: number, adminId: number, note?: string) {
    const s = await prisma.userAgencySuggestion.findUnique({
      where: { id: suggestionId },
      include: { suggestedAgency: true },
    });
    if (!s) throw HttpError.notFound('Suggestion không tồn tại');
    if (s.adminStatus !== 'pending') {
      throw HttpError.conflict(`Suggestion đã được xử lý (${s.adminStatus})`);
    }
    if (!s.suggestedAgencyId) {
      throw HttpError.badRequest('Suggestion không có agency liên kết');
    }

    await prisma.$transaction(async (tx) => {
      await tx.landAgency.update({
        where: { id: s.suggestedAgencyId! },
        data: { trustLevel: 'admin_verified' as TrustLevel },
      });
      await tx.userAgencySuggestion.update({
        where: { id: suggestionId },
        data: { adminStatus: 'approved', adminNote: note || null },
      });
      await tx.auditLog.create({
        data: {
          adminId,
          event: 'agency_suggestion_approved',
          targetType: 'agency_suggestion',
          targetId: suggestionId,
          detail: { agencyId: s.suggestedAgencyId, note },
        },
      });
    });

    return { ok: true };
  }

  /**
   * Admin reject suggestion → soft delete agency liên kết (status = archived)
   */
  async rejectSuggestion(suggestionId: number, adminId: number, note?: string) {
    const s = await prisma.userAgencySuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!s) throw HttpError.notFound('Suggestion không tồn tại');
    if (s.adminStatus !== 'pending') {
      throw HttpError.conflict(`Suggestion đã được xử lý (${s.adminStatus})`);
    }

    await prisma.$transaction(async (tx) => {
      if (s.suggestedAgencyId) {
        await tx.landAgency.update({
          where: { id: s.suggestedAgencyId },
          data: { status: 'archived' },
        });
      }
      await tx.userAgencySuggestion.update({
        where: { id: suggestionId },
        data: { adminStatus: 'rejected', adminNote: note || null },
      });
      await tx.auditLog.create({
        data: {
          adminId,
          event: 'agency_suggestion_rejected',
          targetType: 'agency_suggestion',
          targetId: suggestionId,
          detail: { agencyId: s.suggestedAgencyId, note },
        },
      });
    });
    return { ok: true };
  }

  /**
   * Admin merge: suggestion thực ra là duplicate của 1 agency có sẵn
   * - Chuyển aliases/history sang agency target
   * - Archive agency suggested
   */
  async mergeSuggestion(
    suggestionId: number,
    targetAgencyId: number,
    adminId: number,
    note?: string
  ) {
    const s = await prisma.userAgencySuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!s) throw HttpError.notFound('Suggestion không tồn tại');
    if (s.adminStatus !== 'pending') {
      throw HttpError.conflict(`Suggestion đã được xử lý (${s.adminStatus})`);
    }
    const target = await prisma.landAgency.findUnique({
      where: { id: targetAgencyId },
    });
    if (!target) throw HttpError.notFound('Agency đích không tồn tại');

    await prisma.$transaction(async (tx) => {
      // Tạo alias từ rawInput sang agency target
      if (s.rawInput) {
        await tx.agencyAlias.create({
          data: {
            agencyId: targetAgencyId,
            aliasText: s.rawInput,
            aliasNormalized: s.normalizedInput,
            sourceType: 'user_input',
            status: 'admin_verified',
            confirmedCount: 1,
          },
        });
      }
      // Chuyển user history nếu có
      if (s.suggestedAgencyId && s.suggestedAgencyId !== targetAgencyId) {
        await tx.userAgencyHistory.updateMany({
          where: { agencyId: s.suggestedAgencyId },
          data: { agencyId: targetAgencyId },
        });
        await tx.landAgency.update({
          where: { id: s.suggestedAgencyId },
          data: { status: 'archived' },
        });
      }
      await tx.userAgencySuggestion.update({
        where: { id: suggestionId },
        data: {
          adminStatus: 'merged',
          adminNote: note || null,
          suggestedAgencyId: targetAgencyId,
        },
      });
      await tx.auditLog.create({
        data: {
          adminId,
          event: 'agency_suggestion_merged',
          targetType: 'agency_suggestion',
          targetId: suggestionId,
          detail: {
            fromAgencyId: s.suggestedAgencyId,
            toAgencyId: targetAgencyId,
            note,
          },
        },
      });
    });

    return { ok: true };
  }

  /**
   * Admin trực tiếp tạo agency mới (trust admin_verified ngay)
   */
  async adminCreate(input: {
    officialName: string;
    shortName?: string;
    provinceId?: number;
    districtOldId?: number;
    agencyType: AgencyType;
    parentAgency?: string;
    adminId: number;
  }): Promise<LandAgency> {
    const { officialName, shortName, provinceId, districtOldId, agencyType, parentAgency, adminId } =
      input;
    const trimmed = officialName.trim();
    if (trimmed.length < 5) throw HttpError.badRequest('Tên cơ quan tối thiểu 5 ký tự');
    const normalized = fullNormalize(trimmed);

    const agency = await prisma.landAgency.create({
      data: {
        officialName: trimmed,
        nameNormalized: normalized,
        shortName: shortName?.trim() || null,
        provinceId: provinceId ?? null,
        districtOldId: districtOldId ?? null,
        agencyType,
        parentAgency: parentAgency || null,
        trustLevel: 'admin_verified',
        sourceType: 'admin_input',
        sourceNote: 'Admin tạo trực tiếp',
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        event: 'agency_created',
        targetType: 'agency',
        targetId: agency.id,
        detail: { officialName: trimmed, provinceId, districtOldId, agencyType },
      },
    });
    return agency;
  }

  async listAgencies(params: {
    provinceId?: number;
    type?: AgencyType;
    trustLevel?: TrustLevel;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { provinceId, type, trustLevel, search, page = 1, limit = 50 } = params;
    const where: Prisma.LandAgencyWhereInput = { status: 'active' };
    if (provinceId) where.provinceId = provinceId;
    if (type) where.agencyType = type;
    if (trustLevel) where.trustLevel = trustLevel;
    if (search) {
      const normalized = normalizeText(search);
      where.OR = [
        { officialName: { contains: search, mode: 'insensitive' } },
        { nameNormalized: { contains: normalized } },
      ];
    }
    const [total, items] = await prisma.$transaction([
      prisma.landAgency.count({ where }),
      prisma.landAgency.findMany({
        where,
        include: {
          province: { select: { id: true, nameCurrent: true } },
          districtOld: { select: { id: true, nameOld: true } },
          _count: { select: { aliases: true, history: true } },
        },
        orderBy: [{ trustLevel: 'asc' }, { confirmCount: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total, page, limit };
  }
}

export const agenciesService = new AgenciesService();
