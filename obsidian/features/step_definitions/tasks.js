const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');

Given('a note {string} contains the line {string}', async function (fileName, line) {
  await this.driver.createNote(this, fileName, line);
});

Given(
  'a note {string} contains {int} lines with the following lines among them:',
  async function (fileName, count, dataTable) {
    const lines = dataTable.raw().map((row) => row[0]);
    await this.driver.createNoteWithLines(this, fileName, count, lines);
  }
);

When('I open the {string} view', async function (viewName) {
  assert.equal(viewName, 'Tasks');
  await this.driver.openTasksView(this);
});

Then('the list shows the following tasks:', function (dataTable) {
  const expected = dataTable.raw().map((row) => row[0]);
  const actual = this.tasks.map((t) => t.text);
  assert.deepEqual(
    [...actual].sort(),
    [...expected].sort(),
    `expected task list to show exactly ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
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
