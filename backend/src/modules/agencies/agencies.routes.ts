// Land Agency routes - user-facing
// - GET /api/agencies/suggest?q=&province_id=&district_old_id=
// - POST /api/agencies/confirm
// - POST /api/agencies/suggest-new

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/error';
import { validate } from '@/middleware/validate';
import { requireAuth, optionalAuth, AuthedRequest } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { agenciesService } from './agencies.service';

export const agenciesRouter = Router();

const numOrUndef = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === '' || v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
  });

const suggestQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
  province_id: numOrUndef,
  province_code: z.string().max(80).optional(),
  district_old_id: numOrUndef,
  limit: numOrUndef,
});

agenciesRouter.get(
  '/suggest',
  optionalAuth,
  validate(suggestQuerySchema, 'query'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const q = req.query as unknown as z.infer<typeof suggestQuerySchema>;
    const items = await agenciesService.suggest({
      q: q.q || '',
      provinceId: q.province_id,
      provinceCode: q.province_code,
      districtOldId: q.district_old_id,
      userId: req.user?.userId,
      limit: q.limit ? Math.min(30, Math.max(1, q.limit)) : 10,
    });
    res.json({ success: true, items, count: items.length });
  })
);

const confirmSchema = z.object({
  agencyId: z.number().int().positive(),
  rawInput: z.string().max(255).optional(),
  provinceId: z.number().int().positive().optional(),
  districtOldId: z.number().int().positive().optional(),
});

agenciesRouter.post(
  '/confirm',
  requireAuth,
  validate(confirmSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof confirmSchema>;
    const r = await agenciesService.confirm({
      userId: req.user!.userId,
      agencyId: body.agencyId,
      rawInput: body.rawInput,
      provinceId: body.provinceId,
      districtOldId: body.districtOldId,
    });
    res.json({ success: true, ...r });
  })
);

const suggestNewSchema = z.object({
  rawInput: z.string().min(5).max(255),
  provinceId: z.number().int().positive().optional(),
  districtOldId: z.number().int().positive().optional(),
  userNote: z.string().max(500).optional(),
});

agenciesRouter.post(
  '/suggest-new',
  optionalAuth,
  validate(suggestNewSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof suggestNewSchema>;
    const r = await agenciesService.suggestNew({
      userId: req.user?.userId,
      rawInput: body.rawInput,
      provinceId: body.provinceId,
      districtOldId: body.districtOldId,
      userNote: body.userNote,
    });
    res.json({ success: true, ...r });
  })
);

// =============== Admin moderation ===============

import { requireAdmin } from '@/middleware/auth';
import { AgencyType, TrustLevel } from '@prisma/client';

export const adminAgenciesRouter = Router();

// List pending suggestions
adminAgenciesRouter.get(
  '/suggestions',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || 'pending';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    if (!['pending', 'approved', 'rejected', 'merged'].includes(status)) {
      throw HttpError.badRequest('Status không hợp lệ');
    }
    const data = await agenciesService.listPendingSuggestions({
      status: status as 'pending' | 'approved' | 'rejected' | 'merged',
      page,
      limit,
    });
    res.json({ success: true, ...data });
  })
);

const moderateSchema = z.object({
  note: z.string().max(500).optional(),
  targetAgencyId: z.number().int().positive().optional(),
});

adminAgenciesRouter.post(
  '/suggestions/:id/approve',
  requireAdmin,
  validate(moderateSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const body = req.body as z.infer<typeof moderateSchema>;
    await agenciesService.approveSuggestion(id, req.user!.userId, body.note);
    res.json({ success: true });
  })
);

adminAgenciesRouter.post(
  '/suggestions/:id/reject',
  requireAdmin,
  validate(moderateSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const body = req.body as z.infer<typeof moderateSchema>;
    await agenciesService.rejectSuggestion(id, req.user!.userId, body.note);
    res.json({ success: true });
  })
);

adminAgenciesRouter.post(
  '/suggestions/:id/merge',
  requireAdmin,
  validate(moderateSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const body = req.body as z.infer<typeof moderateSchema>;
    if (!body.targetAgencyId) {
      throw HttpError.badRequest('Thiếu targetAgencyId để merge');
    }
    await agenciesService.mergeSuggestion(
      id,
      body.targetAgencyId,
      req.user!.userId,
      body.note
    );
    res.json({ success: true });
  })
);

// Admin CRUD agencies
const createAgencySchema = z.object({
  officialName: z.string().min(5).max(255),
  shortName: z.string().max(100).optional(),
  provinceId: z.number().int().positive().optional(),
  districtOldId: z.number().int().positive().optional(),
  agencyType: z.enum([
    'land_registration_office',
    'land_registration_branch',
    'department_of_agriculture_environment',
    'district_people_committee',
    'province_people_committee',
    'notary_office',
    'tax_department',
    'other',
  ]),
  parentAgency: z.string().max(255).optional(),
});

adminAgenciesRouter.post(
  '/',
  requireAdmin,
  validate(createAgencySchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createAgencySchema>;
    const agency = await agenciesService.adminCreate({
      ...body,
      agencyType: body.agencyType as AgencyType,
      adminId: req.user!.userId,
    });
    res.json({ success: true, agency });
  })
);

adminAgenciesRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = await agenciesService.listAgencies({
      provinceId: req.query.province_id ? Number(req.query.province_id) : undefined,
      type: req.query.type as AgencyType | undefined,
      trustLevel: req.query.trust_level as TrustLevel | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json({ success: true, ...data });
  })
);
