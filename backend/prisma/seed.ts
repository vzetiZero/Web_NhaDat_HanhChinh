// Seed script - chạy 1 lần sau migration
// - Tạo admin bootstrap
// - Tạo template record (admin sẽ upload file DOCX sau)
// - (Optional) seed sample data hành chính

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'ChangeMe@123';
  const bucket = process.env.SUPABASE_TEMPLATE_BUCKET || 'contract-templates';

  console.log('🌱 Seeding database...\n');

  // 1. Admin bootstrap
  const existing = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
  if (existing) {
    console.log(`✓ Admin already exists: ${adminEmail}`);
  } else {
    const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
    await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        fullName: 'Administrator',
        isAdmin: true,
      },
    });
    console.log(`✓ Created admin: ${adminEmail}`);
    console.log(`  → password: ${adminPassword} (đổi ngay sau khi đăng nhập)`);
  }

  // 2. Default template record
  const templateCode = 'HD_TANG_QSDD_V1';
  const tpl = await prisma.contractTemplate.upsert({
    where: { code: templateCode },
    update: {},
    create: {
      code: templateCode,
      name: 'Hợp đồng tặng quyền sử dụng đất kèm tài sản gắn liền',
      description: 'Mẫu hợp đồng dân sự tặng QSDĐ. Admin cần upload file DOCX thật vào /admin#/templates.',
      storageBucket: bucket,
      storageKey: 'pending', // placeholder - admin upload sẽ ghi đè
      isActive: true,
    },
  });
  console.log(`✓ Template "${templateCode}" ready (id=${tpl.id}); upload DOCX qua admin panel.`);

  console.log('\n✅ Seed completed.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
