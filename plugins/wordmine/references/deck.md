# Wordmine deck

Shared procedures for the deck that receives Wordmine cards: `choose` lets the user pick the default deck during setup, `ensure` makes sure a deck exists before cards are added. Card-making skills accept a different deck name per call; the settings only hold the default.

Skills import this file and call its workflows. Follow them inline, in the current conversation. The rules for talking to Anki from `anki-connect.md` apply: `status` only reads, `ensure` creates a deck and therefore asks for permission first.

## Contract

- Precondition: AnkiConnect is reachable and a profile is open (`status` from `anki-connect.md` reported `reachable: done` and `running: done`).
- Input of `status` and `ensure`: `deck`, a deck name (from the settings in `config.md` or from the user's request). `ensure` also takes `confirmed`: `true` when the user has just chosen to create this deck, so no permission question is repeated; `false` (default) when the deck comes from the settings or from a card request.
- Input of `choose`: `current`, the deck name from the settings if any.
- Output of `status`: `DECK: ok`, `DECK: missing` or `DECK: unavailable`.
- Output of `ensure`: `DECK: ok`, `DECK: skipped` (user declined creation) or `DECK: unavailable`.
- Output of `choose`: record with `status` (as for `ensure`) and `deck`, the chosen name.

Anki deck names use `::` for nesting, for example `Languages::Wordmine`. `createDeck` creates the missing parents too.

## Choosing the default deck

One question, then act. The user's choice is the permission: picking "create a new deck" already authorises creating it, so `ensure` must not ask again. Rules for the options:

- The question tool shows at most four options, and the user can always type another name. Offer up to three existing decks plus the create option.
- Order of the existing decks: the current setting if it exists in Anki, then decks whose name contains "Wordmine", then the first top-level decks alphabetically. Skip `Default` unless it is the only deck. Offer fewer when there are fewer.
- The create option carries the suggested name inline: "Create a new deck `Wordmine`". To create a deck with another name the user types it as a custom answer; a typed name that does not exist is created without another question. Use `::` for nesting, for example `Languages::Wordmine`.
- Before the question, list all decks in one compact line so the user knows what they can type.
- Say explicitly that this is only the default: every card-making skill lets the user name a different deck for that call.

## Workflows

```flowmd
let default_url = "http://127.0.0.1:8765"
let suggested_new_deck = "Wordmine"

workflow "status" (deck) {
  step "Warn" {
    summarize "I will ask AnkiConnect for the list of decks. This only reads."
  }

  step "Check" {
    let url = value of ANKI_CONNECT_URL if set, else $default_url
    run "curl -s -m 5 -X POST $url -d '{\"action\":\"deckNames\",\"version\":6}'"
    if the request failed or the answer has a non-null error {
      return "DECK: unavailable"
    }
    if $deck is in the returned list, compared exactly {
      return "DECK: ok"
    }
    return "DECK: missing"
  }
}

workflow "choose" (current) {
  step "List decks" {
    summarize "I will ask AnkiConnect for the list of decks. This only reads."
    let url = value of ANKI_CONNECT_URL if set, else $default_url
    run "curl -s -m 5 -X POST $url -d '{\"action\":\"deckNames\",\"version\":6}'"
    if the request failed or the answer has a non-null error {
      return record { status: "DECK: unavailable", deck: $current }
    }
    let decks = the returned list
  }

  step "Ask" {
    summarize "New Wordmine cards go to one deck by default. You can still name another deck whenever you call a card-making skill. Your decks: $decks"
    let options = up to three decks from $decks chosen by the rules above
    let answer = ask "Which deck should receive Wordmine cards by default? Type another name to create a deck with that name." {
      each of $options: "Use this existing deck",
      "Create a new deck `$suggested_new_deck`": "I will create it in Anki right away"
    }
    if $answer is the create option {
      let name = $suggested_new_deck
    } else {
      let name = $answer
    }
  }

  step "Make sure it exists" {
    let result = call "ensure"(deck: $name, confirmed: true)
    return record { status: $result, deck: $name }
  }
}

workflow "ensure" (deck, confirmed) {
  step "Check" {
    let current = call "status"(deck: $deck)
    if $current is not "DECK: missing" {
      return $current
    }
  }

  step "Ask permission" {
    if $confirmed {
      summarize "Creating the deck '$deck' as you chose."
      skip to the Create step
    }
    summarize "The deck '$deck' does not exist in your collection. Wordmine needs it as the place where new cards go. I can create it now through AnkiConnect; it will be an empty deck named '$deck' and nothing else changes."
    let answer = ask "Create the deck '$deck' in Anki?" {
      "Yes, create it": "I will create the deck now",
      "No": "I will not create it; you can create it yourself in Anki or change the deck name in the settings"
    }
    if $answer is "No" {
      return "DECK: skipped"
    }
  }

  step "Create" {
    let url = value of ANKI_CONNECT_URL if set, else $default_url
    run "curl -s -m 5 -X POST $url -d '{\"action\":\"createDeck\",\"version\":6,\"params\":{\"deck\":\"$deck\"}}'"
    if the answer has a non-null error {
      summarize "AnkiConnect could not create the deck: $last_error"
      return "DECK: unavailable"
    }
    return "DECK: ok"
  }
}
```
