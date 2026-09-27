# AnkiConnect check

Shared procedure for Esutoru Wordmine skills. It answers one question: **can we talk to AnkiConnect right now?** It checks that Anki is installed, running, has the AnkiConnect add-on, and that the add-on answers HTTP on localhost. It never installs anything itself. When something is missing it tells the user exactly what to do, waits for them, and checks again.

Skills import this file and call its workflows. Follow them inline, in the current conversation, including their questions to the user.

## Rules for talking to Anki

These rules apply to every Wordmine skill, not only to this file.

- **Warn before acting.** Before running any command, tell the user in one short line what is about to run and what it touches. Example: "I will send one HTTP request to AnkiConnect on localhost and look for the Anki process. Nothing is installed or changed."
- **Everything in this file is read-only.** The probe sends `version` and `deckNames`, the diagnosis lists processes and looks for directories. None of it changes Anki or the collection.
- **Writes need explicit permission.** Any action that changes the collection (creating a note type, a deck or a note, changing add-on config) must first explain in plain words what will be created or changed, where, and why the plugin needs it, and then ask the user for permission with a yes/no question. Without a clear yes, do not perform the action, report it as skipped, and continue with whatever does not depend on it.
- **The user does the manual steps.** Installing Anki, opening it, installing the add-on and restarting Anki are the user's actions. Say so explicitly and never pretend to have done them.
- **Make the user's steps stand out.** Anything the user has to do goes in its own block, separated from the rest of the text, under the bold heading **Your steps**, as a numbered list where every step starts with a bold verb phrase (**Open Anki**, **Install the add-on**). Plain explanations stay outside that block. Never bury a required action inside a paragraph.
- **Never ask the user to confirm what you could not check.** Questions like "Is Anki open?" or "Is the add-on installed?" only confuse. Give instructions instead, in the form "if not done yet, do X", and let the next probe tell the truth. The only question per round is "check again or stop".
- **When the sandbox blocks a check, re-run it outside the sandbox right away.** Do not ask your own question first: say in one line that the sandbox blocked the read-only commands and that you are re-running them outside it, then re-run (in Claude Code with the Bash tool's sandbox override, in Codex with an escalated run). The user's tool shows its own approval prompt if the user has not allowed this. If the re-run is denied or still fails, state plainly that nothing can be inspected from inside the sandbox and fall back to instructions.
- **Keep tool output out of the conversation.** Report the interpreted result, not raw command output.

## Status model

Every check reports one of these values:

| Value | Meaning |
|---|---|
| `done` | Verified to be in place. |
| `to do` | Verified to be missing. The user has to act. |
| `could not check` | The command was blocked (sandbox, even when re-run outside it) or is not applicable on this platform. Give the instruction in the "if not done yet" form; do not ask the user to confirm. |
| `not checked` | Skipped because an earlier item is not `done`. |

The `status` workflow returns a record with these fields:

| Field | What it describes |
|---|---|
| `installed` | Anki desktop is installed. |
| `running` | Anki is running and a profile is open (deck list visible). |
| `addon` | The AnkiConnect add-on is installed. |
| `reachable` | AnkiConnect answered on the URL. `done` here implies the other three are `done`. |
| `note` | One sentence of extra detail when useful, for example "profile picker is open" or "port may be blocked by the sandbox". |

The `check-anki-connect` workflow returns one status line, which the calling skill continues with:

| Status line | Meaning |
|---|---|
| `ANKI_CONNECT: ok` | AnkiConnect answered and a profile is open. The caller may proceed. |
| `ANKI_CONNECT: unavailable <reason>` | The problem was not fixed. The caller must stop and must not retry on its own. |

`<reason>` is one of `anki-not-installed`, `anki-not-running`, `addon-missing`, `profile-not-open`, `blocked-by-sandbox`, `user-declined`.

Input for both workflows: none. If the environment variable `ANKI_CONNECT_URL` is set, use it instead of the default `http://127.0.0.1:8765`.

## Facts that shape the checks

- AnkiConnect runs inside the Anki process. When Anki is closed, nothing listens on the port. One successful HTTP call therefore proves all three: Anki runs, the add-on is installed, the API answers.
- Command-line requests carry no `Origin` header, so AnkiConnect does not show its permission dialog and needs no configuration.
- A refused connection cannot tell "Anki is closed" from "add-on is missing". Only the process list and the file system can tell them apart, and the agent sandbox may block both. A blocked check means `could not check`, never `to do`.
- The `version` action answers even while Anki sits on the profile picker. `deckNames` fails there with "collection is not available". Check both.
- AnkiConnect add-on code: `2055492159`. Installed add-ons live in `<Anki data dir>/addons21/<code>/`.
- Anki download page: <https://apps.ankiweb.net>. AnkiConnect page: <https://ankiweb.net/shared/info/2055492159>.

## HTTP probe

Prefer `curl`. It ships with macOS, Windows 10 and later, and most Linux distributions.

```bash
curl -s -m 5 -X POST "$ANKI_CONNECT_URL" -d '{"action":"version","version":6}'
curl -s -m 5 -X POST "$ANKI_CONNECT_URL" -d '{"action":"deckNames","version":6}'
```

Expected answers: `{"result": 6, "error": null}` (result 6 or higher) and `{"result": ["Default", ...], "error": null}`.

Fallbacks when `curl` is missing:

```bash
# Any platform with Python 3
python3 -c "import urllib.request;print(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8765',data=b'{\"action\":\"version\",\"version\":6}')).read().decode())"
```

```powershell
# Native Windows shell
Invoke-RestMethod -Uri http://127.0.0.1:8765 -Method Post -Body '{"action":"version","version":6}' | ConvertTo-Json -Compress
```

Interpretation:

| Observation | Meaning |
|---|---|
| `version` answers, `deckNames` answers | reachable, profile open |
| `version` answers, `deckNames` returns an error mentioning collection | reachable, profile picker is open |
| connection refused, timeout, or curl exit code 7 or 28 | not reachable, diagnose |
| error text mentions "Operation not permitted", proxy, or sandbox | blocked by the sandbox, `could not check` |

## Platform diagnosis

Detect the platform with `uname -s`: `Darwin`, `Linux`, or `MINGW*` / `MSYS*` / `CYGWIN*` for Windows shells. If `uname` does not exist, the shell is native Windows (PowerShell or cmd).

Every command here is read-only.

| Question | macOS | Linux | Windows |
|---|---|---|---|
| Anki process running? | `pgrep -x Anki` | `pgrep -x anki`; flatpak: `flatpak ps` lists `net.ankiweb.Anki` | `tasklist \| grep -i anki.exe` (Git Bash) or `tasklist /FI "IMAGENAME eq anki.exe"` |
| Anki installed? | `ls -d /Applications/Anki.app ~/Applications/Anki.app`; fallback `mdfind "kMDItemCFBundleIdentifier == net.ankiweb.dtop"` | `command -v anki`; `flatpak list --app \| grep net.ankiweb.Anki` | `"$LOCALAPPDATA/Programs/Anki/anki.exe"` or `"$PROGRAMFILES/Anki/anki.exe"` |
| AnkiConnect installed? | `~/Library/Application Support/Anki2/addons21/2055492159` | `~/.local/share/Anki2/addons21/2055492159`; flatpak: `~/.var/app/net.ankiweb.Anki/data/Anki2/addons21/2055492159` | `"$APPDATA/Anki2/addons21/2055492159"` |

Rules for reading the results:

- Use the exact process name (`pgrep -x`). A loose match like `pgrep -fi anki` catches unrelated system processes.
- "Operation not permitted", "Cannot get process list", "sysmond service not found", or "Access is denied" mean the sandbox blocked the check. Re-run the blocked commands outside the sandbox right away (see the rules above). If that is denied or still fails, record `could not check` for every blocked item.
- A missing add-on directory while the data directory itself is readable means the add-on is really missing.
- A custom Anki data directory or a portable install makes the file checks unreliable. Treat their negative answers as `could not check` when the user says Anki is installed.

## What the user has to do

Single source of the instructions shown to the user. Show them under the bold heading **Your steps**, followed by "These steps are yours to do; I cannot do them for you.", as one numbered list in this order, only for items that are not `done`. Every step starts with a bold verb phrase; for `could not check` items the bold part is **If not done yet, ...** so the user can skip what is already in place. Never turn an instruction into a question.

Example of the block:

**Your steps** (these are yours to do; I cannot do them for you)

1. **Open Anki** and wait until the main window with the deck list is visible. If the profile picker is showing, pick a profile.
2. **If not done yet, install the AnkiConnect add-on**: in Anki open Tools → Add-ons → Get Add-ons..., paste the code `2055492159`, press OK, then fully quit and reopen Anki.

| Item | Instruction |
|---|---|
| installed | **Install Anki**: download it from <https://apps.ankiweb.net>, install it, open it and create or pick a profile. |
| running | **Open Anki** and wait until the main window with the deck list is visible. If the profile picker is showing, pick a profile. |
| addon | **Install the AnkiConnect add-on**: in Anki open Tools → Add-ons → Get Add-ons..., paste the code `2055492159`, press OK, then fully quit and reopen Anki. |
| reachable, while the three above are `done` | **Check the port or the sandbox**: either the add-on config changed the port (set `ANKI_CONNECT_URL` to the new address), or the agent sandbox blocks localhost. In Claude Code run `/sandbox` to allow local network access, or approve running the probe outside the sandbox. |

When nothing could be checked at all, say so first: "I could not inspect Anki from inside the sandbox, so I cannot tell what is already in place. Here is the full list; skip the steps you have already done." Then show all four instructions with the "If not done yet:" prefix.

## Workflows

```flowmd
let default_url = "http://127.0.0.1:8765"
let max_rounds = 3

fragment "probe" (url) {
  run "curl -s -m 5 -X POST $url -d '{\"action\":\"version\",\"version\":6}'"
  if curl is missing {
    run the Python 3 or PowerShell fallback from the HTTP probe section
  }
  if version answered {
    run "curl -s -m 5 -X POST $url -d '{\"action\":\"deckNames\",\"version\":6}'"
    if deckNames returned an error about the collection {
      return "profile-not-open"
    }
    return "ok"
  }
  if error text points at a sandbox or proxy {
    return "blocked"
  }
  return "unreachable"
}

fragment "diagnose" () {
  let platform = run "uname -s"
  inspect Anki process, install location, and add-on directory using the platform table
  if any check was blocked by the sandbox {
    summarize "The sandbox blocked the read-only commands that list processes and look for Anki's folders. Re-running them outside the sandbox."
    rerun the blocked commands outside the sandbox
    if still blocked or denied {
      summarize "I could not inspect Anki from inside the sandbox, so I cannot tell what is already in place."
      record every blocked item as "could not check"
    }
  }
  ensure blocked checks are recorded as "could not check", not as "to do"
  return record { installed, running, addon }
}

workflow "status" () {
  step "Warn" {
    summarize "I will send one HTTP request to AnkiConnect on localhost and, if it does not answer, look for the Anki process and its folders. Nothing is installed or changed."
  }

  step "Probe" {
    let url = value of ANKI_CONNECT_URL if set, else $default_url
    let probe_result = call "probe"(url: $url)
    if $probe_result == "ok" {
      return record { installed: "done", running: "done", addon: "done", reachable: "done", note: "" }
    }
    if $probe_result == "profile-not-open" {
      return record { installed: "done", running: "to do", addon: "done", reachable: "done", note: "Anki is open on the profile picker" }
    }
  }

  step "Diagnose" {
    if $probe_result == "blocked" {
      summarize "The sandbox blocked the read-only HTTP request to AnkiConnect on localhost. Re-running it outside the sandbox."
      let probe_result = call "probe"(url: $url) outside the sandbox
      if $probe_result == "ok" or $probe_result == "profile-not-open" {
        return the same records as in the Probe step
      }
    }
    let found = call "diagnose"()
    if $probe_result == "blocked" {
      return record { $found, reachable: "could not check", note: "the sandbox blocked the request to localhost" }
    }
    if $found.installed == "done" and $found.running == "done" and $found.addon == "done" {
      return record { $found, reachable: "to do", note: "everything looks installed but the port does not answer" }
    }
    return record { $found, reachable: "to do", note: "" }
  }
}

fragment "guide-user" (status) {
  if every field of $status is "could not check" {
    summarize "I could not inspect Anki from inside the sandbox, so I cannot tell what is already in place. Here is the full list; skip the steps you have already done."
  }
  show the bold heading "Your steps" and "These steps are yours to do; I cannot do them for you."
  show one numbered list with the instruction for each field that is "to do" or "could not check", in the order installed, running, addon, reachable, each starting with its bold verb phrase
  use "If not done yet, ..." as the bold part for "could not check" items
  never ask the user to confirm the state of an item
  let answer = ask "Tell me when to check again." {
    "Done, check again": "I will run the checks once more",
    "Stop for now": "I will report what is still missing"
  }
  return $answer
}

workflow "check-anki-connect" () {
  step "Check and recover" {
    loop max $max_rounds {
      let status = call "status"()
      if $status.reachable == "done" and $status.running == "done" {
        return "ANKI_CONNECT: ok"
      }
      let answer = call "guide-user"(status: $status)
      if $answer is "Stop for now" {
        return "ANKI_CONNECT: unavailable user-declined"
      }
    }
  }

  step "Finish" {
    if $status.reachable == "could not check" {
      return "ANKI_CONNECT: unavailable blocked-by-sandbox"
    }
    if $status.installed == "to do" {
      return "ANKI_CONNECT: unavailable anki-not-installed"
    }
    if $status.running == "to do" and $status.note mentions profile {
      return "ANKI_CONNECT: unavailable profile-not-open"
    }
    if $status.running == "to do" {
      return "ANKI_CONNECT: unavailable anki-not-running"
    }
    if $status.addon == "to do" {
      return "ANKI_CONNECT: unavailable addon-missing"
    }
    return "ANKI_CONNECT: unavailable blocked-by-sandbox"
  }
}
```
