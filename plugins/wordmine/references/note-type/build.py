#!/usr/bin/env python3
"""Regenerates createModel.json from front.html, back.html, card.js and style.css.

Run it after editing any of those files:  python3 build.py
The skills send createModel.json to AnkiConnect with NOTE_TYPE_NAME replaced by
the configured note type name; they never assemble the payload by hand.
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
FIELDS = ["Word", "Translation", "Examples", "Notes"]


def read(name: str) -> str:
    return (HERE / name).read_text(encoding="utf-8")


def side(name: str) -> str:
    script = "<script>\n" + read("card.js").rstrip("\n") + "\n</script>\n"
    return read(name).rstrip("\n") + "\n\n" + script


payload = {
    "action": "createModel",
    "version": 6,
    "params": {
        "modelName": "NOTE_TYPE_NAME",
        "inOrderFields": FIELDS,
        "css": read("style.css"),
        "isCloze": False,
        "cardTemplates": [
            {"Name": "Card 1", "Front": side("front.html"), "Back": side("back.html")}
        ],
    },
}

out = HERE / "createModel.json"
out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size} bytes)")
