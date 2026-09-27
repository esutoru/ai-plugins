# AGENTS.md

This repository is the [esutoru](https://github.com/esutoru) plugin marketplace for Claude Code and Codex, published at `esutoru/ai-plugins`. It contains no application code, only plugin manifests, skills and docs.

## Layout

- `.claude-plugin/marketplace.json` — Claude Code marketplace manifest. Every plugin must be listed here with `source` pointing to its directory under `plugins/`.
- `.agents/plugins/marketplace.json` — Codex marketplace manifest. Keep its `plugins` list in sync with the Claude one (same `name`, same directory).
- `plugins/<dir>/` — one directory per plugin. The directory name may differ from the plugin `name` (e.g. `plugins/wordmine` is the `esutoru-wordmine` plugin). The skill directory name may also differ from the skill `name` in its frontmatter (e.g. `skills/setup/` is `setup-esutoru-wordmine-plugin`)..
  - `.claude-plugin/plugin.json` — Claude Code plugin manifest.
  - `.codex-plugin/plugin.json` — Codex plugin manifest (requires `name`, `version`, `description`, `author.name`).
  - `skills/<skill>/SKILL.md` — skills. Both tools read the same `skills/` directory.
  - `references/<topic>.md` — procedures shared by several skills of that plugin (no frontmatter). Skills import them with FlowMD `import "../../references/<topic>.md" as <alias>` and call their workflows; they are never registered as skills.
  - `README.md` — plugin documentation.

## Rules

- The plugin `name` must be identical in both marketplace manifests and both plugin manifests.
- When adding a plugin: create its directory, both manifests, at least one skill, a `README.md`, and add a row to the table in the root `README.md`.
- When adding a skill: put it in `plugins/<dir>/skills/<skill>/SKILL.md` with `name` and `description` frontmatter, and list it in the plugin's `README.md`.
- A procedure used by more than one skill goes into `plugins/<dir>/references/<topic>.md`. References are plugin-specific; do not share them across plugins, and do not mention them in the plugin's `README.md`, which is written for end users only.
- Skills meant to be run by the user as slash commands carry `disable-model-invocation: true` so they cost no session context.
- Any skill action that writes to the user's machine or to Anki (settings file, deck, note type, cards) explains what and why first and asks for permission; read-only actions are announced in one line. The rules live in `plugins/wordmine/references/anki-connect.md`.
- User choices that must survive between sessions go to `~/.config/esutoru-<plugin>/config.json`, never to project files or tool-specific data directories (see `plugins/wordmine/references/config.md`).
- Bump `version` in both plugin manifests when a plugin changes.
- Keep manifests valid JSON; do not add comments to them.

## Validation

```bash
# Check JSON syntax
for f in .claude-plugin/marketplace.json .agents/plugins/marketplace.json plugins/*/.claude-plugin/plugin.json plugins/*/.codex-plugin/plugin.json; do
  python3 -m json.tool "$f" > /dev/null && echo "ok  $f" || echo "BAD $f"
done

# Validate the Claude Code marketplace and plugins
claude plugin validate .
```
