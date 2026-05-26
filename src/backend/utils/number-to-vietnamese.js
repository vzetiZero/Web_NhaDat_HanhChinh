// Đổi số tiền (VND) sang chữ tiếng Việt
// Ví dụ: 500000000 -> "Năm trăm triệu đồng chẵn"

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALE = ['', 'nghìn', 'triệu', 'tỷ'];

function readTriple(num, full) {
  const [tram, chuc, donVi] = [
    Math.floor(num / 100),
    Math.floor((num % 100) / 10),
    num % 10,
  ];
  let parts = [];

  if (tram > 0 || full) {
    parts.push(`${DIGITS[tram]} trăm`);
  }

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

function intToVN(n) {
  const num = Math.floor(Number(n));
  if (isNaN(num) || num === 0) return 'không';
  let result = '';
  let groups = [];
  let temp = num;
  while (temp > 0) {
    groups.unshift(temp % 1000);
    temp = Math.floor(temp / 1000);
  }
  for (let i = 0; i < groups.length; i++) {
    const grp = groups[i];
    const scaleIdx = groups.length - 1 - i;
    if (grp > 0) {
      const isFirstGroup = result === '';
      result +=
        (result ? ' ' : '') +
        readTriple(grp, !isFirstGroup) +
        (SCALE[scaleIdx] ? ' ' + SCALE[scaleIdx] : '');
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

export function numberToVietnamese(n) {
  if (n === null || n === undefined || n === '') return '';
  const num = Math.floor(Number(n));
  if (isNaN(num)) return '';
  if (num === 0) return 'Không đồng';
  let r = intToVN(num);
  r = r.charAt(0).toUpperCase() + r.slice(1);
  return r + ' đồng chẵn';
}

/**
 * Diện tích bằng chữ - vd: 1180.4 -> "một nghìn một trăm tám mươi phẩy bốn mét vuông"
 * Hoặc bỏ chữ "mét vuông" nếu unit = ''.
 */
export function areaToVietnamese(n, unit = 'mét vuông') {
  if (n === null || n === undefined || n === '') return '';
  const s = String(n).replace(',', '.');
  const num = Number(s);
  if (isNaN(num)) return '';
  const intPart = Math.floor(num);
  const decStr = s.includes('.') ? s.split('.')[1].replace(/0+$/, '') : '';
  let result = intToVN(intPart);
  if (decStr) {
    const decWords = decStr
      .split('')
      .map((d) => DIGITS[parseInt(d, 10)] || '')
      .join(' ');
    result += ' phẩy ' + decWords;
  }
  if (unit) result += ' ' + unit;
  return result;
}
