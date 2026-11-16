import { ItemView, MarkdownView, Platform, Plugin, setIcon, TFile, WorkspaceLeaf, WorkspaceMobileDrawer } from 'obsidian';

export const TASKS_VIEW_TYPE = 'lucy-tasks-view';

// Inlined so the styles ship inside the bundle — e2e vaults install only main.js.
const VIEW_CSS = `
.lucy-tasks {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}
.lucy-tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.lucy-tasks-titles {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.lucy-tasks-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-normal);
}
.lucy-tasks-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}
.lucy-tasks-count {
  border-radius: 999px;
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 600;
  color: var(--interactive-accent);
  background: color-mix(in srgb, var(--interactive-accent) 12%, transparent);
}
.lucy-tasks-divider,
.lucy-task-divider {
  height: 1px;
  flex: none;
  background: var(--divider-color);
}
.lucy-task-list {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}
.lucy-task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 2px;
  cursor: pointer;
  border-radius: 6px;
}
.lucy-task:hover {
  background: var(--background-modifier-hover);
}
.lucy-task-texts {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1 1 auto;
  min-width: 0;
}
.lucy-task-heading {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-normal);
}
.lucy-task-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-faint);
}
.lucy-task-note-icon svg {
  width: 11px;
  height: 11px;
}
.lucy-task-chevron {
  display: flex;
  color: var(--text-faint);
}
.lucy-task-chevron svg {
  width: 14px;
  height: 14px;
}
.lucy-tasks-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-faint);
}
.lucy-tasks-footer-icon svg {
  width: 13px;
  height: 13px;
}
`;

interface TaskItem {
  text: string;
  file: string;
  line: number;
  ch: number;
}

function noteName(path: string): string {
  return path.split('/').pop() ?? path;
}

class TasksView extends ItemView {
  private renderQueue: Promise<void> = Promise.resolve();

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    if (!document.head.querySelector('style[data-lucy-tasks]')) {
      const style = document.createElement('style');
      style.setAttribute('data-lucy-tasks', '');
      style.textContent = VIEW_CSS;
      document.head.appendChild(style);
    }
  }

  getViewType(): string {
    return TASKS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Tasks';
  }

  getIcon(): string {
    return 'check-circle';
  }

  async onOpen(): Promise<void> {
    this.registerEvent(this.app.vault.on('create', () => this.queueRender()));
    this.registerEvent(this.app.vault.on('modify', () => this.queueRender()));
    this.registerEvent(this.app.vault.on('delete', () => this.queueRender()));
    this.registerEvent(this.app.vault.on('rename', () => this.queueRender()));
    await this.render();
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }

  private queueRender(): Promise<void> {
    this.renderQueue = this.renderQueue.then(() => this.render());
    return this.renderQueue;
  }

  private async collectTasks(): Promise<TaskItem[]> {
    const tasks: TaskItem[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      for (let line = 0; line < lines.length; line++) {
        const match = lines[line].match(/^TODO\s+(.+)$/);
        if (match) {
          tasks.push({ text: match[1], file: file.path, line, ch: match.index ?? 0 });
        }
      }
    }
    return tasks;
  }

  private async render(): Promise<void> {
    const tasks = await this.collectTasks();
    this.containerEl.empty();
    const root = this.containerEl.createDiv({ cls: 'lucy-tasks' });

    const header = root.createDiv({ cls: 'lucy-tasks-header' });
    const titles = header.createDiv({ cls: 'lucy-tasks-titles' });
    titles.createDiv({ cls: 'lucy-tasks-title', text: 'Tasks' });
    titles.createDiv({ cls: 'lucy-tasks-subtitle', text: 'Every TODO in your vault, in one place' });
    header.createDiv({ cls: 'lucy-tasks-count', text: String(tasks.length) });

    root.createDiv({ cls: 'lucy-tasks-divider' });

    const list = root.createDiv({ cls: 'lucy-task-list' });
    tasks.forEach((task, index) => {
      if (index > 0) list.createDiv({ cls: 'lucy-task-divider' });
      const item = list.createDiv({ cls: 'lucy-task' });
      item.setAttribute('data-task', task.text);
      item.setAttribute('data-file', task.file);
      const texts = item.createDiv({ cls: 'lucy-task-texts' });
      texts.createDiv({ cls: 'lucy-task-heading', text: task.text });
      const note = texts.createDiv({ cls: 'lucy-task-note' });
      setIcon(note.createSpan({ cls: 'lucy-task-note-icon' }), 'file-text');
      note.createSpan({ cls: 'lucy-task-note-name', text: noteName(task.file) });
      setIcon(item.createSpan({ cls: 'lucy-task-chevron' }), 'chevron-right');
      item.addEventListener('click', () => {
        const target = this.app.vault.getAbstractFileByPath(task.file);
        if (!(target instanceof TFile)) return;
        const existing = this.app.workspace
          .getLeavesOfType('markdown')
          .find((leaf) => (leaf.view as MarkdownView).file?.path === task.file);
        const leaf = existing ?? this.app.workspace.getLeaf('tab');
        this.app.workspace.revealLeaf(leaf);
        // On mobile the Tasks view lives in the right drawer, which overlays
        // the editor — collapse it so the opened note is visible.
        if (Platform.isMobile) {
          const drawer = this.app.workspace.rightSplit as WorkspaceMobileDrawer;
          if (!drawer.collapsed) {
            drawer.collapse();
          }
        }
        void leaf.openFile(target).then(() => {
          const view = leaf.view;
          if (view instanceof MarkdownView) {
            view.editor.setCursor({ line: task.line, ch: task.ch });
            // On mobile, focusing the editor raises the software keyboard and can
            // wedge tap handling in the WKWebView during the leaf reveal.
            if (!Platform.isMobile) {
              view.editor.focus();
            }
          }
        });
      });
    });

    const footer = root.createDiv({ cls: 'lucy-tasks-footer' });
    setIcon(footer.createSpan({ cls: 'lucy-tasks-footer-icon' }), 'mouse-pointer-click');
    footer.createSpan({ text: 'Click a task to open the note it lives in' });
  }
}

export default class LucyPlugin extends Plugin {
  async onload() {
    this.registerView(TASKS_VIEW_TYPE, (leaf) => new TasksView(leaf));

    this.addCommand({
      id: 'open-tasks-view',
      name: 'Open tasks view',
      callback: () => this.openTasksView(),
    });

    this.app.workspace.onLayoutReady(() => {
      // On mobile, revealing the view would pop the drawer open on every
      // launch — there the view is opened on demand via the command.
      if (Platform.isMobile) {
        return;
      }
      const existing = this.app.workspace.getLeavesOfType(TASKS_VIEW_TYPE);
      if (existing.length > 0) {
        this.app.workspace.revealLeaf(existing[0]);
        return;
      }
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        void leaf.setViewState({ type: TASKS_VIEW_TYPE, active: true });
      }
    });
  }

  private openTasksView(): void {
    const existing = this.app.workspace.getLeavesOfType(TASKS_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('tab');
    void leaf.setViewState({ type: TASKS_VIEW_TYPE, active: true }).then(() => {
      this.app.workspace.revealLeaf(leaf);
    });
  }

  async onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(TASKS_VIEW_TYPE)) {
      leaf.detach();
    }
  }
}
