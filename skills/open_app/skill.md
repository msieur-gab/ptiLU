---
skill: open_app
help: open apps (“open the terminal”)
action: run
command: "{app} &"
samples: 16
acts: yes
does: open app
---
# Open an app

Starts a desktop application on the device. Add an app by adding a line under Values:
the name, the other words people use for it, then the command after the arrow.

## Slots
- app: list app, required, guess, ask: ask_app, invalid: unknown, ignore: app application program window

## Examples
- {open|launch|start|run} {the |my |}[{app}](app)
- {please |}{open|launch|start} {the |}[{app}](app){ please|}
- {can|could|would} you {open|launch|start} {the |a |}[{app}](app){ please|}{?|}
- {bring up|fire up|pull up|show} {the |my |}[{app}](app)
- I {need|want} {the |a |}[{app}](app)
- I {want|need} to use the [{app}](app)
- [{app}](app){ please|}
- {open|launch} {a |}new [{app}](app) window
- {give me|get me} {a |the |}[{app}](app)
- {open|start} {up |}{the |}[{app}](app) {app|application|program}
- {open|launch|start} {an app|an application|a program|something}{ please|}
- {let's|lets} open the [{app}](app)
- {switch to|go to} the [{app}](app)

## Values: app
- terminal: Terminal, console, shell, command line, cli, term → x-terminal-emulator
- browser: Browser, web browser, internet, web → x-www-browser
- Firefox browser: firefox → firefox
- Chromium browser: chromium, chrome, chrome browser → chromium
- file manager: files, file explorer, explorer, finder, folders → xdg-open "$HOME"
- text editor: editor, notepad, mousepad → mousepad
- calculator: calc → galculator
- settings: system settings, preferences, control panel → xfce4-settings-manager

## Replies
- done: Opening the {app}. | Starting the {app}.
- ask_app: Which app? I can open the {choices}.
- unknown: I don't know an app called “{value}”. I can open the {choices}.
