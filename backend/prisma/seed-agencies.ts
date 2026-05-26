// Seed Land Agencies + Provinces
// - Upsert 34 tỉnh từ VN_WARDS_BY_PROVINCE (sau sáp nhập 2025)
// - Insert ~6 cơ quan chuẩn cho mỗi tỉnh:
//   1. Văn phòng Đăng ký Đất đai tỉnh
//   2. Sở Nông nghiệp và Môi trường tỉnh (tên mới sau sáp nhập Sở TNMT)
//   3. Uỷ ban Nhân dân tỉnh
//   4. Chi cục Thuế tỉnh
//   5. Văn phòng Công chứng Nhà nước (tỉnh)
//   6. Sở Tư pháp tỉnh
//
// Tất cả trust_level = seed_data, source_type = seed.

import { PrismaClient, AgencyType, TrustLevel, SourceType } from '@prisma/client';
import dotenv from 'dotenv';
import { VN_WARDS_BY_PROVINCE } from '../src/data/vn-wards-source';

dotenv.config();

const prisma = new PrismaClient();

// Util: chuẩn hóa giống vn-normalize (để không cần import path alias từ src/)
function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function normalizeText(s: string): string {
  if (!s) return '';
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeProvinceCode(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

interface AgencyTemplate {
  officialNameFn: (p: string) => string;
  shortNameFn?: (p: string) => string;
  agencyType: AgencyType;
  parentFn?: (p: string) => string;
}

// Strip prefix "tỉnh "/"thành phố " để dùng trong tên cơ quan
function stripProvinceWord(province: string): string {
  return province
    .replace(/^(tỉnh|Tỉnh|TỈNH|thành phố|Thành phố|THÀNH PHỐ|Đặc khu|đặc khu)\s+/, '')
    .trim();
}

const AGENCY_TEMPLATES: AgencyTemplate[] = [
  {
    officialNameFn: (p) => `Văn phòng Đăng ký Đất đai ${p}`,
    shortNameFn: (p) => `VPĐKĐĐ ${stripProvinceWord(p)}`,
    agencyType: 'land_registration_office',
    parentFn: (p) => `Sở Nông nghiệp và Môi trường ${p}`,
  },
  {
    officialNameFn: (p) => `Sở Nông nghiệp và Môi trường ${p}`,
    shortNameFn: (p) => `Sở NN&MT ${stripProvinceWord(p)}`,
    agencyType: 'department_of_agriculture_environment',
    parentFn: (p) => `Uỷ ban Nhân dân ${p}`,
  },
  {
    officialNameFn: (p) => `Uỷ ban Nhân dân ${p}`,
    shortNameFn: (p) => `UBND ${stripProvinceWord(p)}`,
    agencyType: 'province_people_committee',
  },
  {
    officialNameFn: (p) => `Cục Thuế ${p}`,
    shortNameFn: (p) => `Cục Thuế ${stripProvinceWord(p)}`,
    agencyType: 'tax_department',
  },
  {
    officialNameFn: (p) => `Sở Tư pháp ${p}`,
    shortNameFn: (p) => `Sở TP ${stripProvinceWord(p)}`,
    agencyType: 'other',
    parentFn: (p) => `Uỷ ban Nhân dân ${p}`,
  },
  {
    officialNameFn: (p) => `Phòng Công chứng số 1 ${p}`,
    shortNameFn: (p) => `Phòng Công chứng số 1 ${stripProvinceWord(p)}`,
    agencyType: 'notary_office',
    parentFn: (p) => `Sở Tư pháp ${p}`,
  },
];

async function upsertProvinces() {
  const names = Object.keys(VN_WARDS_BY_PROVINCE as Record<string, string[]>).sort((a, b) =>
    a.localeCompare(b, 'vi')
  );
  let created = 0;
  let existed = 0;
  for (const name of names) {
    const code = makeProvinceCode(name);
    const found = await prisma.province.findUnique({ where: { code } });
    if (found) {
      existed++;
      continue;
    }
    await prisma.province.create({
      data: {
        code,
        nameCurrent: name,
        status: 'current',
      },
    });
    created++;
  }
  console.log(`✓ Provinces: ${created} created, ${existed} existed (total ${names.length})`);
}

async function seedAgencies() {
  const provinces = await prisma.province.findMany({ orderBy: { id: 'asc' } });
  console.log(`→ Seeding agencies cho ${provinces.length} tỉnh...`);

  let created = 0;
  let skipped = 0;

  for (const province of provinces) {
    for (const tpl of AGENCY_TEMPLATES) {
      const officialName = tpl.officialNameFn(province.nameCurrent);
      const normalized = normalizeText(officialName);
      const shortName = tpl.shortNameFn ? tpl.shortNameFn(province.nameCurrent) : null;
      const parentAgency = tpl.parentFn ? tpl.parentFn(province.nameCurrent) : null;

      // Check dup: cùng nameNormalized + provinceId
      const existing = await prisma.landAgency.findFirst({
        where: { nameNormalized: normalized, provinceId: province.id },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.landAgency.create({
        data: {
          officialName,
          nameNormalized: normalized,
          shortName,
          provinceId: province.id,
          districtOldId: null,
          agencyType: tpl.agencyType,
          parentAgency,
          status: 'active',
          trustLevel: 'seed_data' as TrustLevel,
          sourceType: 'seed' as SourceType,
          sourceNote: 'Seed data 2026-05-26',
          confirmCount: 0,
        },
      });
      created++;
    }
  }
  console.log(`✓ Agencies: ${created} created, ${skipped} skipped (already existed)`);
}

async function main() {
  console.log('🌱 Seeding Land Agencies...\n');
  await upsertProvinces();
  await seedAgencies();
  console.log('\n✅ Seed agencies completed.');
}

main()
  .catch((err) => {
    console.error('❌ Seed agencies failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
