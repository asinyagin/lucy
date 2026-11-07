# Obsidian Plugin

TODO Describe how tasks are displayed in the Obsidian plugin

The app's data source is the Obsidian vault. Tasks can be added to the vault using the `TODO` keyword. Tasks can be defined in any md document. The Obsidian plugin simplifies working with tasks.

The right panel contains a view with a list of tasks from the entire vault. Clicking a task opens the document containing it.

```tsquare
board "Tasks" accent=blue
  screen custom "Tasks" width=480 height=640
    stack
      heading "Tasks"
      text "Describe task list"
      text "Add screen layout in tsquare"
      text "Describe scenarios in DSL"
```
