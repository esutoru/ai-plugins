# esutoru-wordmine

Esutoru Wordmine plugin for Claude Code and Codex. Work in progress.

## Skills

| Skill | Description |
|-------|-------------|
| `setup-esutoru-wordmine-plugin` | One-time first setup of the plugin. Run it once after installing. Placeholder, does nothing yet. |

## Install

```bash
# Claude Code
claude plugin marketplace add esutoru/ai-plugins
claude plugin install esutoru-wordmine@ai-plugins

# Codex
codex plugin marketplace add esutoru/ai-plugins
```

Then run the setup skill once:

```
/esutoru-wordmine:setup-esutoru-wordmine-plugin
```
