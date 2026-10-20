---
skill: move_file
help: move a file or folder (“move report.txt to documents”)
samples: 14
train_only: file, loc
acts: yes
---
# Move a file or folder

Test skill for the move experiment (20 October 2026): only answers, runs nothing.

## Slots
- name: text, required, ask: ask_name
- location: text, required, ask: ask_where

## Examples
- {please |}move [{file}](name) to {|the |my }[{loc}](location){| folder}
- move {the |my }[{file}](name) {file|folder} {to|into} {|the |my }[{loc}](location)
- {can|could} you move [{file}](name) {to|into} {|the |my }[{loc}](location){?|}
- move [{file}](name) {into|in} {|the |my }[{loc}](location){ please|}
- I {want|need} to move [{file}](name) to {|the |my }[{loc}](location)
- move [{file}](name)
- move {the|this} {file|folder} to {|the |my }[{loc}](location)

## Values: file
- report.txt
- notes.md
- budget.xlsx
- todo.txt
- photo.jpg
- invoice.pdf
- drafts
- receipts
- old stuff
- client-work

## Values: loc
- documents
- desktop
- downloads
- projects
- pictures
- archive
- work
- music

## Replies
- done: OK, {name} moves to {location}.
- ask_name: Which file or folder?
- ask_where: Where should I move it?
