import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

type RenderFn = (...args: unknown[]) => string;

interface FrontendModule {
  [key: string]: RenderFn;
}

const router = Router();
const nativeImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<FrontendModule>;

function findRepoRoot(): string {
  const candidates = [
    path.resolve(__dirname, '..', 'web'),
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(__dirname, '..', '..', '..'),
    path.resolve(__dirname, '..', '..', '..', '..'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'src', 'frontend', 'pages', 'home.js'))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), '..');
}

const repoRoot = findRepoRoot();

function frontendEnv() {
  return {
    ...process.env,
    SITE_NAME: process.env.SITE_NAME || 'Chứng Từ Nhà Đất',
    SITE_DESC:
      process.env.SITE_DESC ||
      'Tạo hợp đồng tặng quyền sử dụng đất nhanh chóng, đúng quy định',
  };
}

async function importRootModule(relativePath: string): Promise<FrontendModule> {
  const fullPath = path.join(repoRoot, relativePath);
  return nativeImport(pathToFileURL(fullPath).href);
}

function html(res: Response, content: string, status = 200) {
  res.status(status).type('html').send(content);
}

function page(
  importer: (req: Request) => Promise<string>,
  status = 200
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    try {
      html(res, await importer(req), status);
    } catch (err) {
      next(err);
    }
  };
}

async function renderHome() {
  const mod = await importRootModule('src/frontend/pages/home.js');
  return mod.renderHomePage(frontendEnv());
}

router.get(
  ['/', '/trang-chu'],
  page(async () => renderHome())
);

router.get(
  '/dang-nhap',
  page(async () => {
    const mod = await importRootModule('src/frontend/pages/login.js');
    return mod.renderLoginPage(frontendEnv());
  })
);

router.get(
  '/dang-ky',
  page(async () => {
    const mod = await importRootModule('src/frontend/pages/register.js');
    return mod.renderRegisterPage(frontendEnv());
  })
);

router.get(
  '/bang-dieu-khien',
  page(async () => {
    const mod = await importRootModule('src/frontend/pages/dashboard.js');
    return mod.renderDashboardPage(frontendEnv());
  })
);

router.get(
  '/hop-dong/moi',
  page(async () => {
    const mod = await importRootModule('src/frontend/pages/contract-new.js');
    return mod.renderContractNewPage(frontendEnv());
  })
);

router.get(
  '/hop-dong/:id/xem',
  page(async (req) => {
    const mod = await importRootModule('src/frontend/pages/contract-preview.js');
    return mod.renderContractPreviewPage(frontendEnv(), req.params.id);
  })
);

router.get(
  '/hop-dong/:id',
  page(async (req) => {
    const mod = await importRootModule('src/frontend/pages/contract-detail.js');
    return mod.renderContractDetailPage(frontendEnv(), req.params.id);
  })
);

router.get(
  ['/admin', '/admin/*'],
  page(async () => {
    const mod = await importRootModule('src/admin/layout.js');
    return mod.renderAdminLayout(frontendEnv());
  })
);

export const frontendRouter = router;
