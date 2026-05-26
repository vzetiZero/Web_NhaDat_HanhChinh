// Đổi số tiền / diện tích sang chữ tiếng Việt
// Port từ CF Workers version, không có thay đổi logic

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALE = ['', 'nghìn', 'triệu', 'tỷ'];

function readTriple(num: number, full: boolean): string {
  const tram = Math.floor(num / 100);
  const chuc = Math.floor((num % 100) / 10);
  const donVi = num % 10;
  const parts: string[] = [];

  if (tram > 0 || full) parts.push(`${DIGITS[tram]} trăm`);
  if (chuc === 0) {
    if (donVi > 0) {
      if (tram > 0 || full) parts.push('lẻ');
      parts.push(DIGITS[donVi]);
    }
  } else if (chuc === 1) {
    parts.push('mười');
    if (donVi === 5) parts.push('lăm');
    else if (donVi > 0) parts.push(DIGITS[donVi]);
  } else {
    parts.push(`${DIGITS[chuc]} mươi`);
    if (donVi === 1) parts.push('mốt');
    else if (donVi === 5) parts.push('lăm');
    else if (donVi > 0) parts.push(DIGITS[donVi]);
  }
  return parts.join(' ');
}

function intToVN(n: number): string {
  const num = Math.floor(Number(n));
  if (isNaN(num) || num === 0) return 'không';
  let result = '';
  const groups: number[] = [];
  let temp = num;
  while (temp > 0) {
    groups.unshift(temp % 1000);
    temp = Math.floor(temp / 1000);
  }
  for (let i = 0; i < groups.length; i++) {
    const grp = groups[i];
    const scaleIdx = groups.length - 1 - i;
    if (grp > 0) {
      const isFirst = result === '';
      result +=
        (result ? ' ' : '') +
        readTriple(grp, !isFirst) +
        (SCALE[scaleIdx] ? ' ' + SCALE[scaleIdx] : '');
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

export function numberToVietnamese(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  const num = Math.floor(Number(n));
  if (isNaN(num)) return '';
  if (num === 0) return 'Không đồng';
  const r = intToVN(num);
  return r.charAt(0).toUpperCase() + r.slice(1) + ' đồng chẵn';
}

export function areaToVietnamese(n: number | string | null | undefined, unit = 'mét vuông'): string {
  if (n === null || n === undefined || n === '') return '';
  const s = String(n).replace(',', '.');
  const num = Number(s);
  if (isNaN(num)) return '';
  const intPart = Math.floor(num);
  const decStr = s.includes('.') ? s.split('.')[1].replace(/0+$/, '') : '';
  let result = intToVN(intPart);
  if (decStr) {
    result += ' phẩy ' + decStr.split('').map((d) => DIGITS[parseInt(d, 10)] || '').join(' ');
  }
  if (unit) result += ' ' + unit;
  return result;
}
