# Obsidian Plugin

The app's data source is the Obsidian vault. Tasks can be added to the vault using the `TODO` keyword. Tasks can be defined in any md document. The Obsidian plugin simplifies working with tasks.

The plugin is in directory `obsidian/`.

The right panel contains a view with a list of tasks from the entire vault. The header shows the number of open tasks, and every task shows the note it comes from. Clicking a task opens the document containing it. The UI respects the Obsidian theme in light and dark mode.

The plugin registers an **Open tasks view** command in the command palette. It reveals the Tasks view, opening it if it is not open yet — on mobile, where Obsidian has no right panel, the command is the way to open the view.

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
    Given a note "Ideas.md" contains 30 lines with the following lines among them:
      | TODO Describe task list      |
      | TODO Implement number of tasks |
    And a note "Journal.md" contains 20 lines with the following lines among them:
      | TODO Another task |
    When I open the "Tasks" view
    Then the list shows the following tasks:
      | Describe task list        |
      | Implement number of tasks |
      | Another task              |
    And the view shows 3 tasks

  Scenario: Open the source note from a task
    Given a note "Ideas.md" contains 30 lines with the following lines among them:
      | TODO Describe task list      |
      | TODO Implement number of tasks |
    When I open the "Tasks" view
    And I click "Describe task list"
    Then the note "Ideas.md" opens in the editor
    And the caret is at the TODO for "Describe task list"

  Scenario: Focus the note when it is already open
    Given a note "Ideas.md" contains 30 lines with the following lines among them:
      | TODO Describe task list |
    And the note "Ideas.md" is open in the editor
    When I open the "Tasks" view
    And I click "Describe task list"
    Then only the note "Ideas.md" is open in the editor
    And the caret is at the TODO for "Describe task list"

  Scenario: Open the Tasks view with the command
    When I run the "Open tasks view" command
    Then the "Tasks" view is open
```
