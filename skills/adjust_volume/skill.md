---
skill: adjust_volume
help: change the volume (“volume to 30%”)
samples: 9
train_only: level
state: volume
start: 50
set: "pactl set-sink-volume @DEFAULT_SINK@ {n}%"
up: "pactl set-sink-volume @DEFAULT_SINK@ +10%"
down: "pactl set-sink-volume @DEFAULT_SINK@ -10%"
mute: "pactl set-sink-mute @DEFAULT_SINK@ 1"
unmute: "pactl set-sink-mute @DEFAULT_SINK@ 0"
acts: yes
---
# Volume

Up and down by 10, to a level ("40%", "half", "max"), mute and unmute. The commands are in the
front matter; skill.js reads the direction (also from phrases like "it's too loud") and keeps
track of the level. Brightness uses the same script with its own commands.

## Slots
- direction: list direction, guess
- level: text

## Examples
- {turn|crank|bump|put} {the |}{volume|sound|music} [up](direction){ please| a bit| a little|}
- {turn|put} {the |}{volume|sound|music} [down](direction){ please| a bit| a little|}
- {turn|crank|bump} it [up](direction)
- turn it [down](direction){ a bit|}
- [increase](direction) {the |}volume{ please| a bit|}
- [decrease](direction) {the |}volume{ please| a bit|}
- [raise](direction) the {volume|sound}
- [lower](direction) the {volume|sound}{ please|}
- make it [louder](direction){ please|}
- make it [quieter](direction){ please|}
- {a bit |}[louder](direction){ please|}
- {a bit |}[quieter](direction){ please|}
- {too loud|it's too loud|way too loud}
- {I can't hear anything|I can barely hear it|can't hear}
- {set|put|change} {the |}volume to [{level}](level)
- volume {at|to} [{level}](level){ please|}
- volume [{level}](level)
- {turn|set} the {volume|sound} [up](direction) to [{level}](level)
- {turn|set} the {volume|sound} [down](direction) to [{level}](level)
- [mute](direction){ the sound| the volume| it| everything|}{ please|}
- [unmute](direction){ the sound| the volume| it|}{ please|}
- {silence|quiet} please
- volume [up](direction)
- volume [down](direction)
- {change|adjust} the volume

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
- up: increase, increased, incrase, raise, louder, higher, more, brighter, brighten, boost, turn up, crank, too quiet, too low, too dark, too dim, can't hear, cannot hear, barely hear, can't see, cannot see, barely see, barely audible, barely visible, blast → up
- down: dwn, decrease, decrse, lower, quieter, quietr, softer, dimmer, dimmr, dim, dimmed, dimming, darker, less, reduce, hush, too loud, too bright, too much noise, too much light, deafening, blinding, glare, squint, ears hurt, eyes hurt, headache, head hurts → down
- mute: muted, muting, mut, silence, quiet → mute
- unmute: unmuted, unmut → unmute

## Replies
- ask: Up or down? You can also give a level, like 40%. | Louder or quieter? Or give me a level, like 40%. | Which way, up or down? A level works too, like 40%.
- set: Volume set to {n}%.
- up: Volume up to {n}%.
- down: Volume down to {n}%.
- same: Volume already at {n}%.
- muted: Sound muted.
- unmuted: Sound back on, at {n}%.
