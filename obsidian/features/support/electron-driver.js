const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const OBSIDIAN_BINARY = '/Applications/Obsidian.app/Contents/MacOS/Obsidian';

let proc;
let browser;
let page;
let vaultDir;
let profileDir;

async function launch() {
  if (!fs.existsSync(OBSIDIAN_BINARY)) {
    throw new Error(`Obsidian binary not found at ${OBSIDIAN_BINARY}`);
  }

  vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lucy-ui-vault-'));
  profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lucy-obsidian-profile-'));

  // install the freshly built plugin into the test vault
  const pluginDir = path.join(vaultDir, '.obsidian', 'plugins', 'lucy');
  fs.mkdirSync(pluginDir, { recursive: true });
  const repoPluginDir = path.resolve(__dirname, '..', '..');
  for (const file of ['main.js', 'manifest.json']) {
    fs.copyFileSync(path.join(repoPluginDir, file), path.join(pluginDir, file));
  }
  fs.writeFileSync(
    path.join(vaultDir, '.obsidian', 'community-plugins.json'),
    JSON.stringify(['lucy'])
  );

  // restore the vault window directly on launch
  fs.writeFileSync(
    path.join(profileDir, 'obsidian.json'),
    JSON.stringify({ vaults: { 'lucy-test': { path: vaultDir, ts: Date.now(), open: true } } })
  );

  proc = spawn(
    OBSIDIAN_BINARY,
    [`--user-data-dir=${profileDir}`, '--remote-debugging-port=0'],
    { stdio: 'ignore' }
  );

  const port = await waitForDebuggingPort(profileDir);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 30000 });
  page = await waitForVaultPage(browser);

  await page.waitForFunction(() => window.app && window.app.workspace, null, { timeout: 30000 });
  await ensurePluginLoaded();
}

async function waitForDebuggingPort(profile) {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(portFile)) {
      return fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
    }
    if (proc.exitCode !== null) {
      throw new Error(`Obsidian exited early with code ${proc.exitCode}`);
    }
    await sleep(200);
  }
  throw new Error('Timed out waiting for Obsidian DevToolsActivePort');
}

async function waitForVaultPage(browser) {
  for (let i = 0; i < 150; i++) {
    for (const context of browser.contexts()) {
      const vaultPage = context.pages().find((p) => p.url().includes('index.html'));
      if (vaultPage) return vaultPage;
    }
    await sleep(200);
  }
  throw new Error('Timed out waiting for the Obsidian vault window');
}

async function ensurePluginLoaded() {
  const state = await page.evaluate(async () => {
    const pm = window.app.plugins;
    if (pm.getPlugin('lucy')) return 'loaded';
    // fresh test vaults start in restricted mode; enable community plugins programmatically
    if (typeof pm.setEnable === 'function') {
      pm.setEnable(true);
      return 'enabled';
    }
    return 'no-api';
  });
  if (state === 'loaded') return;
  if (state === 'no-api') {
    throw new Error('Cannot enable community plugins: PluginManager.setEnable not found');
  }
  await page
    .waitForFunction(() => Boolean(window.app.plugins.getPlugin('lucy')), null, { timeout: 10000 })
    .catch(() => {
      throw new Error('Lucy plugin did not load after enabling community plugins');
    });
}

async function quit() {
  if (browser) await browser.close().catch(() => {});
  if (proc && proc.exitCode === null) {
    proc.kill('SIGKILL');
  }
  proc = null;
  browser = null;
  page = null;
  if (vaultDir) fs.rmSync(vaultDir, { recursive: true, force: true });
  if (profileDir) fs.rmSync(profileDir, { recursive: true, force: true });
}

const driver = {
  async start(world) {
    await page.evaluate(async () => {
      const obsidian = window.app;
      for (const file of obsidian.vault.getFiles()) await obsidian.vault.delete(file);
    });
    world.tasks = [];
    world.openedNote = null;
  },
  async stop() {},

  async createNote(world, fileName, line) {
    await writeNote(fileName, `# ${fileName}\n\n${line}\n`);
  },

  async createNoteWithLines(world, fileName, count, givenLines) {
    if (givenLines.length > count) {
      throw new Error(
        `cannot fit ${givenLines.length} given lines into a note with ${count} lines`
      );
    }
    const lines = Array.from({ length: count - givenLines.length }, (_, i) => randomLine(i));
    for (const line of givenLines) {
      lines.splice(Math.floor(Math.random() * (lines.length + 1)), 0, line);
    }
    await writeNote(fileName, `# ${fileName}\n\n${lines.join('\n')}\n`);
  },

  async openTasksView(world) {
    const opened = await page.evaluate(async () => {
      const obsidian = window.app;
      const leaves = obsidian.workspace.getLeavesOfType('lucy-tasks-view');
      if (!leaves.length) return false;
      obsidian.workspace.revealLeaf(leaves[0]);
      return true;
    });
    if (!opened) {
      throw new Error('The Lucy plugin does not register a "lucy-tasks-view" view yet — implement the Tasks view to make this step pass');
    }
    world.tasks = await page.evaluate(() => {
      const leaf = window.app.workspace.getLeavesOfType('lucy-tasks-view')[0];
      return [...leaf.view.containerEl.querySelectorAll('.lucy-task')].map((el) => ({
        text: el.getAttribute('data-task'),
        file: el.getAttribute('data-file'),
      }));
    });
  },

  async clickTask(world, text) {
    const clicked = await page.evaluate(async (taskText) => {
      const leaf = window.app.workspace.getLeavesOfType('lucy-tasks-view')[0];
      if (!leaf) return 'no-view';
      const el = [...leaf.view.containerEl.querySelectorAll('.lucy-task')]
        .find((n) => n.getAttribute('data-task') === taskText);
      if (!el) return 'no-task';
      el.click();
      return 'ok';
    }, text);
    if (clicked === 'no-view') throw new Error('Tasks view is not open — cannot click');
    if (clicked === 'no-task') throw new Error(`no task ${JSON.stringify(text)} in the view`);
    await sleep(300);
    world.openedNote = await page.evaluate(() => {
      const file = window.app.workspace.getActiveFile();
      return file ? file.path : null;
    });
  },

  openedNote(world) {
    return world.openedNote;
  },

  async caretPosition(world) {
    return page.evaluate(() => {
      const view = window.app.workspace.activeLeaf?.view;
      if (!view || typeof view.editor?.getCursor !== 'function') return null;
      const cursor = view.editor.getCursor();
      return { line: cursor.line, ch: cursor.ch };
    });
  },

  async findTodoPosition(world, fileName, taskText) {
    return page.evaluate(async ({ fileName, taskText }) => {
      const app = window.app;
      const file = app.vault.getAbstractFileByPath(fileName);
      if (!file) return null;
      const lines = (await app.vault.read(file)).split('\n');
      for (let line = 0; line < lines.length; line++) {
        const match = lines[line].match(/^TODO\s+(.+)$/);
        if (match && match[1] === taskText) {
          return { line, ch: match.index ?? 0 };
        }
      }
      return null;
    }, { fileName, taskText });
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FILLER_WORDS = [
  'apple', 'bridge', 'candle', 'drift', 'ember', 'forest', 'garden', 'harbor',
  'island', 'jungle', 'kettle', 'ladder', 'meadow', 'needle', 'orchard', 'pebble',
  'quilt', 'river', 'sunset', 'thicket', 'umbrella', 'valley', 'willow', 'yarn',
];

function randomLine(index) {
  const words = Array.from(
    { length: 3 + Math.floor(Math.random() * 4) },
    () => FILLER_WORDS[Math.floor(Math.random() * FILLER_WORDS.length)]
  );
  return `Note ${index + 1}: ${words.join(' ')}`;
}

async function writeNote(fileName, content) {
  await page.evaluate(async ({ fileName, content }) => {
    const obsidian = window.app;
    const dir = fileName.includes('/') ? fileName.slice(0, fileName.lastIndexOf('/')) : null;
    if (dir) await obsidian.vault.createFolder(dir).catch(() => {});
    await obsidian.vault.create(fileName, content);
  }, { fileName, content });
  await page.waitForFunction(
    (name) => window.app.metadataCache.getCache(name) !== null,
    fileName,
    { timeout: 10000 }
  );
}

module.exports = { launch, quit, driver };
