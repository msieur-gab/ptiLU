---
skill: send_telegram
help: send yourself a Telegram message (“telegram me buy milk”)
samples: 14
acts: yes
train_only: msg
---
# Send a Telegram message

Sends a message to you on Telegram, through a bot you create yourself. In Telegram, talk to
@BotFather, create a bot, and keep the token it gives you. Then send your new bot any
message, so it's allowed to write to you. The first time, the agent asks for the token and
your chat id and keeps both on this device.

This file is what people say and what the agent answers. What is sent to Telegram, and the
token kept on the device, is in action.md next to it.

## Slots
- text: text, required, ask: ask_text

## Examples
- {send|write|forward} [{msg}](text) {on|to|via|through} telegram{ please|}
- {send|write} {me |}a telegram {message |}{saying|that says|with} [{msg}](text)
- telegram me{:| that| saying|} [{msg}](text)
- {message|text|ping} me on telegram{:| that| saying|} [{msg}](text)
- {can|could} you {send|telegram} [{msg}](text) {on|to|via} telegram{?|}
- {post|put} [{msg}](text) {on|in} {telegram|my telegram}
- {send|write} {me |}{a telegram|a telegram message|something on telegram}
- {send|forward} that {on|to|via} telegram
- telegram me{ please|}
- {message|ping} me on telegram{ please|}
- {send|drop} {a note|a message|a reminder} {on|to|in} telegram{:|} [{msg}](text)

## Values: msg
- buy milk
- call the plumber
- the parcel is at the neighbour's
- the glue needs two more hours
- pick up the kids at 5
- order more walnut
- meeting moved to Thursday
- I'm on my way
- water the plants
- the oven is preheated
- don't forget the passport
- dinner at 8
- the backup is done
- the train is delayed
- take the laundry out
- bring the hand plane back
- pay the rent
- the printer jammed again
- check the mailbox
- the kiln is off

## Replies
- ask_text: What should I send on Telegram? | What's the message for Telegram? | What do you want to say on Telegram?
- checking: Sending it on Telegram…
- done: Sent on Telegram: “{text}”.
- failed: Telegram refused the message (error {status}). Check the token and that you wrote to your bot first.
- unsure: Do you want me to send that on Telegram? | Should I send that on Telegram? | Send that on Telegram?
