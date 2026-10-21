---
skill: power
help: shut down or restart (asks first)
samples: 20
train_only: power
# no acts: yes — this skill asks for a yes itself, every time
---
# Power

Shut down, restart or sleep. Always asks for a yes first: these can't be undone from the agent.

## Slots
- power_action: list action, required, guess, ask: ask

## Examples
- {please |}[{power}](power_action) {the |}{computer|pi|device|system|board|machine}{ now| please|}
- [{power}](power_action){ now| please|}
- {can|could} you [{power}](power_action) {the |}{computer|system|device}{?|}
- I want to [{power}](power_action){ the device| the computer|}
- {time to|let's|lets} [{power}](power_action)
- {go to|put it to} [sleep](power_action){ now|}
- {please |}[{power}](power_action) everything
- {turn the computer off|switch off the device}
- {power|shut} it down

## Values: power
- shut down
- shutdown
- power off
- turn off
- reboot
- restart
- sleep
- suspend

## Values: action
- shutdown: shut down, shutting down, power off, power down, turn off, switch off, halt, off, down, dwn, pwr, kill power, drop power, unplug → sudo systemctl poweroff
- reboot: restart, rebot, restrat, restart it, power cycle, hard reset → sudo systemctl reboot
- sleep: suspend, sleep mode, slepp, standby, nap, bed, rest, goodnight → sudo systemctl suspend

## Replies
- ask: Shut down, restart or sleep? | Which one: shut down, restart or sleep? | Should I shut down, restart, or put it to sleep?
- confirm_shutdown: Shut down the device now? Say yes to confirm or no to cancel.
- confirm_reboot: Restart the device now? Say yes to confirm or no to cancel.
- confirm_sleep: Put the device to sleep now? Say yes to confirm or no to cancel.
- done_shutdown: Shutting down.
- done_reboot: Restarting.
- done_sleep: Going to sleep.
- declined: OK, I'll leave it running. | Cancelled. Nothing changes.
