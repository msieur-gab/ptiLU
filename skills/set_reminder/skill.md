---
skill: set_reminder
help: set reminders (“remind me to call mum next friday at 3pm”)
samples: 14
train_only: task, when
acts: yes
---
# Reminders

One-off or repeating reminders. When comes from the date parser; if it's ambiguous ("next friday",
"at 9") the agent offers the two readings, and a time that has already passed becomes tomorrow
after you agree. A day without a time is 9:00.

## Slots
- task: text
- when: datetime, required, ask: ask_when, invalid: when_invalid

## Examples
- remind me to [{task}](task) {when}
- remind me {when} to [{task}](task)
- {when} remind me to [{task}](task)
- {please |}remind me to [{task}](task){ please|}
- {set|create|add|make} a reminder {to|for} [{task}](task) {when}
- {set|create|add|make} a reminder {for|on|at} {when}
- {set|create|add|make} a reminder{ please|}
- {new|add a} reminder: [{task}](task) {when}
- {can|could} you remind me to [{task}](task){ {when}|}{?|}
- {don't let me|make sure I don't} forget to [{task}](task){ {when}|}
- {ping|nudge} me {when} {to|about} [{task}](task)
- remind me about [{task}](task) {when}
- remind me {when}
- I {need|want} a reminder to [{task}](task){ {when}|}
- {set|add} a reminder {to|that I need to} [{task}](task)
- {notify|alert|warn} me {when} {to|about} [{task}](task)
- {give me a heads-up|let me know} {when} {to|about} [{task}](task)

## Values: task
- call mum
- buy milk
- water the plants
- pick up the kids
- send the invoice
- take the bread out
- check the oven
- pay the rent
- book the dentist
- back up the photos
- reply to Eva
- charge the camera
- feed the cat
- stretch
- drink some water
- move the car
- submit the report
- glue the box
- oil the cedar box
- take a break
- call the bank
- order more wood
- print the tickets
- bring the bikes in
- renew my passport
- ask Romain about the demo
- clean the workshop
- check the laundry
- start dinner
- go to bed
- send the quote to Marc
- give the keys to Lea
- talk to the neighbours
- bring the drill to the workshop
- go to the post office
- write to the landlord
- take the car to the garage
- send the photos to grandma

## Values: when
- tomorrow
- next friday
- in 2 days
- at 3pm
- tonight at 8
- tomorrow morning
- on monday at 9
- in 10 minutes
- next week
- on the 20th
- in an hour
- every monday at 9
- every day at 7am
- at noon
- this evening
- on december 24
- in half an hour
- next year
- friday at 18h
- later
- the day after tomorrow at 10:30
- in three days
- on sunday
- at 6:45
- next tuesday afternoon
- every weekday at 8
- in 2 weeks
- at midnight
- this weekend
- on the 3rd of november

## Replies
- ask_when: When should I remind you? | OK. When?
- unsure: Do you want a reminder for that?
- when_invalid: I didn't catch a time. Try “tomorrow at 9” or “in an hour”.
- ask_day: {phrase} runs from {from} to {to}. Which day?
- done: I'll remind you{what} {at}. | Reminder set{what} {at}. | OK, I'll remind you{what} {at}.
- repeat: OK, I'll remind you{what}{rule}. First one {next}.
- no_time: You didn't give a time, so I used 09:00.
- ring: ⏰ Reminder: {what}
- past: {at} has already passed. Shall I make it {next}?
