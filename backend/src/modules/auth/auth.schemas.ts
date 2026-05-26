// Zod schemas cho auth module

import { z } from 'zod';

const fingerprintSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{16,128}$/, 'Fingerprint không hợp lệ');

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
      message: 'Mật khẩu phải có chữ và số',
    }),
  full_name: z.string().min(1).max(200).optional(),
  phone: z
    .string()
    .regex(/^(\+84|0)[1-9][0-9]{8,9}$/, 'SĐT Việt Nam không hợp lệ')
    .optional()
    .or(z.literal('')),
  fingerprint: fingerprintSchema,
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
  fingerprint: fingerprintSchema,
});

export const adminLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
