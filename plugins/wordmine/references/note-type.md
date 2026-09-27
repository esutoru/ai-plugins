# Wordmine note type

Shared definition of the Esutoru Wordmine note type, the procedure that picks its name during setup, the procedure that checks it exists, and the procedure that creates it. Every card the plugin creates uses this note type, so card-making skills run the check first.

Skills import this file and call its workflows. Follow them inline, in the current conversation. The rules for talking to Anki from `anki-connect.md` apply: `status` only reads; `ensure` creates a note type, which changes the collection, so it explains and asks for permission first and never creates anything silently.

## Contract

- Precondition: AnkiConnect is reachable and a profile is open (`status` from `anki-connect.md` reported `reachable: done` and `running: done`). Do not repeat that check here.
- Input of `status` and `ensure`: `note_type`, the note type name from the settings (`config.md`). `ensure` also takes `confirmed`: `true` when the user has just chosen the name in `choose-name`, which already authorises creating it, so no permission question is repeated; `false` (default) otherwise. If the environment variable `ANKI_CONNECT_URL` is set, use it instead of `http://127.0.0.1:8765`.
- Input of `choose-name`: `current`, the name from the settings if any.
- Output of `status`: `NOTE_TYPE: ok`, `NOTE_TYPE: missing` or `NOTE_TYPE: unavailable`.
- Output of `ensure`: `NOTE_TYPE: ok`, `NOTE_TYPE: skipped` (user declined creation) or `NOTE_TYPE: unavailable`.
- Output of `choose-name`: the chosen name.

Keep tool output out of the conversation. Report only the interpreted result.

## Note type definition

The first version mirrors Anki's built-in `Basic` note type so the whole setup can be completed today. Fields and templates will grow in later versions; the name stays the user's choice.

| Setting | Value |
|---|---|
| Name | From the settings (`noteType` in `config.md`), chosen during setup. Recommended: `Esutoru Wordmine (<8 random characters>)` |
| Fields, in order | `Front`, `Back` |
| Card templates | one card, `Card 1` |
| Front template | `{{Front}}` |
| Back template | `{{FrontSide}}<hr id=answer>{{Back}}` |
| Styling | Anki's default: `.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }` |

`createModel` payload. Replace `NOTE_TYPE_NAME` with the configured name and keep everything else exactly as written:

```json
{
  "action": "createModel",
  "version": 6,
  "params": {
    "modelName": "NOTE_TYPE_NAME",
    "inOrderFields": ["Front", "Back"],
    "css": ".card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}\n",
    "isCloze": false,
    "cardTemplates": [
      {
        "Name": "Card 1",
        "Front": "{{Front}}",
        "Back": "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}"
      }
    ]
  }
}
```

Send it from a file rather than inline, so quoting stays correct on every shell: write the JSON to a temporary file (the agent's scratchpad or temp directory), run `curl -s -m 10 -X POST "$ANKI_CONNECT_URL" --data-binary @<file>`, then delete the file. A successful answer is `{"result": {...model...}, "error": null}`. AnkiConnect refuses a name that already exists with an error mentioning the model name; treat that as `NOTE_TYPE: ok` after re-checking with `status`.

## Choosing the name

One question, then act. The recommended name is `Esutoru Wordmine (xxxxxxxx)` where `xxxxxxxx` is eight random lowercase letters and digits that you generate yourself, no command needed. The suffix keeps the name unique among the user's note types, so a later redesign can create a fresh type next to the old one without touching existing cards. Present it as the recommendation, say plainly that the user may type any other name as a custom answer, and make clear in the question that choosing a name means the note type will be created under it right away. That choice is the permission; `ensure` must not ask again. If the user names a note type that already exists in the collection, say that Wordmine will use it as it is and that it must have the fields `Front` and `Back`.

## Workflows

```flowmd
let default_url = "http://127.0.0.1:8765"

workflow "choose-name" (current) {
  step "Suggest" {
    if $current is not empty {
      let suggested = $current
    } else {
      let suffix = eight random lowercase letters and digits
      let suggested = "Esutoru Wordmine ($suffix)"
    }
    summarize "Wordmine cards use their own note type so their fields and layout stay under the plugin's control. It is a copy of Anki's Basic type (fields Front and Back, one card) under a name of your choice. Recommended name: '$suggested'. Type another name if you prefer."
  }

  step "Ask" {
    let answer = ask "Create the Wordmine note type under this name? Type another name to use it instead." {
      "$suggested (recommended)": "Create the note type with this unique name now"
    }
    let name = $answer, or $suggested when empty
    return $name
  }
}

workflow "status" (note_type) {
  step "Warn" {
    summarize "I will ask AnkiConnect for the list of note types in your collection. This only reads."
  }

  step "List note types" {
    let url = value of ANKI_CONNECT_URL if set, else $default_url
    run "curl -s -m 5 -X POST $url -d '{\"action\":\"modelNames\",\"version\":6}'"
    if curl is missing {
      use the Python 3 or PowerShell fallback described in anki-connect.md
    }
    if the request failed or the answer has a non-null error {
      summarize "AnkiConnect did not return the list of note types: $last_error"
      return "NOTE_TYPE: unavailable"
    }
  }

  step "Finish" {
    if $note_type is in the returned list, compared exactly including case and spaces {
      return "NOTE_TYPE: ok"
    }
    return "NOTE_TYPE: missing"
  }
}

workflow "ensure" (note_type, confirmed) {
  step "Check" {
    let current = call "status"(note_type: $note_type)
    if $current is not "NOTE_TYPE: missing" {
      return $current
    }
  }

  step "Ask permission" {
    if $confirmed {
      summarize "Creating the note type '$note_type' as you chose."
      skip to the Create step
    }
    summarize """
    The note type '$note_type' does not exist in your collection. Wordmine needs it because every card
    it creates uses this type. I can create it now through AnkiConnect. It will be a copy of Anki's
    built-in Basic type under this name: fields Front and Back, one card showing Front on the question
    side and Front plus Back on the answer side, default styling. Nothing else in your collection changes.
    """
    let answer = ask "Create the note type '$note_type' in Anki?" {
      "Yes, create it": "I will create the note type now",
      "No": "I will not create it; you can create it yourself in Anki or run the setup again later"
    }
    if $answer is "No" {
      return "NOTE_TYPE: skipped"
    }
  }

  step "Create" {
    let url = value of ANKI_CONNECT_URL if set, else $default_url
    write the createModel payload with $note_type filled in to a temporary file
    run "curl -s -m 10 -X POST $url --data-binary @<file>"
    delete the temporary file
    if the answer has a non-null error {
      if the error says the model name already exists {
        return call "status"(note_type: $note_type)
      }
      summarize "AnkiConnect could not create the note type: $last_error"
      return "NOTE_TYPE: unavailable"
    }
    return "NOTE_TYPE: ok"
  }
}
```

Expected answer shape from `modelNames`:

```json
{"result": ["Basic", "Basic (and reversed card)", "Cloze", "Esutoru Wordmine (k3x9m2qa)"], "error": null}
```
