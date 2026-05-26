// Zod schemas cho auth module

import { z } from 'zod';

// Email validator nhẹ hơn z.email() - cho phép local hostname (admin@local, admin@localhost)
// Chỉ check format "user@host", không bắt buộc TLD. Production-safe vì auth thật check qua DB.
const emailFlex = z
  .string()
  .min(3, 'Email quá ngắn')
  .max(254, 'Email quá dài')
  .regex(/^[^\s@]+@[^\s@]+$/, 'Email phải có dạng user@host')
  .transform((s) => s.toLowerCase().trim());

const fingerprintSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{16,128}$/, 'Fingerprint không hợp lệ');

export const registerSchema = z.object({
  email: emailFlex,
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
  register_note: z.string().max(1000).optional().or(z.literal('')),
  fingerprint: fingerprintSchema,
});

export const loginSchema = z.object({
  email: emailFlex,
  password: z.string().min(1),
  fingerprint: fingerprintSchema,
});

export const adminLoginSchema = z.object({
  email: emailFlex,
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailFlex.optional(),
  phone: z.string().min(9).max(15).optional(),
}).refine((v) => !!(v.email || v.phone), {
  message: 'Vui lòng nhập email hoặc số điện thoại',
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
