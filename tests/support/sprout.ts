import { _electron as electron, test as base, type ElectronApplication, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export { expect } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** The packaged app to test: SPROUT_EXE if set (e.g. the installer build's win-unpacked), else npm run package:desktop's. */
const PACKAGED_EXE = process.env.SPROUT_EXE ?? path.join(ROOT, 'release', 'Sprout Studio-win32-x64', 'Sprout Studio.exe');

interface SproutOptions {
  /** Notes to put in the vault before the app starts: { name: markdown }. */
  notes: Record<string, string>;
  /** Run release/…/Sprout Studio.exe instead of the source (the `packaged` project sets this). */
  packaged: boolean;
}

export interface Sprout {
  app: ElectronApplication;
  page: Page;
  userData: string;
  vault: string;
  /** Closes the app and opens it again on the same data, like quitting and relaunching. */
  restart(): Promise<void>;
  /** A note's file contents, or null if there's no such file. */
  readNote(name: string): string | null;
  /** Runs a query against the app's SQLite database (opened read-only). */
  query<T = Record<string, unknown>>(sql: string, ...params: (string | number)[]): T[];
  /** Clicks a ribbon tab by its label. */
  openTab(label: string): Promise<void>;
  /** Does `action`, catches the file it downloads, and returns where it was saved. */
  download(action: () => Promise<void>): Promise<string>;
}

/** Ends an app and all its helper processes, so none are left running to hold up later tests. */
function killTree(pid: number | undefined) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-pid, 'SIGKILL');
  } catch {
    // Already gone.
  }
}

/**
 * Starts the app. On rare occasions (about 1 launch in 100) Windows closes the very
 * first window before the page has loaded; one more try handles that. A crash on
 * the second try still fails the test.
 */
async function launch(userData: string, packaged: boolean) {
  try {
    return await launchOnce(userData, packaged);
  } catch (error) {
    if (!String(error).includes('has been closed')) throw error;
    return launchOnce(userData, packaged);
  }
}

async function launchOnce(userData: string, packaged: boolean) {
  const env = { ...process.env, SPROUT_USER_DATA: userData } as Record<string, string>;
  // Set by VS Code's terminal; it would make Electron behave like plain Node.
  delete env.ELECTRON_RUN_AS_NODE;
  const app = packaged
    ? await electron.launch({ executablePath: PACKAGED_EXE, args: [], env })
    : await electron.launch({ args: [ROOT], cwd: ROOT, env });
  const page = await app.firstWindow();
  await page.waitForSelector('.ribbon');
  return { app, page };
}

export const test = base.extend<SproutOptions & { sprout: Sprout }>({
  notes: [{}, { option: true }],
  packaged: [false, { option: true }],

  sprout: async ({ notes, packaged }, use, testInfo) => {
    const profile = testInfo.outputPath('profile');
    const userData = path.join(profile, 'userData');
    const vault = path.join(profile, 'vault');
    const downloads = path.join(profile, 'downloads');
    for (const folder of [userData, vault, downloads]) fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ vault }));
    for (const [name, body] of Object.entries(notes)) fs.writeFileSync(path.join(vault, `${name}.md`), body);

    let { app, page } = await launch(userData, packaged);
    let downloadCount = 0;

    const sprout: Sprout = {
      get app() {
        return app;
      },
      get page() {
        return page;
      },
      userData,
      vault,
      async restart() {
        await app.close();
        ({ app, page } = await launch(userData, packaged));
      },
      readNote(name) {
        const file = path.join(vault, `${name}.md`);
        return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      },
      query(sql, ...params) {
        const db = new DatabaseSync(path.join(userData, 'sprout-studio.db'), { readOnly: true });
        try {
          return db.prepare(sql).all(...params) as never;
        } finally {
          db.close();
        }
      },
      async openTab(label) {
        await page.locator('.ribbon').getByRole('tab', { name: label, exact: true }).click();
      },
      async download(action) {
        const target = path.join(downloads, `download-${++downloadCount}`);
        const saved = app.evaluate(
          ({ session }, savePath) =>
            new Promise<string>((resolve, reject) => {
              session.defaultSession.once('will-download', (_event, item) => {
                const file = `${savePath}-${item.getFilename()}`;
                item.setSavePath(file);
                item.once('done', (_done, state) => (state === 'completed' ? resolve(file) : reject(new Error(state))));
              });
            }),
          target,
        );
        await action();
        return saved;
      },
    };

    await use(sprout);
    // Close normally, but don't let a stuck app hold up the whole run.
    const closed = app.close().catch(() => {});
    const gaveUp = new Promise<'stuck'>((resolve) => setTimeout(() => resolve('stuck'), 10_000));
    if ((await Promise.race([closed, gaveUp])) === 'stuck') killTree(app.process().pid);
  },
});
