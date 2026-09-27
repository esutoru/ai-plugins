# Preflight for card skills

Shared entry check for `prepare-words` and `add-to-anki`. It answers two questions before any card work starts: are the settings complete, and is Anki reachable right now. When either answer is no, the skill stops at once with one highlighted message. Card skills never guide the user through installing or fixing anything; that is the setup skill's job.

Skills import this file and call `preflight`. Follow it inline. The rules for talking to Anki from `anki-connect.md` apply: warn before the read-only probe, keep tool output out of the conversation.

## Contract

- Input: none.
- Output: record with `status` and `settings`. `status` is `ok` (all four settings present, AnkiConnect answered, a profile is open) or `stopped` (the message was shown; the caller returns immediately without further output). `settings` is the settings record from `config.md`.
- The probe is `anki.status`, once. No retry loop, no "check again" question.

## The stop message

Shown once, as the last thing in the reply, in its own blockquote, with the first sentence in bold, so it stands apart from everything else. Nothing follows it: no table, no summary, no further question.

| Situation | Message |
|---|---|
| settings file missing, unreadable, or any of `deck`, `noteType`, `targetLanguage`, `sourceLanguage` empty | > **⛔ Wordmine is not set up.** Run `/esutoru-wordmine:setup-esutoru-wordmine-plugin` first, then run this skill again. |
| `running` is `to do` and `note` mentions the profile picker | > **⛔ Anki is open on the profile picker.** Pick a profile in Anki and wait until the deck list is visible, then run this skill again. |
| `reachable` is `could not check` (the sandbox blocked the probe even outside the sandbox) | > **⛔ I could not reach Anki from the sandbox.** Allow local network access (in Claude Code run `/sandbox`) or run `/esutoru-wordmine:setup-esutoru-wordmine-plugin` to sort it out, then run this skill again. |
| anything else (Anki closed, not installed, add-on missing, port not answering) | > **⛔ Anki is not running or AnkiConnect does not answer.** Open the Anki desktop app and wait until the deck list is visible, then run this skill again. If Anki is already open, run `/esutoru-wordmine:setup-esutoru-wordmine-plugin` to check the AnkiConnect add-on. |

Before the message, nothing but the warnings the reference files require ("I will read your settings...", "I will send one HTTP request..."). Do not explain the diagnosis at length and do not list installation steps.

## Workflow

```flowmd
import "./anki-connect.md" as anki
import "./config.md" as config

workflow "preflight" () {
  step "Settings" {
    let loaded = call config.load()
    let settings = $loaded.config
    if $loaded.status != "ok"
      or $settings.deck is empty or $settings.noteType is empty
      or $settings.targetLanguage is empty or $settings.sourceLanguage is empty {
      show the "not set up" message from the table, as a blockquote, first sentence in bold
      return record { status: "stopped", settings: $settings }
    }
  }

  step "Anki" {
    let anki_status = call anki.status()
    if $anki_status.reachable == "done" and $anki_status.running == "done" {
      return record { status: "ok", settings: $settings }
    }
    pick the message from the table by $anki_status
    show it as a blockquote, first sentence in bold, as the last thing in the reply
    return record { status: "stopped", settings: $settings }
  }
}
```
