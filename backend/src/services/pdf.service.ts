// PDF service - render HTML → PDF dùng Puppeteer
// Singleton browser instance để tránh chi phí khởi tạo mỗi lần

import puppeteer, { Browser } from 'puppeteer';
import { logger } from '@/lib/logger';

class PdfService {
  private browser: Browser | null = null;
  private starting: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) return this.browser;
    if (this.starting) return this.starting;
    this.starting = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
    this.browser = await this.starting;
    this.starting = null;
    this.browser.on('disconnected', () => {
      logger.warn('[pdf] Puppeteer browser disconnected');
      this.browser = null;
    });
    return this.browser;
  }

  /**
   * Render HTML → PDF buffer (A4)
   */
  async renderFromHtml(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => {});
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const pdfService = new PdfService();
