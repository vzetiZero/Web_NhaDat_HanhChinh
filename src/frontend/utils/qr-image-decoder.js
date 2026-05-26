// QR image decoder pipeline cho CCCD
// - Resize ảnh về maxSide 1800 (cân bằng tốc độ vs độ chính xác)
// - Thử BarcodeDetector (Chrome/Edge), fallback sang jsQR
// - Thử xoay 0/90/180/270 độ
// - Thử crop 5 vùng (4 góc + center) vì QR thường nằm góc dưới phải/trái
// - Thử grayscale + binarize nếu các bước trên fail
//
// Trả về string raw QR (chưa parse) hoặc null.

export function qrImageDecoderJs() {
  return `
const MAX_SIDE = 1800;
const ROTATIONS = [0, 90, 180, 270];

/**
 * Decode QR từ HTMLImageElement, HTMLCanvasElement, hoặc ImageBitmap.
 * Return: { text: string, source: string } | null
 */
window.decodeQrFromImage = async function(imgOrCanvas) {
  if (!imgOrCanvas) return null;

  // Đảm bảo có canvas
  const baseCanvas = await toCanvas(imgOrCanvas, MAX_SIDE);

  // 1. Try BarcodeDetector trên ảnh gốc (nhanh nhất)
  let result = await tryBarcodeDetector(baseCanvas);
  if (result) return { text: result, source: 'BarcodeDetector' };

  // 2. Try jsQR
  result = await tryJsQR(baseCanvas);
  if (result) return { text: result, source: 'jsQR' };

  // 3. Try rotations 90/180/270
  for (const deg of [90, 180, 270]) {
    const rotated = rotateCanvas(baseCanvas, deg);
    result = await tryBarcodeDetector(rotated);
    if (result) return { text: result, source: 'BarcodeDetector+rot' + deg };
    result = await tryJsQR(rotated);
    if (result) return { text: result, source: 'jsQR+rot' + deg };
  }

  // 4. Try crops (4 góc + center): mỗi crop có thể chứa QR
  const cropRegions = buildCropRegions(baseCanvas);
  for (const region of cropRegions) {
    const cropped = cropCanvas(baseCanvas, region);
    result = await tryBarcodeDetector(cropped);
    if (result) return { text: result, source: 'BarcodeDetector+crop' };
    result = await tryJsQR(cropped);
    if (result) return { text: result, source: 'jsQR+crop' };
  }

  // 5. Tăng contrast (grayscale + binarize Otsu-like)
  const binarized = binarizeCanvas(baseCanvas);
  result = await tryBarcodeDetector(binarized);
  if (result) return { text: result, source: 'BarcodeDetector+binarize' };
  result = await tryJsQR(binarized);
  if (result) return { text: result, source: 'jsQR+binarize' };

  // 6. Cuối cùng: rotate + binarize
  for (const deg of [90, 180, 270]) {
    const rotBin = rotateCanvas(binarized, deg);
    result = await tryJsQR(rotBin);
    if (result) return { text: result, source: 'jsQR+binarize+rot' + deg };
  }

  return null;
};

/**
 * Decode QR từ frame video (camera live).
 * Gọi liên tục bởi requestAnimationFrame ở caller.
 */
window.decodeQrFromVideo = async function(video) {
  if (!video || video.readyState < 2) return null;
  const canvas = document.createElement('canvas');
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) return null;
  // Camera: dùng độ phân giải gốc, không resize để giảm latency
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, w, h);

  // Try BarcodeDetector first (rất nhanh nếu hỗ trợ)
  let text = await tryBarcodeDetector(canvas);
  if (text) return { text, source: 'BarcodeDetector' };
  // Fallback jsQR
  text = await tryJsQR(canvas);
  if (text) return { text, source: 'jsQR' };
  return null;
};

// ============ Helpers ============

async function toCanvas(src, maxSide) {
  let w, h;
  if (src instanceof HTMLImageElement) {
    w = src.naturalWidth; h = src.naturalHeight;
  } else if (src instanceof HTMLCanvasElement) {
    return resizeCanvasIfNeeded(src, maxSide);
  } else if (src instanceof ImageBitmap) {
    w = src.width; h = src.height;
  } else if (src instanceof Blob || src instanceof File) {
    const img = await blobToImage(src);
    return toCanvas(img, maxSide);
  } else {
    return null;
  }
  let scale = 1;
  if (Math.max(w, h) > maxSide) scale = maxSide / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function resizeCanvasIfNeeded(canvas, maxSide) {
  const m = Math.max(canvas.width, canvas.height);
  if (m <= maxSide) return canvas;
  const scale = maxSide / m;
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

let _bdCache = null;
function getBarcodeDetector() {
  if (_bdCache !== null) return _bdCache;
  if (typeof window.BarcodeDetector === 'undefined') {
    _bdCache = false;
    return false;
  }
  try {
    _bdCache = new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    _bdCache = false;
  }
  return _bdCache;
}

async function tryBarcodeDetector(canvas) {
  const bd = getBarcodeDetector();
  if (!bd) return null;
  try {
    const codes = await bd.detect(canvas);
    if (codes && codes.length > 0 && codes[0].rawValue) {
      return codes[0].rawValue;
    }
  } catch {}
  return null;
}

async function tryJsQR(canvas) {
  if (typeof window.jsQR !== 'function') {
    // Lazy load từ CDN nếu chưa có
    await loadJsQR();
  }
  if (typeof window.jsQR !== 'function') return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  try {
    const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data) return code.data;
  } catch {}
  return null;
}

let _jsQRLoading = null;
function loadJsQR() {
  if (typeof window.jsQR === 'function') return Promise.resolve();
  if (_jsQRLoading) return _jsQRLoading;
  _jsQRLoading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    s.onload = resolve;
    s.onerror = resolve;
    document.head.appendChild(s);
  });
  return _jsQRLoading;
}

function rotateCanvas(canvas, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const w = canvas.width, h = canvas.height;
  const out = document.createElement('canvas');
  if (degrees === 90 || degrees === 270) {
    out.width = h; out.height = w;
  } else {
    out.width = w; out.height = h;
  }
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(canvas, -w / 2, -h / 2);
  return out;
}

function buildCropRegions(canvas) {
  // 5 vùng: 4 góc + center, mỗi vùng = 60% kích thước ảnh
  const w = canvas.width, h = canvas.height;
  const cw = Math.round(w * 0.6);
  const ch = Math.round(h * 0.6);
  return [
    { x: 0, y: 0, w: cw, h: ch },                       // top-left
    { x: w - cw, y: 0, w: cw, h: ch },                  // top-right
    { x: 0, y: h - ch, w: cw, h: ch },                  // bottom-left
    { x: w - cw, y: h - ch, w: cw, h: ch },             // bottom-right
    { x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: cw, h: ch }, // center
  ];
}

function cropCanvas(canvas, region) {
  const out = document.createElement('canvas');
  out.width = region.w;
  out.height = region.h;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
  return out;
}

function binarizeCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return canvas;
  }
  const data = imageData.data;
  // Tính ngưỡng trung bình (Otsu đơn giản hóa: dùng mean)
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    sum += gray;
  }
  const threshold = sum / (data.length / 4);

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const v = gray > threshold ? 255 : 0;
    data[i] = v; data[i + 1] = v; data[i + 2] = v;
  }
  const out = document.createElement('canvas');
  out.width = canvas.width; out.height = canvas.height;
  const octx = out.getContext('2d', { willReadFrequently: true });
  octx.putImageData(imageData, 0, 0);
  return out;
}
`;
}
