# ai-plugins

Marketplace of [Esutoru](https://github.com/esutoru) plugins for [Claude Code](https://code.claude.com/docs/en/plugins) and [Codex](https://developers.openai.com/codex).

## Plugins

| Plugin | Description | Docs |
|--------|-------------|------|
| `esutoru-wordmine` | Anki cards via AnkiConnect (work in progress). `setup-esutoru-wordmine-plugin` verifies Anki, AnkiConnect, the deck, the note type and the languages; `prepare-words` collects words from the conversation into a reviewed set; `add-to-anki` creates the cards. | [plugins/wordmine/README.md](plugins/wordmine/README.md) |

## Add the marketplace

```bash
# Claude Code
claude plugin marketplace add esutoru/ai-plugins
claude plugin install esutoru-wordmine@ai-plugins

# Codex
codex plugin marketplace add esutoru/ai-plugins
```

In Codex, after the marketplace is added, the plugins show up in the plugin browser (`/plugins`) and can be installed from there.

## Layout

```
.claude-plugin/marketplace.json   # Claude Code marketplace manifest
.agents/plugins/marketplace.json  # Codex marketplace manifest
plugins/<dir>/
  .claude-plugin/plugin.json      # Claude Code plugin manifest
  .codex-plugin/plugin.json       # Codex plugin manifest
  skills/<skill>/SKILL.md         # skills shared by both tools
  references/<topic>.md           # procedures shared by the plugin's skills
  README.md
```
