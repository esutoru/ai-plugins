# Wordmine note type

Shared definition of the Esutoru Wordmine note type, the procedure that picks its name during setup, the procedure that checks it exists and has every field Wordmine writes, and the procedure that creates it. Every card the plugin creates uses this note type, so card-making skills run the check first.

Skills import this file and call its workflows. Follow them inline, in the current conversation. The rules for talking to Anki from `anki-connect.md` apply: `status` only reads; `ensure` creates a note type, which changes the collection, so it explains and asks for permission first and never creates anything silently.

## Contract

- Precondition: AnkiConnect is reachable and a profile is open (`status` from `anki-connect.md` reported `reachable: done` and `running: done`). Do not repeat that check here.
- Input of `status` and `ensure`: `note_type`, the note type name from the settings (`config.md`). `ensure` also takes `confirmed`: `true` when the user has just chosen the name in `choose-name`, which already authorises creating it, so no permission question is repeated; `false` (default) otherwise. If the environment variable `ANKI_CONNECT_URL` is set, use it instead of `http://127.0.0.1:8765`.
- Input of `choose-name`: `current`, the name from the settings if any.
- Output of `status`: `NOTE_TYPE: ok`, `NOTE_TYPE: missing`, `NOTE_TYPE: incomplete <what is wrong>` or `NOTE_TYPE: unavailable`.
- Output of `ensure`: `NOTE_TYPE: ok`, `NOTE_TYPE: skipped` (user declined creation), `NOTE_TYPE: incomplete <what is wrong>` (the type exists but lacks fields; `ensure` never modifies an existing type) or `NOTE_TYPE: unavailable`.
- Output of `choose-name`: the chosen name.

Keep tool output out of the conversation. Report only the interpreted result.

## Note type definition

One note holds one word or phrase in the target language together with everything Wordmine knows about it. The languages themselves are not part of the note type; they come from the settings (`targetLanguage` and `sourceLanguage` in `config.md`). Field names are therefore language-neutral.

| Setting | Value |
|---|---|
| Name | From the settings (`noteType` in `config.md`), chosen during setup. Recommended: `Esutoru Wordmine (<8 random characters>)` |
| Fields, in order | `Word`, `Translation`, `Example`, `ExampleTranslation`, `Notes` |
| Card templates | one card, `Card 1`: the target language on the question side, everything else on the answer side |
| Styling | Anki's default `.card` rule plus small rules for the example and the notes |

| Field | Content | Language |
|---|---|---|
| `Word` | The word, phrase or sentence being learned, in dictionary form (`give up`, `hindsight`, `to be on the fence`). Always filled. Anki uses the first field for duplicate detection and refuses notes whose first field is empty, so `Word` must stay first. | target |
| `Translation` | The translation that matches the sense the user met. Several translations separated by commas when the word really has several close meanings. | source |
| `Example` | One natural sentence showing the word in the sense above. May be empty. | target |
| `ExampleTranslation` | Translation of the example. May be empty. | source |
| `Notes` | Only when useful: part of speech, register, irregular forms, a collocation, a false friend, a difference from a similar word. May be empty. | source, with target-language terms as needed |

Required for `status` to report `ok`: the note type exists, all five fields are present with exactly these names (case matters), and `Word` is the first field. Extra fields are allowed and stay empty. Any other order of the first field or a missing field makes the type `incomplete`; `status` names what is wrong so the user can fix it in Anki (Tools → Manage Note Types → Fields) or let the setup create a fresh type under a new name.

`createModel` payload. Replace `NOTE_TYPE_NAME` with the configured name and keep everything else exactly as written:

```json
{
  "action": "createModel",
  "version": 6,
  "params": {
    "modelName": "NOTE_TYPE_NAME",
    "inOrderFields": ["Word", "Translation", "Example", "ExampleTranslation", "Notes"],
    "css": ".card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}\n.translation {\n  font-weight: bold;\n}\n.example {\n  margin-top: 1em;\n  font-style: italic;\n}\n.example-translation {\n  font-size: 16px;\n  opacity: 0.7;\n}\n.notes {\n  margin-top: 1em;\n  font-size: 16px;\n  opacity: 0.8;\n}\n",
    "isCloze": false,
    "cardTemplates": [
      {
        "Name": "Card 1",
        "Front": "{{Word}}",
        "Back": "{{FrontSide}}\n\n<hr id=answer>\n\n<div class=\"translation\">{{Translation}}</div>\n{{#Example}}<div class=\"example\">{{Example}}</div>{{/Example}}\n{{#ExampleTranslation}}<div class=\"example-translation\">{{ExampleTranslation}}</div>{{/ExampleTranslation}}\n{{#Notes}}<div class=\"notes\">{{Notes}}</div>{{/Notes}}"
      }
    ]
  }
}
```

Send it from a file, as described under "Requests that carry text" in `anki-connect.md`: write the JSON to a temporary file, run `curl -s -m 10 -X POST "$ANKI_CONNECT_URL" --data-binary @<file>`, then delete the file. A successful answer is `{"result": {...model...}, "error": null}`. AnkiConnect refuses a name that already exists with an error mentioning the model name; treat that as a call to `status` and return its result.

## Choosing the name

One question, then act. The recommended name is `Esutoru Wordmine (xxxxxxxx)` where `xxxxxxxx` is eight random lowercase letters and digits that you generate yourself, no command needed. The suffix keeps the name unique among the user's note types, so a later redesign can create a fresh type next to the old one without touching existing cards. Present it as the recommendation, say plainly that the user may type any other name as a custom answer, and make clear in the question that choosing a name means the note type will be created under it right away. That choice is the permission; `ensure` must not ask again. If the user names a note type that already exists in the collection, say that Wordmine will use it as it is and that it must have the fields `Word`, `Translation`, `Example`, `ExampleTranslation` and `Notes`, with `Word` first; `status` verifies that.

## Workflows

```flowmd
let default_url = "http://127.0.0.1:8765"
let required_fields = ["Word", "Translation", "Example", "ExampleTranslation", "Notes"]

workflow "choose-name" (current) {
  step "Suggest" {
    if $current is not empty {
      let suggested = $current
    } else {
      let suffix = eight random lowercase letters and digits
      let suggested = "Esutoru Wordmine ($suffix)"
    }
    summarize "Wordmine cards use their own note type so their fields and layout stay under the plugin's control: fields Word, Translation, Example, ExampleTranslation and Notes, one card with the word on the front and the rest on the back. Recommended name: '$suggested'. Type another name if you prefer."
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
    summarize "I will ask AnkiConnect for the list of note types and the fields of '$note_type'. This only reads."
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
    if $note_type is not in the returned list, compared exactly including case and spaces {
      return "NOTE_TYPE: missing"
    }
  }

  step "Check fields" {
    write {"action":"modelFieldNames","version":6,"params":{"modelName":"$note_type"}} to a temporary file
    run "curl -s -m 5 -X POST $url --data-binary @<file>"
    delete the temporary file
    if the request failed or the answer has a non-null error {
      summarize "AnkiConnect did not return the fields of '$note_type': $last_error"
      return "NOTE_TYPE: unavailable"
    }
    let fields = the returned list
    let missing = every name in $required_fields that is not in $fields
    if $missing is not empty {
      return "NOTE_TYPE: incomplete missing fields $missing"
    }
    if the first element of $fields is not "Word" {
      return "NOTE_TYPE: incomplete the first field is '$fields[0]', it must be 'Word'"
    }
    return "NOTE_TYPE: ok"
  }
}

workflow "ensure" (note_type, confirmed) {
  step "Check" {
    let current = call "status"(note_type: $note_type)
    if $current starts with "NOTE_TYPE: incomplete" {
      summarize "The note type '$note_type' exists but does not match what Wordmine writes: $current. I do not change existing note types."
      return $current
    }
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
    it creates uses this type. I can create it now through AnkiConnect. It will have the fields Word,
    Translation, Example, ExampleTranslation and Notes, and one card showing the word on the question
    side and the translation, the example and the notes on the answer side. Nothing else in your
    collection changes.
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

Expected answer shapes:

```json
{"result": ["Basic", "Basic (and reversed card)", "Cloze", "Esutoru Wordmine (k3x9m2qa)"], "error": null}
{"result": ["Word", "Translation", "Example", "ExampleTranslation", "Notes"], "error": null}
```
