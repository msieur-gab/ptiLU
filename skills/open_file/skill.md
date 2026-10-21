---
skill: open_file
help: open files and folders (“open budget.csv”)
samples: 22
train_only: fname, fext, folder, loc
acts: yes
does: open file folder
---
# Open a file or folder

Opens a file or a folder with its default app. If what you named is actually an app
("open the terminal"), it hands over to open_app.

## Slots
- name: text, ask: ask_which
- location: text, ask: ask_where

## Examples
- {open|show|show me|display|view|pull up|bring up} {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder}
- {open|show me|display} {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder} {in|from|inside} {|||the |my }[{loc}](location){||| folder}
- {can|could} you open {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder}{ for me|}{?|}
- I {want|need} to {see|read|look at|edit} {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder}
- {please |}open {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder}{ please|}
- {open|show} {up |}{my |}{[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder}
- {let's|lets} {look at|open} {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder}
- {open|show me} what's in {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder}
- {go to|take me to|jump to} the {|||the |my }[{loc}](location){||| folder} folder
- {open|show me} {the |my |}{|||the |my }[{loc}](location){||| folder} folder
- {open|edit} {[{fext}](name)|[{fext}](name)|the [{fname}](name) file|the [{folder}](name) folder} {on the|in my} {|||the |my }[{loc}](location){||| folder}
- open a file{ please|}
- {open|show me} {a|the} file

## Values: fname
- notes
- todo
- readme
- ideas
- shopping list
- journal
- draft
- meeting notes
- plan
- index
- config
- main
- budget
- diary
- reading list
- brief
- changelog
- Report2026
- scratch
- recipe
- packing list
- agenda
- log
- summary
- letter to mom
- tasks
- daily journal
- grocery list
- project notes
- release notes
- book ideas
- travel plan
- workout log
- gift ideas
- call notes
- monthly report
- bug list
- draft for friday

## Values: fext
- notes.md
- todo.txt
- README.md
- main.py
- index.html
- data.json
- budget.csv
- config.yml
- style.css
- app.js
- ideas.md
- log.txt
- plan-2026.md
- test_run.py
- shopping.txt
- trip.md
- draft_v2.md

## Values: folder
- reports
- ideas
- invoices
- holiday photos
- project-x
- 2026_budget
- Recipes
- todo
- drafts
- scans
- sketches
- kids drawings
- backup
- old stuff
- receipts
- client-work
- music
- notes
- archive
- taxes
- WoodShop
- garden plans
- travel
- screenshots
- temp
- prototypes
- Japan trip
- letters
- q3-review
- experiments
- assets
- maps
- fonts
- homework
- PhotosRaw
- inbox
- misc
- v2
- lab
- journal
- pitch deck
- school
- bills
- cedar box
- readings
- tools
- demo
- sandbox
- wip
- tax returns
- family photos
- old invoices
- work in progress
- summer camp
- car stuff
- client projects
- music lessons
- game saves
- house plans
- my scripts
- trip to lisbon
- wedding pics
- spare parts
- recipes from grandma
- q4 planning
- design ideas
- phone backup

## Values: loc
- documents
- Documents
- desktop
- downloads
- projects
- music
- pictures
- home
- photos
- work
- school
- notes
- archive
- Desktop
- src
- inbox

## Replies
- ask_which: Which file or folder? Say its name.
- ask_where: In which folder? Say its name, for example Documents.
- done: Opening {target}. | Here's {target}.
- ask_name: Which file or folder should I open?
