// Zod schemas cho contracts module

import { z } from 'zod';

// Cấu trúc form chỉ validate ở "có nội dung", chi tiết do client form đã validate
// Backend chỉ cần đảm bảo có form_data + template

const personSchema = z
  .object({
    hoTen: z.string().optional(),
    danhXung: z.string().optional(),
    ngaySinh: z.string().optional(),
    cccd: z.string().optional(),
    ngayCapCCCD: z.string().optional(),
    noiCapCCCD: z.string().optional(),
    diaChi: z.union([z.string(), z.record(z.unknown())]).optional(),
    dienThoai: z.string().optional(),
    maSoThue: z.string().optional(),
  })
  .passthrough();

export const contractFormSchema = z
  .object({
    thongTinChung: z
      .object({
        ngayKy: z.string().optional(),
        ngayKyISO: z.string().optional(),
        noiKy: z.string().optional(),
        soHopDong: z.string().optional(),
      })
      .passthrough()
      .optional(),
    benA: z
      .object({
        chuHo: personSchema.optional(),
        thanhVien: z.array(personSchema).optional(),
      })
      .passthrough()
      .optional(),
    benB: z
      .object({
        chuHo: personSchema.optional(),
        thanhVien: z.array(personSchema).optional(),
      })
      .passthrough()
      .optional(),
    thuaDat: z.record(z.unknown()).optional(),
    dieuKhoan: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const createContractSchema = z.object({
  template_code: z.string().min(1).default('HD_TANG_QSDD_V1'),
  form_data: contractFormSchema,
  draft: z.boolean().default(true),
});

export const updateContractSchema = z.object({
  form_data: contractFormSchema,
});

export const listContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['draft', 'rendered', 'signed', 'archived']).optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
