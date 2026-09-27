---
name: add-to-anki
description: Create the Wordmine cards from the conversation in Anki through AnkiConnect. Takes the set confirmed by prepare-words, or an explicit list of words, verifies Anki, the deck and the note type, asks once, completes every card to ten example sentences, then creates the notes.
disable-model-invocation: true
argument-hint: "[words or phrases] [deck <name>]"
allowed-tools: Bash(curl:*) Bash(uname:*) Bash(pgrep:*) Bash(ls:*) Bash(test:*) Bash(tasklist:*) Bash(flatpak:*) Bash(mdfind:*) Bash(rm:*)
---

# add-to-anki

Creates Anki notes for the cards the user has explicitly asked for. The usual input is the **Prepared cards** table that `/esutoru-wordmine:prepare-words` wrote into the conversation. Without such a table the skill needs an explicit list of words, typed after the command or clearly given in the conversation; anything less makes it stop and point to `prepare-words`. It verifies that Anki can be reached, that the deck and the note type exist and that the note type has every field, shows what it is about to create, asks once, generates the nine remaining examples of every card, and sends the notes.

Run it with `/esutoru-wordmine:add-to-anki`, optionally followed by words and a deck: `/esutoru-wordmine:add-to-anki deck Languages::English` or `/esutoru-wordmine:add-to-anki take for granted, on the fence`.

## Building blocks

| File | Workflow | Returns |
|---|---|---|
| `references/preflight.md` | `preflight` | `ok` with the settings record (`deck`, `noteType`, `targetLanguage`, `sourceLanguage`), or `stopped` after showing the stop message |
| `references/anki-connect.md` | rules only | how to talk to Anki; the probe itself runs inside `preflight` |
| `references/deck.md` | `ensure` | `DECK: ok`, `DECK: skipped` or `DECK: unavailable` |
| `references/note-type.md` | `status` | `NOTE_TYPE: ok`, `NOTE_TYPE: missing`, `NOTE_TYPE: incomplete <what is wrong>` or `NOTE_TYPE: unavailable` |
| `references/cards.md` | none | fields, the ten examples (rules and JSON form), the **Prepared cards** handoff, the `addNotes` payload, the result table |

Paths are relative to this skill's base directory (`<base>/../../references/`). In Claude Code the same files are at `${CLAUDE_PLUGIN_ROOT}/references/`. Read `cards.md` first; read the other files when their workflow is called and follow it inline. The rules for talking to Anki in `anki-connect.md` apply: warn before every command, keep tool output out of the conversation, and never change the collection without explaining what and why and asking permission. This skill makes two kinds of writes: creating a missing deck (through `deck.md`, which asks first) and creating the notes (after the one question below). It never modifies or deletes existing notes and never creates a note type; a missing or incomplete note type is fixed by the setup skill.

## What counts as an explicit list

In this order, the first that applies:

1. The most recent **Prepared cards** block in the conversation, with any changes the user asked for after it. Cards from that block are created as they are; their example becomes example 1 of the card, the languages and the "duplicate allowed" marks come with it.
2. Words typed after the command (`$ARGUMENTS` in Claude Code, the rest of the message in Codex), minus the deck name.
3. A list the user gave in the conversation with a clear request to put it into Anki ("add these to Anki: ...", "добавь в Anki: ...").

Words that were merely discussed, asked about or marked as unknown are not an explicit list. In that case stop with: "I do not see an explicit list of words to add. Run /esutoru-wordmine:prepare-words to collect the words from our conversation, review them and confirm the set, then run /esutoru-wordmine:add-to-anki." Do not build cards from the discussion on your own.

For cases 2 and 3 build the cards following `cards.md` with one example each, as `prepare-words` would. No duplicate check is made here; Anki's own check refuses a word that already exists in the target deck, and the result table shows that. Mention `prepare-words` when that happens.

## Before anything else

`preflight` runs right after the explicit list is found. It stops the skill with one highlighted message when the settings are incomplete (run the setup) or when Anki is not running or AnkiConnect does not answer (open Anki). No fallback languages, no retry loop: the message is the whole answer, and the user runs the skill again afterwards.

## The deck

The deck for this call, first that applies: named after the command (`deck Languages::English`), named in the **Prepared cards** line, named in the conversation ("put these in my Travel deck"), otherwise the default from the settings. Anki deck names use `::` for nesting. A deck that does not exist is offered for creation by `deck.ensure`; if the user declines, nothing is added.

## The one question

Before creating anything, show the line "Creating N notes in deck '<deck>' with note type '<noteType>'" and the card table from `cards.md` (without the "In Anki" column unless the prepared set had marks), then one line: "Each card gets ten example sentences: the one in the table and nine more that I generate before sending." The nine are not shown. Then ask:

| Option | Meaning |
|---|---|
| **Yes, create them** | Send the notes now |
| **No** | Add nothing; the user can run `prepare-words` to change the set |

A typed answer that is not a yes means no. This is the permission for the write; nothing is sent without it.

## Workflow

```flowmd
import "../../references/preflight.md" as preflight
import "../../references/deck.md" as deck
import "../../references/note-type.md" as note_type

let default_url = "http://127.0.0.1:8765"
let tag = "esutoru-wordmine"

workflow "add-to-anki" () {
  step "Announce" {
    summarize "I will take the prepared cards from our conversation, check your settings, Anki, the deck and the note type, show what will be created and ask before creating anything."
  }

  step "Find the list" {
    let cards = the explicit list following "What counts as an explicit list"
    if $cards is empty {
      return "I do not see an explicit list of words to add. Run /esutoru-wordmine:prepare-words to collect the words from our conversation, review them and confirm the set, then run /esutoru-wordmine:add-to-anki."
    }
  }

  step "Preflight" {
    let checked = call preflight.preflight()
    if $checked.status != "ok" {
      return with no further output; the stop message was already shown
    }
    let settings = $checked.settings
    let deck_name = the deck following "The deck"
  }

  step "Deck and note type" {
    let deck_status = call deck.ensure(deck: $deck_name, confirmed: false)
    if $deck_status != "DECK: ok" {
      return "No cards were added: the deck '$deck_name' is not available ($deck_status). Name another deck or run the setup."
    }
    let note_status = call note_type.status(note_type: $settings.noteType)
    if $note_status == "NOTE_TYPE: missing" {
      return "No cards were added: the note type '$settings.noteType' does not exist. Run /esutoru-wordmine:setup-esutoru-wordmine-plugin to create it."
    }
    if $note_status starts with "NOTE_TYPE: incomplete" {
      return "No cards were added: the note type '$settings.noteType' lacks Wordmine fields ($note_status). Run /esutoru-wordmine:setup-esutoru-wordmine-plugin to fix it."
    }
    if $note_status != "NOTE_TYPE: ok" {
      return "No cards were added: AnkiConnect could not read the note type ($note_status)."
    }
  }

  step "Ask" {
    summarize "Creating $count notes in deck '$deck_name' with note type '$settings.noteType'."
    render the card table from $cards
    summarize "Each card gets ten example sentences: the one in the table and nine more that I generate before sending."
    let answer = ask "Create these $count notes in Anki?" {
      "Yes, create them": "Send the notes to Anki now",
      "No": "Add nothing; run prepare-words to change the set"
    }
    if $answer is not "Yes, create them" {
      return "No cards were added."
    }
  }

  step "Create" {
    for every card in $cards whose Word is not a whole sentence, generate nine more examples following "The examples" in cards.md; the confirmed example stays number 1
    let url = value of ANKI_CONNECT_URL if set, else $default_url
    write the addNotes payload for $cards (deck $deck_name, model $settings.noteType, tag $tag, Examples as one-line JSON per cards.md, allowDuplicate true only for rows marked "duplicate allowed") to a temporary file
    check that every Examples value is valid JSON on its own; fix it before sending
    run "curl -s -m 30 -X POST $url --data-binary @<file>"
    delete the temporary file
    if the request failed or the answer has a non-null error {
      return "No cards were added: AnkiConnect refused the request ($last_error)."
    }
    for every null in the result {
      send that note alone with addNote to get the error text
    }
    render the result table from cards.md
    if any result says duplicate {
      summarize "Words refused as duplicates already exist in '$deck_name'. Run /esutoru-wordmine:prepare-words to see where and decide whether to keep a second note."
    }
    return "Added $added of $count cards to deck '$deck_name', ten examples each. They carry the tag '$tag'."
  }
}
```

## Reporting

The card table before the question and the result table after the request are the main output. Keep the text around them short: the announcement, the warnings from the reference files, the stop message from `preflight.md` when it applies (then nothing else), one question, one closing sentence. Do not paste raw command output. Never create notes without a yes, and never claim that cards were added when AnkiConnect returned `null` or an error for them.
