---
skill: adjust_brightness
help: change the brightness (“brightness 40%”)
samples: 10
train_only: level
script: adjust_volume
state: brightness
start: 80
set: "brightnessctl set {n}%"
up: "brightnessctl set 10%+"
down: "brightnessctl set 10%-"
acts: yes
---
# Brightness

Same script as Volume (front matter "script: adjust_volume"), with brightness commands and no
mute: "mute" means darker here.

## Slots
- direction: list direction, guess
- level: text

## Examples
- {turn|put} {the |}{brightness|screen brightness} [up](direction){ please| a bit|}
- {turn|put} {the |}{brightness|screen brightness} [down](direction){ please| a bit|}
- [increase](direction) {the |}{brightness|screen brightness}
- [decrease](direction) {the |}{brightness|screen brightness}
- [raise](direction) the brightness
- [lower](direction) the brightness{ please|}
- make the {screen|display} [brighter](direction){ please|}
- make the {screen|display} [darker](direction){ please|}
- [dim](direction) the {screen|display}{ please| a bit|}
- [brighten](direction) the {screen|display}
- {the |}screen is too {dark|bright}
- {I can't see the screen|it's too bright|it's too dark}
- {set|put|change} {the |}brightness to [{level}](level)
- brightness {at|to} [{level}](level){ please|}
- brightness [{level}](level)
- screen brightness [{level}](level)
- brightness [up](direction)
- brightness [down](direction)
- {change|adjust} the {brightness|screen brightness}
- {a bit |}[brighter](direction){ please|}
- {a bit |}[dimmer](direction){ please|}
- the screen is {hurting my eyes|blinding me|too glaring|hard to read}
- {I'm squinting at|I'm straining to see} the screen
- {can|could} you [dim](direction) {it|this|the screen}{ a little|}{?|}
- {too much|not enough} light {on|from} the screen
- [dim](direction) it {down|a little|a bit}

## Values: level
- 50%
- 30 percent
- 20
- 75%
- 100%
- 10%
- 40 percent
- max
- maximum
- half
- zero
- minimum
- full
- 60
- 85%
- 25 percent
- 5%

## Values: direction
- up: increase, increased, incrase, raise, higher, more, brighter, brighten, boost, turn up, too dark, too dim, can't see, cannot see, barely see, barely visible → up
- down: dwn, decrease, decrse, lower, dimmer, dimmr, dim, dimmed, dimming, darker, less, reduce, too bright, too much light, blinding, glare, squint, eyes hurt, headache, head hurts → down
- mute: muted, muting, mut, silence, quiet → mute
- unmute: unmuted, unmut → unmute

## Replies
- ask: Brighter or darker? You can also give a level, like 60%.
- set: Brightness set to {n}%.
- up: Brightness up to {n}%.
- down: Brightness down to {n}%.
- same: Brightness already at {n}%.
