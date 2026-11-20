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
- I need a reminder to [water the plants](task) tonight
- make sure I don't forget to [pay the rent](task)
- can you remind me later
- remember to [buy milk](task) tomorrow
- I keep forgetting to [call the bank](task), remind me on monday

Written by Claude on 20 November 2026 for Gab to review: varied sentences, values marked.
- remind me to [return the library books](task) on thursday
- please remind me to [defrost the chicken](task) this afternoon
- could you remind me to [phone the plumber](task) tomorrow morning
- in two hours remind me to [take the laundry out](task)
- I must [renew the parking permit](task) next week, can you remind me
- remind me on saturday to [buy flowers for Lea](task)
- can you make sure I [call grandma](task) tonight
- set a reminder to [sand the cedar lid](task) at 5pm
- add a reminder to [check the glue joints](task) in 30 minutes
- I'd like a reminder to [email the accountant](task) on monday at 10
- don't let me forget to [pack the chargers](task)
- remind me to [stretch my back](task) in 45 minutes
- next friday remind me to [pay the electricity bill](task)
- remind me about [the dentist appointment](task) tomorrow at 8
- nudge me to [drink water](task) in an hour
- ping me at noon to [move the car](task)
- please set a reminder for me to [order more sandpaper](task)
- make a reminder to [send the invoice to Romain](task) tonight
- could you remind me later to [answer Eva's message](task)
- tomorrow remind me to [bring the drill back](task)
- remind me at 7 to [wake the kids](task)
- I need you to remind me to [file the tax return](task) on the 30th
- set up a reminder to [water the herbs](task) every evening
- remind me in 10 minutes to [turn off the oven](task)
- remind me to [print the boarding passes](task) the day after tomorrow
- hey, remind me to [call the bank](task) before 4pm
- would you remind me to [book a table](task) for friday
- when it's 6, remind me to [start cooking](task)
- give me a reminder to [take my vitamins](task) at 8 am
- remind me tonight that I need to [prepare the slides](task)
- remind me in three days to [follow up with Marc](task)
- create a reminder: [oil the workbench](task), sunday morning
- reminder for tomorrow: [pick up the photos](task)
- remind me to [lock the workshop](task) when it's 9pm
- set a reminder to [cancel the trial](task) before the 15th
## What it needs
- {task}: some text. If it's missing, ask: What should I remind you of? | Remind you to do what?
- {when}: a date and time. If it's missing, ask: When? | When should I remind you?

## Samples
- task: call mum | buy milk | water the plants | pick up the kids | send the invoice | take the bread out | check the oven | pay the rent | book the dentist | back up the photos | reply to Eva | charge the camera | feed the cat | stretch | drink some water | move the car | submit the report | glue the box | oil the cedar box | take a break | call the bank | order more wood | print the tickets | bring the bikes in | renew my passport | ask Romain about the demo | clean the workshop | check the laundry | start dinner | go to bed | send the quote to Marc | give the keys to Lea | talk to the neighbours | bring the drill to the workshop | go to the post office | write to the landlord | take the car to the garage | send the photos to grandma

## Does
reminder.add {when} {task}

## Replies
- done: I'll remind you to {task} on {when}. | OK: {task}, {when}.
