import { ItemView, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

export const TASKS_VIEW_TYPE = 'lucy-tasks-view';

interface TaskItem {
  text: string;
  file: string;
}

class TasksView extends ItemView {
  private renderQueue: Promise<void> = Promise.resolve();

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
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
      for (const line of content.split('\n')) {
        const match = line.match(/^TODO\s+(.+)$/);
        if (match) tasks.push({ text: match[1], file: file.path });
      }
    }
    return tasks;
  }

  private async render(): Promise<void> {
    const tasks = await this.collectTasks();
    this.containerEl.empty();
    const list = this.containerEl.createDiv({ cls: 'lucy-task-list' });
    for (const task of tasks) {
      const item = list.createDiv({ cls: 'lucy-task' });
      item.setAttribute('data-task', task.text);
      item.setAttribute('data-file', task.file);
      item.setText(task.text);
      item.addEventListener('click', () => {
        const target = this.app.vault.getAbstractFileByPath(task.file);
        if (target instanceof TFile) {
          void this.app.workspace.getLeaf('tab').openFile(target);
        }
      });
    }
  }
}

export default class LucyPlugin extends Plugin {
  async onload() {
    this.registerView(TASKS_VIEW_TYPE, (leaf) => new TasksView(leaf));

    this.app.workspace.onLayoutReady(() => {
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        void leaf.setViewState({ type: TASKS_VIEW_TYPE, active: true });
      }
    });
  }
}
