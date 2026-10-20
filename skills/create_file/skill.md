---
skill: create_file
help: create files (“new markdown file called notes”)
samples: 12
train_only: fname, fext, type, loc
acts: yes
---
# Create a file

Makes an empty file. A type ("a python file") becomes the extension; a name that already has one
("notes.md") keeps it; with neither, it's a plain text file.

## Slots
- name: text, required, ask: ask_name
- file_type: text
- location: text

## Examples
- {please |}{create|make|add|start} {a |a new |}file {called|named} [{fname}](name)
- {please |}{create|make|add|start|write} {a |}{new |}[{type}](file_type) file {called|named} [{fname}](name)
- {please |}{create|make|add|start|write} {a|an} [{type}](file_type) file {called|named} [{fname}](name){ in {|||the |my }[{loc}](location){||| folder}|}
- {create|make|add} {a |a new |}[{type}](file_type) file {called|named} [{fname}](name) {in|inside} {|||the |my }[{loc}](location){||| folder}
- {create|make|add} {a |a new |}file {called|named} [{fname}](name) {in|inside} {|||the |my }[{loc}](location){||| folder}
- {create|make|add} {a |a new |}file {called|named} [{fname}](name) here
- {create|make|add} {a |a new |}[{type}](file_type) file {called|named} [{fname}](name) {in|inside} {[this folder](location)|the [current folder](location)|the [current directory](location)|[this directory](location)|[current dir](location)}
- {create|make|add|touch} [{fext}](name){ please|}
- {create|make|add} {a |a new |}file [{fext}](name){ in {|||the |my }[{loc}](location){||| folder}|}
- {create|make|add} [{fext}](name) {in|inside} {|||the |my }[{loc}](location){||| folder}
- {create|make} [{fext}](name) here
- new [{type}](file_type) file [{fname}](name)
- new file [{fext}](name)
- new [{type}](file_type) {note|document|doc} {called|named} [{fname}](name)
- {make|create|start} {me |}{a |a new |}[{type}](file_type) {note|document|doc} {called|named} [{fname}](name)
- {can|could} you {create|make} {a |a new |}[{type}](file_type) file{ for me|}{?|}
- {can|could} you {create|make} {a |a new |}file {called|named} [{fname}](name){?|}
- I {need|want} {a |a new |}[{type}](file_type) file {called|named} [{fname}](name)
- I {need|want} {a |a new |}file {called|named} [{fext}](name)
- {create|make} {a |a new |}file{ please|}
- {create|make} {a |a new |}[{type}](file_type) file{ please|}
- {create|make} {a |a new |}[{type}](file_type) file {in|inside} {|||the |my }[{loc}](location){||| folder}
- {create|make} {a |a new |}file here
- {create|make} {a |a new |}file {in|inside} {|||the |my }[{loc}](location){||| folder} {called|named} [{fname}](name)
- {write|start} {a |}new {note|document} {called|named} [{fname}](name)
- touch [{fext}](name)
- {create|make|add|put} [{fext}](name) {on the|in the|in my|on my} {|||the |my }[{loc}](location){||| folder}
- {create|make|add} {a |a new |}[{type}](file_type) file {called|named} [{fname}](name) {on the|in my} {|||the |my }[{loc}](location){||| folder}
- {let's|lets} {create|make} {a |}[{type}](file_type) file {called|named} [{fname}](name)
- jot down {a |}[{fname}](name)
- {start|begin} a new {note|document} {called|named} [{fname}](name)
- {take|make} a note {called|named} [{fname}](name)

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

## Values: type
- markdown
- md
- text
- txt
- plain text
- python
- json
- html
- csv
- yaml
- javascript
- css
- Markdown

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

## Values: ext
- markdown: md → md
- text: txt, plain text → txt
- python: py → py
- json → json
- html → html
- csv → csv
- yaml: yml → yml
- javascript: js → js
- css → css

## Replies
- done: Created {file} in {where}. | Done. {file} is in {where}. | {file} created in {where}.
- default_type: You didn't say which type, so I made a plain text file.
- ask_name: What should I call the file? | OK. What's the file name?
