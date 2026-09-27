# esutoru-wordmine

Esutoru Wordmine plugin for Claude Code and Codex. Work in progress.

Wordmine turns words and phrases into Anki cards. The cards are created in your Anki collection through the AnkiConnect add-on.

## Install

```bash
# Claude Code
claude plugin marketplace add esutoru/ai-plugins
claude plugin install esutoru-wordmine@ai-plugins

# Codex
codex plugin marketplace add esutoru/ai-plugins
```

## Setup

Run the setup skill once after installing the plugin and follow its instructions:

```
/esutoru-wordmine:setup-esutoru-wordmine-plugin
```

It checks everything Wordmine needs (Anki, the AnkiConnect add-on, the deck for new cards, the Wordmine note type), asks only for what is still missing, offers to create the deck and the note type in Anki with your permission, tells you what to install or open, and checks again. You can run it as many times as you like, for example if card creation stops working.

Your choices are saved in `~/.config/esutoru-wordmine/config.json`. Edit that file and run the setup again to change the default deck or the note type name.

## Skills

| Skill | Description |
|-------|-------------|
| `setup-esutoru-wordmine-plugin` | One-time setup. Verifies Anki, AnkiConnect and the Wordmine note type, guiding you through fixes. Run it once after installing and again if card creation starts failing. |
