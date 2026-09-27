# Wordmine cards

Shared definition of what a Wordmine card contains, how a prepared set of cards is written down in the conversation so that one skill can hand it to another, and how the notes are sent to Anki. `prepare-words` builds and confirms the set; `add-to-anki` creates the notes.

## Languages

Languages come from the settings (`config.md`): `targetLanguage` is the language being learned, `sourceLanguage` is the user's own language. Both are required; `preflight.md` stops the skill when either is missing. The target language is always the language of `Word` and `Example`, even when the user typed the word in the source language ("как будет 'сдаться'" gives a card for `give up`).

## Fields

One card per word or phrase, one note of the Wordmine note type (`note-type.md`).

| Field | Content | Language |
|---|---|---|
| `Word` | The word, phrase, phrasal verb, idiom or whole sentence, in dictionary form: `give up`, not `gave up`; `hindsight`, not `in hindsight` unless the user asked for the expression. A whole sentence stays a sentence when the user wants to learn it as one. Always filled. | target |
| `Translation` | The translation that matches the sense the user met. Two or three translations separated by commas when the word really has several close senses; not the whole dictionary entry. | source |
| `Example` | One natural sentence showing the word in that sense. When the word was taken from a sentence the user wrote or read, prefer that sentence, lightly corrected. Empty only when `Word` is itself a full sentence. | target |
| `ExampleTranslation` | The example translated. Empty when `Example` is empty. | source |
| `Notes` | Only when it helps: part of speech, register (formal, slang, US or UK), irregular forms, a typical collocation, a false friend, a difference from a similar word. Empty most of the time. | source |

Rules:

- Use the sense the user actually met. When the conversation shows what the user did not understand, the translation and the example follow that sense, not the most common one.
- Fields are plain text. Use `<br>` for a line break inside a field and escape `<`, `>` and `&`. No Markdown.
- Every note gets the tag `esutoru-wordmine`.

## The card table

Both skills show cards in this table. Rows are numbered so the user can refer to them ("drop 3", "change the example in 2"). The two language columns are headed with the language names from the settings. The last column, "In Anki", lists the decks where the word already exists, or stays empty; it exists only when a duplicate check was made.

| # | English | Russian | Example | Example translation | Notes | In Anki |
|---|---|---|---|---|---|---|
| 1 | give up | сдаваться, бросать (что-либо) | I decided to give up smoking. | Я решил бросить курить. | phrasal verb; give up + -ing | |
| 2 | hindsight | ретроспектива, взгляд назад | In hindsight, we should have left earlier. | Оглядываясь назад, нам стоило уйти раньше. | usually "in hindsight" | Wordmine |

## The prepared set

`prepare-words` ends by writing the confirmed set into the conversation under the bold heading **Prepared cards**: one line with the count, the languages and the deck if one was named, then the card table above. Rows the user chose to keep although the word already exists carry `duplicate allowed` in the "In Anki" column after the deck names. That table is the handoff: `add-to-anki` takes the most recent **Prepared cards** table in the conversation, applies any changes the user asked for after it, and creates exactly those cards. A set that was cancelled or never confirmed is not written down.

## Sending notes to Anki

One `addNotes` request with every card, sent from a file (see "Requests that carry text" in `anki-connect.md`). `allowDuplicate` is `true` only for rows marked `duplicate allowed`; otherwise `false`. `duplicateScope: "deck"` limits Anki's own check to the target deck.

```json
{
  "action": "addNotes",
  "version": 6,
  "params": {
    "notes": [
      {
        "deckName": "Wordmine",
        "modelName": "Esutoru Wordmine (k3x9m2qa)",
        "fields": {
          "Word": "give up",
          "Translation": "сдаваться, бросать (что-либо)",
          "Example": "I decided to give up smoking.",
          "ExampleTranslation": "Я решил бросить курить.",
          "Notes": "phrasal verb; give up + -ing"
        },
        "tags": ["esutoru-wordmine"],
        "options": {"allowDuplicate": false, "duplicateScope": "deck"}
      }
    ]
  }
}
```

The answer is a list with one note id or `null` per note, in order. For every `null`, send that note alone with `addNote` to get the error text, and report it. Typical errors: "cannot create note because it is a duplicate" (the word is already in the target deck and duplicates were not allowed), "cannot create note because it is empty" (`Word` is empty), "deck was not found", "model was not found".

## Result table

After the request, one table with the columns `#`, `Word`, `Result`, where the result is `✅ added` or `❌ <error text>`. Never report a card as added when AnkiConnect returned `null` or an error for it.
