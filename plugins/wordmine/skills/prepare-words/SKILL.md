---
name: prepare-words
description: Collect the words and phrases from the conversation or from the command line, build a Wordmine card for each with one example sentence, show them as a table with the words that already exist in Anki, and let the user confirm or change the set. Creates nothing in Anki; add-to-anki does that.
disable-model-invocation: true
argument-hint: "[words or phrases]"
allowed-tools: Bash(curl:*) Bash(uname:*) Bash(pgrep:*) Bash(ls:*) Bash(test:*) Bash(tasklist:*) Bash(flatpak:*) Bash(mdfind:*) Bash(rm:*)
---

# prepare-words

Prepares a set of Wordmine cards and gets the user's explicit agreement on it. The words come from the text typed after the command and from the conversation so far. The skill builds one card per word in the configured languages, each with one example sentence and its translation, looks up which words already exist in Anki and in which decks, shows everything as a table, and asks the user to confirm, change or cancel. The confirmed set is written into the conversation as **Prepared cards**; `/esutoru-wordmine:add-to-anki` creates the notes from it. This skill never writes to Anki.

Run it with `/esutoru-wordmine:prepare-words`, optionally followed by words and phrases: `/esutoru-wordmine:prepare-words give up, hindsight, on the fence`.

## Building blocks

| File | Workflow | Returns |
|---|---|---|
| `references/preflight.md` | `preflight` | `ok` with the settings record (`deck`, `noteType`, `targetLanguage`, `sourceLanguage`), or `stopped` after showing the stop message |
| `references/anki-connect.md` | rules only | how to talk to Anki; the probe itself runs inside `preflight` |
| `references/cards.md` | none | what a card contains, the one example this skill builds, the card table, the **Prepared cards** handoff |

Paths are relative to this skill's base directory (`<base>/../../references/`). In Claude Code the same files are at `${CLAUDE_PLUGIN_ROOT}/references/`. Read `cards.md` before building the first card; read the other files when their workflow is called and follow it inline. The rules for talking to Anki in `anki-connect.md` apply: warn before every command and keep tool output out of the conversation. Everything this skill sends to Anki only reads.

## Before anything else

`preflight` runs first. It stops the skill with one highlighted message when the settings are incomplete (run the setup) or when Anki is not running or AnkiConnect does not answer (open Anki). There is no fallback to default languages and no retry loop: the message is the whole answer, and the user runs the skill again afterwards. A deck named by the user is kept in the **Prepared cards** line for `add-to-anki`; this skill does not check it.

## Where the words come from

Collect candidates from two places and merge them, without duplicates:

1. The text typed after the command (`$ARGUMENTS` in Claude Code, the rest of the message in Codex). Split on commas, semicolons or line breaks; a phrase between quotes stays one item.
2. The conversation so far: words the user asked about ("what does X mean", "как переводится X"), marked as unknown or new, asked to remember or to add to Anki, or explicitly listed for cards. Words the assistant itself introduced count only when the user reacted to them.

Skip words that are already in a **Prepared cards** table or were added to Anki earlier in the same conversation, unless the user asks for them again. When neither place yields anything, ask the user for the words in one open question and stop if the answer is empty.

## Words already in Anki

Read-only. Search the whole collection, not one deck, because the user wants to know about every copy. For every candidate build the search terms `"Word:<text>"` and `"Front:<text>"` (Wordmine notes and Anki's Basic notes), escape `\`, `"`, `*` and `_` in the text with a backslash, and join all terms with `OR`. Field searches match the whole field, case-insensitively.

```json
{"action": "findCards", "version": 6, "params": {"query": "\"Word:give up\" OR \"Front:give up\" OR \"Word:hindsight\" OR \"Front:hindsight\""}}
```

When the result is not empty, ask for the cards' details and group them by the value of the matching field, compared case-insensitively:

```json
{"action": "cardsInfo", "version": 6, "params": {"cards": [1502298033753, 1502298036657]}}
```

Every entry carries `deckName`, `modelName`, `fields` (each with its `value`) and `note`. One note may have several cards; list each deck once per word. If either request fails, say in one line that the duplicate check did not work and show the table without the "In Anki" column; do not stop.

## The question

Above the table, one line: how many cards and which languages. Below the table, when some words exist in Anki, one line per such word with the deck, the note type and the existing translation. Then exactly one question:

| Situation | Options |
|---|---|
| some words already in Anki | **Confirm without the existing ones** · **Confirm all, keep the existing ones too** · **Change the list** · **Cancel** |
| no duplicates | **Confirm this set** · **Change the list** · **Cancel** |

"Change the list" takes free text: add or drop words, edit any cell by row number, change a translation or an example, name a deck. Apply it, rebuild the changed cards, re-run the duplicate check for new words, show the table again and ask again. A typed answer that is not one of the options is treated as a change request. Up to five rounds; then stop and say the set was not confirmed.

## Workflow

```flowmd
import "../../references/preflight.md" as preflight

let default_url = "http://127.0.0.1:8765"
let max_rounds = 5

fragment "find-existing" (words) {
  summarize "I will search your Anki collection for these words. This only reads."
  let url = value of ANKI_CONNECT_URL if set, else $default_url
  let query = for each word in $words, "\"Word:<escaped>\" OR \"Front:<escaped>\"", all joined with " OR "
  write the findCards payload with $query to a temporary file
  run "curl -s -m 10 -X POST $url --data-binary @<file>"
  delete the temporary file
  if the request failed or the answer has a non-null error {
    summarize "The duplicate check did not work: $last_error. I will continue without it."
    return empty
  }
  if the result is empty {
    return empty
  }
  write the cardsInfo payload with the returned ids to a temporary file
  run "curl -s -m 10 -X POST $url --data-binary @<file>"
  delete the temporary file
  if the request failed or the answer has a non-null error {
    summarize "The duplicate check did not work: $last_error. I will continue without it."
    return empty
  }
  return record keyed by word (lowercase) with a list of { deck, noteType, translation } per existing note
}

workflow "prepare-words" () {
  step "Announce" {
    summarize "I will read your Wordmine settings, check that Anki answers, build a card for every word, check which ones are already in Anki, and show you the set before anything is created. Creating the notes is a separate step: /esutoru-wordmine:add-to-anki."
  }

  step "Preflight" {
    let checked = call preflight.preflight()
    if $checked.status != "ok" {
      return with no further output; the stop message was already shown
    }
    let settings = $checked.settings
    let deck_name = the deck named after the command or in the conversation, if any
  }

  step "Collect" {
    let cards = candidates built from the command text and the conversation, following "Where the words come from" and cards.md
    if $cards is empty {
      let answer = ask "Which words or phrases should become cards? Separate them with commas." {}
      if $answer is empty {
        return "Nothing to prepare: no words were given."
      }
      let cards = candidates built from $answer
    }
  }

  step "Confirm" {
    loop max $max_rounds {
      let matches = call "find-existing"(words: the Word of every card in $cards)
      summarize "$count cards, $settings.targetLanguage → $settings.sourceLanguage" plus ", deck '$deck_name'" when named
      render the card table from $cards and $matches, without the "In Anki" column when the duplicate check did not work
      if $matches is not empty {
        list under the table, one line per matched word: the deck, the note type and the existing translation
        let answer = ask "$dup_count of these words are already in Anki. Is this the set to create?" {
          "Confirm without the existing ones": "Drop the words that are already in Anki",
          "Confirm all, keep the existing ones too": "Keep every card; the existing words get a second note when added",
          "Change the list": "Tell me what to add, drop or edit",
          "Cancel": "Prepare nothing"
        }
      } else {
        let answer = ask "Is this the set to create?" {
          "Confirm this set": "Write it down as the prepared set",
          "Change the list": "Tell me what to add, drop or edit",
          "Cancel": "Prepare nothing"
        }
      }
      if $answer is "Cancel" {
        return "Nothing was prepared."
      }
      if $answer is "Change the list" or $answer is free text {
        let changes = $answer if free text, else ask "What should change? Add or drop words, edit any cell by row number, or name a deck." {}
        apply $changes to $cards; rebuild translation, example and notes for changed words
        if $changes names a deck { let deck_name = that deck }
        continue
      }
      if $answer is "Confirm without the existing ones" {
        let cards = cards of $cards whose word is not in $matches
      }
      if $answer is "Confirm all, keep the existing ones too" {
        mark every card whose word is in $matches as "duplicate allowed"
      }
      break
    }
    if not confirmed {
      return "The set was not confirmed after $max_rounds rounds. Run /esutoru-wordmine:prepare-words again when ready."
    }
  }

  step "Hand off" {
    show the bold heading "Prepared cards"
    show one line: "$count cards, $settings.targetLanguage → $settings.sourceLanguage" plus ", deck '$deck_name'" when named
    render the card table from $cards with "duplicate allowed" in the "In Anki" column where marked
    return "Run /esutoru-wordmine:add-to-anki to create these cards in Anki; it adds nine more examples to each card."
  }
}
```

## Reporting

The card table is the main output. Keep the text around it short: the announcement, the read-only warnings, the stop message from `preflight.md` when it applies (then nothing else), the line above the table, the list of existing copies, one question per round, the **Prepared cards** block and one closing sentence. Do not paste raw command output.
