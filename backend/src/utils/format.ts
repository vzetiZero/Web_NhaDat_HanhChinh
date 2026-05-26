// Format utilities

export function formatDateVN(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return String(input);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatVND(n: number | string | null | undefined): string {
  const num = Number(n);
  if (isNaN(num)) return String(n ?? '');
  return num.toLocaleString('vi-VN');
}

export function slugify(s: string): string {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function generateContractNumber(prefix: string, sequence: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `${String(sequence).padStart(3, '0')}/${prefix}/${y}`;
}
