# Obsidian Plugin

The app's data source is the Obsidian vault. Tasks can be added to the vault using the `TODO` keyword. Tasks can be defined in any md document. The Obsidian plugin simplifies working with tasks.

The plugin is in directory 'obsidian/'.

The right panel contains a view with a list of tasks from the entire vault. The header shows the number of open tasks, and every task shows the note it comes from. Clicking a task opens the document containing it. The UI respects the Obsidian theme in light and dark mode.

```tsquare
board "Tasks" accent=blue
  screen custom "Tasks" width=480 height=480
    stack
      stack row justify=between
        heading "Tasks"
        badge "3"
      text "Describe task list"
      text "Add screen layout in tsquare"
      text "Describe scenarios in DSL"
```

## Scenarios

```gherkin
Feature: Task list view
  As a Lucy user
  I want to see all TODO tasks from the vault in one list
  So that I can track what needs to be done

  Scenario: Show tasks from the whole vault
    Given a note "Ideas.md" contains the line "TODO Describe task list"
    When I open the "Tasks" view
    Then the list shows "Describe task list"

  Scenario: Open the source note from a task
    Given a note "Ideas.md" contains the line "TODO Describe task list"
    When I open the "Tasks" view
    And I click "Describe task list"
    Then the note "Ideas.md" opens in the editor

  Scenario: Show the number of tasks
    Given a note "Ideas.md" contains the line "TODO Describe task list"
    And a note "Journal.md" contains the line "TODO Another task"
    When I open the "Tasks" view
    Then the view shows 2 tasks
```
