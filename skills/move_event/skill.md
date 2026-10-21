---
skill: move_event
help: move a meeting or appointment (“move the meeting to friday”)
samples: 14
train_only: event, when
acts: yes
---
# Move an event

Test skill for the move experiment (20 October 2026): only answers, no calendar.

## Slots
- event: text, required, ask: ask_event
- when: datetime, required, ask: ask_when

## Examples
- {please |}{move|push} {the|my} [{event}](event) to {when}
- {can|could} you {move|push} {the|my} [{event}](event) to {when}{?|}
- reschedule {the|my} [{event}](event){ to {when}|}
- move {the|my} [{event}](event) {from today |}to {when}
- I {want|need} to move {the|my} [{event}](event) to {when}
- move {the|my} [{event}](event)
- {reschedule|move} {the|my} [{event}](event) for {when}
- {postpone|delay|shift|bump} {the|my} [{event}](event) {to|until} {when}
- {bring forward|move up} {the|my} [{event}](event) to {when}

## Values: event
- meeting
- appointment
- call
- team meeting
- interview
- doctor's appointment
- standup
- dinner

## Values: when
- tomorrow
- friday
- next monday
- monday at 3pm
- next week
- tomorrow morning
- the 12th
- 10am

## Replies
- say: OK, {event} moves to {when}.
- ask_event: Which event?
- ask_when: To when?
