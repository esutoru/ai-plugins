# Ideas

Backlog of plugins and skills to add to this marketplace and directions in which the existing ones should grow. A reminder, not a plan: nothing here is committed to until it moves to "done".

| # | Plugin | Idea | Description | Status |
|---|---|---|---|---|
| 1 | esutoru-wordmine | Interactive review of prepared words (working name: `to-interactive`) | A skill that follows `prepare-words` rather than replacing it. After the set is prepared in the chat, the user switches to an interactive mode: the skill generates a page with the card table where the user edits the cards directly instead of typing changes into the chat: delete rows, add new ones, fix any cell, partially rework the set. Claude or another agent reads and changes the same data. `add-to-anki` must be able to take the cards from that page and create the notes from them. The name still needs thought. | ❌ not done |
| 2 | esutoru-wordmine | Words from images | A skill that works with images: screenshots of textbook pages or notes written in books. From that material it prepares a list of words with examples in the Wordmine card format, so that the other skills (`prepare-words`, `add-to-anki`, the interactive review) can take it from there. | ❌ not done |
| 3 | esutoru-wordmine | Teacher and student word list | Interaction between a student and a teacher through a shared spreadsheet (Excel, Google Sheets or similar). The teacher adds words to the sheet during the lesson; the student points this skill at the sheet, works with the list through it, and creates Anki cards from it. | ❌ not done |

Status values: `❌ not done`, `🚧 in progress`, `✅ done`.
