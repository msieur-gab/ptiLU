---
skill: create_folder
help: create folders (“make a folder called drafts in documents”)
samples: 14
train_only: folder, loc
acts: yes
---
# Create a folder

Makes a folder, in your home folder unless you say where. "documents", "downloads" and the other
standard folders map to their real names; "here" means the current folder. The name is quoted
before it reaches the command line.

## Slots
- name: text, required, ask: ask_name
- location: folder

## Examples
- {please |}{create|make|add|set up|build} {a |a new |}{folder|directory|dir} {called|named} [{folder}](name)
- {please |}{create|make|add} {a |a new |}{folder|directory} {called|named} [{folder}](name) {in|inside|under|within} {|||the |my }[{loc}](location){||| folder}
- {create|make} {a |a new |}{folder|directory} {called|named|} [{folder}](name) here
- {create|make} {a |a new |}{folder|directory} {called|named} [{folder}](name) {in|inside} {[this folder](location)|the [current folder](location)|the [current directory](location)|[this directory](location)|[current dir](location)}
- {create|make|add} {a |a new |}{folder|directory} {in|inside} {|||the |my }[{loc}](location){||| folder} {called|named} [{folder}](name)
- {create|make} {a |a new |}{folder|directory} here {called|named} [{folder}](name)
- new folder [{folder}](name){ please|}
- new {folder|directory} {in|inside} {|||the |my }[{loc}](location){||| folder} {called|named} [{folder}](name)
- {can|could} you {create|make} {a |a new |}folder {called|named} [{folder}](name){ for me|}{?|}
- {can|could} you {create|make} {a |a new |}folder {in|inside} {|||the |my }[{loc}](location){||| folder}{?|}
- I {need|want} {a |a new |}{folder|directory} {called|named|for} [{folder}](name){ in {|||the |my }[{loc}](location){||| folder}|}
- {create|make} {a |a new |}{folder|directory}{ please|}
- {create|make} {a |a new |}{folder|directory} {in|inside} {|||the |my }[{loc}](location){||| folder}
- {create|make} {a |a new |}{folder|directory} here
- {make|create} [{folder}](name) {folder|directory}{ in {|||the |my }[{loc}](location){||| folder}|}
- {add|create} {a |}subfolder {called|named} [{folder}](name) {in|inside|to} {|||the |my }[{loc}](location){||| folder}
- mkdir [{folder}](name)
- {please |}{put|add} {a |a new |}folder {called|named} [{folder}](name) {on|in} {|||the |my }[{loc}](location){||| folder}
- {let's|lets} {create|make} {a |}{folder|directory} {called|named} [{folder}](name)
- {create|make} {a |a new |}{folder|directory} {called|named} [{folder}](name) {on the|in my|in the} {|||the |my }[{loc}](location){||| folder}
- {create|make} a {folder|directory} {called|named} "[{folder}](name)"
- {create|make} a {folder|directory} {called|named} '[{folder}](name)'

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
- done: Done. {name} is now in {where}. | Created the folder {name} in {where}. | Folder {name} created in {where}.
- ask_name: What should I call the folder? | Sure. What name do you want for the folder?
