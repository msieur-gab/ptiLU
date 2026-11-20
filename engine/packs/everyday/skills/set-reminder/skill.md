---
does: set reminder
label: set a reminder
acts: yes
---
A reminder on this device, once. A day without a time is 9:00. When a time could be two ("at 9"),
it asks which one.

## People say
- remind me (to) {task} {when}
- remind me {when} to {task}
- {when} remind me to {task}
- remind me to {task}
- remind me (about) {task} {when}
- remind me about {task}
- remind me {when}
- (set/add/make/create) a reminder (to/for/about) {task} {when}
- (set/add/make/create) a reminder (for/at/on) {when}
- (set/add/make/create) a reminder (to/for/about) {task}
- (set/add/make/create) a reminder
- don't let me forget to {task} ({when})
- (ping/nudge) me {when} (to/about) {task}

## Also said
- I need a reminder to water the plants tonight
- make sure I don't forget to pay the rent
- can you remind me later
- remember to buy milk tomorrow
- I keep forgetting to call the bank, remind me on monday

## What it needs
- {task}: some text. If it's missing, ask: What should I remind you of? | Remind you to do what?
- {when}: a date and time. If it's missing, ask: When? | When should I remind you?

## Samples
- task: call mum | buy milk | water the plants | send the invoice | oil the cedar box | book the dentist

## Does
reminder.add {when} {task}

## Replies
- done: I'll remind you to {task} on {when}. | OK: {task}, {when}.
