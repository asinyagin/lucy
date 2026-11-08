const { setWorldConstructor, Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const electron = require('./electron-driver');

BeforeAll({ timeout: 120000 }, electron.launch);
AfterAll({ timeout: 30000 }, electron.quit);

class TasksWorld {
  constructor() {
    this.driver = electron.driver;
    this.tasks = [];
    this.openedNote = null;
  }
}

setWorldConstructor(TasksWorld);

Before(async function () {
  await this.driver.start(this);
});

After(async function () {
  await this.driver.stop(this);
});
