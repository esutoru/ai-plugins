# ai-plugins

Marketplace of [Esutoru](https://github.com/esutoru) plugins for [Claude Code](https://code.claude.com/docs/en/plugins) and [Codex](https://developers.openai.com/codex).

## Plugins

| Plugin | Description | Docs |
|--------|-------------|------|
| `esutoru-wordmine` | Esutoru Wordmine plugin (work in progress). Ships the one-time `setup-esutoru-wordmine-plugin` skill stub. | [plugins/wordmine/README.md](plugins/wordmine/README.md) |

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
  README.md
```
