---
name: setup-esutoru-wordmine-plugin
description: One-time first setup of the Esutoru Wordmine plugin. Run it once after installing the plugin, and again whenever card creation starts failing.
disable-model-invocation: true
allowed-tools: Bash(curl:*) Bash(uname:*) Bash(pgrep:*) Bash(ls:*) Bash(test:*) Bash(tasklist:*) Bash(flatpak:*) Bash(mdfind:*)
---

# setup-esutoru-wordmine-plugin

One-time setup of the Esutoru Wordmine plugin. Wordmine creates Anki cards through the AnkiConnect add-on, so this skill verifies the whole chain: Anki installed and running, AnkiConnect installed and answering, the user's settings saved, the target deck present, the Wordmine note type present in the collection. It shows the user a table of what is already in place and what is still missing, tells them exactly which steps are theirs to do, waits, and checks again. The table is shown after every round, also when everything is already in place, so the user always sees where they stand.

Run it with `/esutoru-wordmine:setup-esutoru-wordmine-plugin`. It is safe to run any number of times.

## Building blocks

The checks live in shared reference files under the plugin's `references/` directory so that card-making skills reuse the same procedures:

| File | Workflow | Returns |
|---|---|---|
| `references/anki-connect.md` | `status` | record with `installed`, `running`, `addon`, `reachable` (each `done`, `to do`, `could not check`) and `note` |
| `references/config.md` | `load`, `save` | the settings record (`deck`, `noteType`) and whether the file was read or written |
| `references/deck.md` | `choose`, `ensure` | the chosen deck; `DECK: ok`, `DECK: skipped` or `DECK: unavailable` |
| `references/note-type.md` | `choose-name`, `ensure` | the chosen name; `NOTE_TYPE: ok`, `NOTE_TYPE: skipped` or `NOTE_TYPE: unavailable` |

Paths are relative to this skill's base directory (`<base>/../../references/`). In Claude Code the same files are at `${CLAUDE_PLUGIN_ROOT}/references/`. Read a file when its workflow is called and follow the workflow inline in this conversation. The rules for talking to Anki in `anki-connect.md` apply throughout: warn before every command, and never change the collection without explaining why and asking permission. The only writes to Anki this skill can make are creating the deck and creating the note type, and `deck.md` and `note-type.md` ask first. Do not re-implement the checks here.

## Ask only for what is missing

When Anki is running, AnkiConnect answers, the settings file has both values, the deck exists and the note type exists, the skill asks nothing and only shows the table. Creating a missing deck or note type always asks first, because it changes the collection. A saved value is never re-asked and never overwritten. To change a value the user edits `~/.config/esutoru-wordmine/config.json` and runs the setup again; say so in the closing sentence when settings were loaded from the file.

## The status table

Show it exactly once after every round of checks, whatever the result, so the user always sees where they stand, also when everything is already in place. The table from the last round is the final state; the closing sentence follows it. Seven rows, always in this order:

| Requirement | Status | What you need to do |
|---|---|---|
| Anki desktop installed | ✅ | |
| Anki running with a profile open | ✅ | |
| AnkiConnect add-on installed | ✅ | |
| AnkiConnect answering | ✅ | |
| Default deck `<deck>` exists in Anki | ✅ | |
| Note type `<noteType>` in the collection | ✅ | |
| Settings saved (`~/.config/esutoru-wordmine/config.json`) | ✅ | |

Status cells:

| Status | Cell |
|---|---|
| done | ✅ |
| to do | ❌ to do |
| could not check | ⚠️ could not check |
| not checked | ⏳ not checked |

The third column exists only when at least one row is `to do` or `could not check`. When every row is ✅ or ⏳, drop the column and show a two-column table.

Mapping:

- Rows 1 to 4 come straight from the `status` record of `anki-connect.md`. The third column holds the one-line instruction from its "What the user has to do" table, with the "If not done yet:" prefix for `could not check`.
- Rows 5 to 7 are `not checked` while row 4 is not done.
- Row 5: done for `DECK: ok`; to do for `DECK: skipped`, with "**Create the deck** in Anki or run the setup again and pick another deck".
- Row 6: done for `NOTE_TYPE: ok`; to do for `NOTE_TYPE: skipped`, with "**Allow creating the note type** on the next run, or create it in Anki yourself with fields Front and Back".
- Row 7: done when the file was read or written; to do when it could not be saved, with "**Save the settings file** manually" and the JSON shown once below the table.

Below the table, when anything is `to do` or `could not check`, put the user's steps in their own block under the bold heading **Your steps**, followed by "These steps are yours to do; I cannot do them for you.", as one numbered list in row order where every step starts with a bold verb phrase (see the example in `anki-connect.md`). Nothing else goes in that block. Never ask the user whether something is installed or open; the next round of checks answers that. The only question per round is: check again or stop.

When the sandbox blocks a check, `anki-connect.md` re-runs the same read-only commands outside the sandbox without asking first; the user's tool shows its own approval prompt. Only if that is denied or fails does the skill say that nothing could be inspected and fall back to the full instruction list.

## Questions on the first run

Exactly two, and only when the settings file lacks the value: which deck receives cards by default, and under which name to create the note type. Each answer is also the permission to create the deck or the note type, so nothing is asked twice. With a saved settings file there are no questions at all.

## Workflow

```flowmd
import "../../references/anki-connect.md" as anki
import "../../references/config.md" as config
import "../../references/deck.md" as deck
import "../../references/note-type.md" as note_type

let max_rounds = 3

fragment "complete-settings" (loaded) {
  let settings = $loaded.config
  let deck_status = empty
  let changed = false

  if $settings.deck is empty {
    let chosen_deck = call deck.choose(current: "")
    let settings.deck = $chosen_deck.deck
    let deck_status = $chosen_deck.status
    let changed = true
  }
  if $settings.noteType is empty {
    let settings.noteType = call note_type.choose-name(current: "")
    let note_confirmed = true
    let changed = true
  }

  if $changed or $loaded.status != "ok" {
    let saved = call config.save(config: $settings)
    let settings_status = "done" if $saved == "saved" else "to do"
  } else {
    let settings_status = "done"
  }
  return record { values: $settings, deck_status: $deck_status, settings_status: $settings_status, note_confirmed: $note_confirmed }
}

fragment "collect" (settings) {
  let anki_status = call anki.status()
  if $anki_status.reachable != "done" or $anki_status.running != "done" {
    return record { anki: $anki_status, deck: "not checked", note: "not checked", settings: "not checked", values: $settings }
  }

  if $settings is empty {
    let loaded = call config.load()
    let completed = call "complete-settings"(loaded: $loaded)
    let settings = $completed.values
    let settings_status = $completed.settings_status
    let deck_status = $completed.deck_status
  } else {
    let settings_status = "done"
    let deck_status = empty
  }
  if $deck_status is empty {
    let deck_status = call deck.ensure(deck: $settings.deck, confirmed: false)
  }

  if $deck_status == "DECK: unavailable" {
    let note_status = "NOTE_TYPE: unavailable"
  } else {
    let note_status = call note_type.ensure(note_type: $settings.noteType, confirmed: $completed.note_confirmed or false)
  }
  return record { anki: $anki_status, deck: $deck_status, note: $note_status, settings: $settings_status, values: $settings }
}

fragment "all-done" (state) {
  return $state.anki.reachable == "done"
    and $state.anki.running == "done"
    and $state.settings == "done"
    and $state.deck == "DECK: ok"
    and $state.note == "NOTE_TYPE: ok"
}

workflow "setup-wordmine" () {
  step "Announce" {
    summarize """
    Wordmine setup checks seven things: Anki installed, Anki running, the AnkiConnect add-on,
    the connection to it, the default deck for new cards, the Wordmine note type, and your saved settings.
    It asks at most two questions, only if the settings file does not have the answers yet: which deck
    receives cards by default and under which name to create the note type. The checks only read: one HTTP
    request to localhost, the process list, Anki's folders, and the settings file. I will ask before
    creating a deck or a note type in Anki and before writing the settings file.
    """
  }

  step "Check and guide" {
    let settings = empty
    loop max $max_rounds {
      let state = call "collect"(settings: $settings)
      let settings = $state.values
      render the status table from $state

      if call "all-done"(state: $state) {
        break
      }

      if every Anki row is "could not check" {
        summarize "I could not inspect Anki from inside the sandbox, so I cannot tell what is already in place. Here is the full list; skip the steps you have already done."
      }
      show the bold heading "Your steps" and "These steps are yours to do; I cannot do them for you."
      show one numbered list with the instruction for every row that is "to do" or "could not check", each starting with its bold verb phrase, "If not done yet, ..." for "could not check"
      never ask the user to confirm the state of a row
      let answer = ask "Tell me when to check again." {
        "Done, check again": "I will run the checks once more and show the table again",
        "Stop for now": "I will stop here; the table above shows what is still missing"
      }
      if $answer is "Stop for now" {
        break
      }
    }
  }

  step "Finish" {
    if call "all-done"(state: $state) {
      return "Setup complete. Wordmine will add cards to deck '$settings.deck' using note type '$settings.noteType'. To change either, edit ~/.config/esutoru-wordmine/config.json and run the setup again."
    }
    return "Setup is not finished. Do the steps listed in the table, then run /esutoru-wordmine:setup-esutoru-wordmine-plugin again."
  }
}
```

## Reporting

The status table is the main output. Keep the text around it short: the announcement, the settings questions, the **Your steps** block, one question per round, and one closing sentence. Required actions appear only inside the **Your steps** block, in bold, never inside explanatory text. Do not paste raw command output.
