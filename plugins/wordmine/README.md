# esutoru-wordmine

Esutoru Wordmine plugin for Claude Code and Codex. Work in progress.

Wordmine turns words and phrases into Anki cards. The cards are created in your Anki collection through the AnkiConnect add-on. Each card shows a word or phrase in the language you are learning on the front, and the translation, an example sentence in both languages and short notes on the back.

## Install

```bash
# Claude Code
claude plugin marketplace add esutoru/ai-plugins
claude plugin install esutoru-wordmine@ai-plugins

# Codex
codex plugin marketplace add esutoru/ai-plugins
```

## Setup

Run the setup skill once after installing the plugin and follow its instructions:

```
/esutoru-wordmine:setup-esutoru-wordmine-plugin
```

It checks everything Wordmine needs (Anki, the AnkiConnect add-on, the deck for new cards, the Wordmine note type with its fields), asks only for what is still missing, offers to create the deck and the note type in Anki with your permission, tells you what to install or open, and checks again. You can run it as many times as you like, for example if card creation stops working.

On the first run it asks three things: which deck receives cards by default, under which name to create the note type, and which languages your cards use. The target language is the one you are learning (the front of the card); the source language is yours (the back). The default is English → Russian.

Your choices are saved in `~/.config/esutoru-wordmine/config.json`:

```json
{
  "deck": "Wordmine",
  "noteType": "Esutoru Wordmine (k3x9m2qa)",
  "targetLanguage": "English",
  "sourceLanguage": "Russian"
}
```

Edit that file and run the setup again to change the default deck, the note type name or the languages.

## Adding cards

Two steps. First collect and review the words:

```
/esutoru-wordmine:prepare-words
/esutoru-wordmine:prepare-words give up, hindsight, on the fence
```

`prepare-words` takes the words from the command line and from the conversation so far (words you asked about, marked as new, or asked to remember), builds one card per word and shows them as a table: the word or phrase, the translation, an example sentence, its translation and notes. The table also tells which words are already in Anki and in which decks. You can change the list, drop or add words, edit any cell, keep or drop the words that already exist, or name a deck. Nothing is created yet; the confirmed set stays in the conversation.

Then create the cards:

```
/esutoru-wordmine:add-to-anki
/esutoru-wordmine:add-to-anki deck Languages::English
```

`add-to-anki` takes the confirmed set, checks Anki, the deck and the note type, shows what it is about to create, asks once and creates the notes. It also accepts an explicit list typed after the command. If there is no confirmed set and no explicit list, it says so and points you to `prepare-words`.

Both skills need the setup to have been run and Anki to be open with the deck list visible. Otherwise they stop right away and tell you what to do: run the setup, or open Anki.

Cards go to the default deck from the settings unless you name another deck. Every note gets the tag `esutoru-wordmine`.

## Skills

| Skill | Description |
|-------|-------------|
| `setup-esutoru-wordmine-plugin` | One-time setup. Verifies Anki, AnkiConnect, the deck, the Wordmine note type and the languages, guiding you through fixes. Run it once after installing and again if card creation starts failing. |
| `prepare-words` | Collects words and phrases from the conversation or the command line, builds a card for each, shows the set with the words already in Anki, and lets you confirm or change it. Creates nothing. |
| `add-to-anki` | Creates the confirmed cards (or an explicit list of words) in Anki after one confirmation. |
