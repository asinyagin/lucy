const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');

Given('a note {string} contains the line {string}', async function (fileName, line) {
  await this.driver.createNote(this, fileName, line);
});

When('I open the {string} view', async function (viewName) {
  assert.equal(viewName, 'Tasks');
  await this.driver.openTasksView(this);
});

Then('the list shows {string}', function (text) {
  assert.ok(
    this.tasks.some((t) => t.text === text),
    `expected task list to show ${JSON.stringify(text)}, got ${JSON.stringify(this.tasks.map((t) => t.text))}`
  );
});

Then('the view shows {int} tasks', function (count) {
  assert.equal(
    this.tasks.length,
    count,
    `expected ${count} tasks, got ${JSON.stringify(this.tasks.map((t) => t.text))}`
  );
});

When('I click {string}', async function (text) {
  await this.driver.clickTask(this, text);
});

Then('the note {string} opens in the editor', function (fileName) {
  assert.equal(this.driver.openedNote(this), fileName);
});
