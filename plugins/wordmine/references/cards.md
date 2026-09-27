# Wordmine cards

Shared definition of what a Wordmine card contains, how a prepared set of cards is written down in the conversation so that one skill can hand it to another, and how the notes are sent to Anki. `prepare-words` builds and confirms the set with one example per card; `add-to-anki` completes the examples to ten and creates the notes.

## Languages

Languages come from the settings (`config.md`): `targetLanguage` is the language being learned, `sourceLanguage` is the user's own language. Both are required; `preflight.md` stops the skill when either is missing. The target language is always the language of `Word` and of the example sentences, even when the user typed the word in the source language ("как будет 'сдаться'" gives a card for `give up`).

## Fields

One card per word or phrase, one note of the Wordmine note type (`note-type.md`).

| Field | Content | Language |
|---|---|---|
| `Word` | The word, phrase, phrasal verb, idiom or whole sentence, in dictionary form: `give up`, not `gave up`; `hindsight`, not `in hindsight` unless the user asked for the expression. A whole sentence stays a sentence when the user wants to learn it as one. Always filled. | target |
| `Translation` | The translation that matches the sense the user met. Two or three translations separated by commas when the word really has several close senses; not the whole dictionary entry. | source |
| `Examples` | Ten example sentences, each with its translation, as one JSON array (see below). The first one is the example the user confirmed in `prepare-words`; the other nine are generated in `add-to-anki`. Empty (`[]`) only when `Word` is itself a whole sentence. | target + source |
| `Notes` | Only when it helps: part of speech, register (formal, slang, US or UK), irregular forms, a typical collocation, a false friend, a difference from a similar word. Empty most of the time. | source |

Rules:

- Use the sense the user actually met. When the conversation shows what the user did not understand, the translation and the examples follow that sense, not the most common one.
- Fields are plain text. Use `<br>` for a line break inside a field and escape `<`, `>` and `&` as `&lt;`, `&gt;` and `&amp;`. No Markdown.
- Every note gets the tag `esutoru-wordmine`.

## The examples

The card shows a different example on every review, so the user learns the word rather than one sentence (`note-type.md` explains the mechanism). This works only when the examples are many and varied.

The work is split so that the user reviews one example, not ten. `prepare-words` builds and shows exactly one example per card, the one that best proves that the sense was understood: when the word was taken from a sentence the user wrote or read, that sentence, lightly corrected; otherwise a new one. `add-to-anki` keeps that example as number 1 and generates the other nine right before creating the notes, without showing them; the user sees them on the cards.

- Exactly ten per card in Anki. Example 1 is the confirmed one, untouched.
- All ten use the sense in `Translation`. Vary the context (work, home, travel, news, small talk), the grammatical form (tense, person, number, question, negation, passive where natural) and the position of the word in the sentence. No two examples with the same structure or the same surrounding words.
- Natural sentences of eight to sixteen words, the kind a native speaker would say or write. Nothing that only makes sense with the dictionary entry in mind.
- In the target sentence, the form of the word as it appears there is wrapped in `<b>` and `</b>`: `I finally <b>gave up</b> smoking last year.` For multi-word items wrap the whole item, including words the sentence puts between its parts (`<b>gave</b> it <b>up</b>` for a split phrasal verb).
- The `source` sentence is a translation of that sentence into the source language, natural in that language, with nothing wrapped.

Stored in the `Examples` field as one line of JSON, an array of objects with the keys `target` and `source`, in this order, with the escaping rule above applied inside both strings:

```json
[{"target":"I finally <b>gave up</b> smoking last year.","source":"В прошлом году я наконец бросил курить."},{"target":"Don't <b>give up</b> just because the first attempt failed.","source":"Не сдавайся только потому, что первая попытка не удалась."}]
```

## The card table

Both skills show cards in this table. Rows are numbered so the user can refer to them ("drop 3", "change the translation in 2"). The two language columns are headed with the language names from the settings. The last column, "In Anki", lists the decks where the word already exists, or stays empty; it exists only when a duplicate check was made.

| # | English | Russian | Example | Example translation | Notes | In Anki |
|---|---|---|---|---|---|---|
| 1 | give up | сдаваться, бросать (что-либо) | I finally **gave up** smoking last year. | В прошлом году я наконец бросил курить. | phrasal verb; give up + -ing | |
| 2 | hindsight | ретроспектива, взгляд назад | In **hindsight**, we should have left earlier. | Оглядываясь назад, нам стоило уйти раньше. | usually "in hindsight" | Wordmine |

The "Example" columns hold example 1 only. The bold part of the target sentence is shown with `**` in the table and becomes `<b>` in the field. A card whose `Word` is a whole sentence leaves both example cells empty. The other nine examples are never listed in the conversation.

## The prepared set

`prepare-words` ends by writing the confirmed set into the conversation under the bold heading **Prepared cards**: one line with the count, the languages and the deck if one was named, then the card table above. Rows the user chose to keep although the word already exists carry `duplicate allowed` in the "In Anki" column after the deck names. That block is the handoff: `add-to-anki` takes the most recent **Prepared cards** block in the conversation, applies any changes the user asked for after it, generates the remaining nine examples for every card, and creates exactly those cards. A set that was cancelled or never confirmed is not written down.

## Sending notes to Anki

One `addNotes` request with every card, sent from a file (see "Requests that carry text" in `anki-connect.md`). `allowDuplicate` is `true` only for rows marked `duplicate allowed`; otherwise `false`. `duplicateScope: "deck"` limits Anki's own check to the target deck. The `Examples` value is the JSON array as a string, so inside the request its quotes are escaped:

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
          "Examples": "[{\"target\":\"I finally <b>gave up</b> smoking last year.\",\"source\":\"В прошлом году я наконец бросил курить.\"},{\"target\":\"Don't <b>give up</b> just because the first attempt failed.\",\"source\":\"Не сдавайся только потому, что первая попытка не удалась.\"}]",
          "Notes": "phrasal verb; give up + -ing"
        },
        "tags": ["esutoru-wordmine"],
        "options": {"allowDuplicate": false, "duplicateScope": "deck"}
      }
    ]
  }
}
```

Before sending, check that every `Examples` value parses as JSON on its own; a broken array makes the card show no example at all. The answer is a list with one note id or `null` per note, in order. For every `null`, send that note alone with `addNote` to get the error text, and report it. Typical errors: "cannot create note because it is a duplicate" (the word is already in the target deck and duplicates were not allowed), "cannot create note because it is empty" (`Word` is empty), "deck was not found", "model was not found".

## Result table

After the request, one table with the columns `#`, `Word`, `Result`, where the result is `✅ added` or `❌ <error text>`. Never report a card as added when AnkiConnect returned `null` or an error for it.
