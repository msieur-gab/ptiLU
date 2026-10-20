---
skill: show_map
help: show a place on a map (“where is Kyoto on the map”)
samples: 10
train_only: city
---
# Show on a map

Finds a place and answers with a link to it on OpenStreetMap. Without a place it uses the
place you told the agent you live in.

This file is what people say and what the agent answers. The place search is in action.md.

## Slots
- place: place, required, ask: ask_place, default: home

## Examples
- show {me |}[{city}](place) on {a|the} map
- {where is|where's} [{city}](place) on the map{?|}
- {show|find} [{city}](place) on {a|the} map{ please|}
- {open|pull up|bring up} {a |the |}map of [{city}](place)
- {map|a map} of [{city}](place){ please|}
- {can|could} you show me [{city}](place) on {a|the} map{?|}
- {where|where exactly} is [{city}](place){?|}
- locate [{city}](place){ on the map|}
- {show me|open} {a|the} map{ please|}
- {show me|open|pull up} {my area|where I live|home} on the map
- map{ please|}
- {I want to|let me} see [{city}](place) on {a|the} map
- {show me|let me see} where [{city}](place) is
- {display|show} [{city}](place){ please| for me|}

## Values: city
- Kyoto
- Lisbon
- Munich
- Garmisch
- Hong Kong
- Montreal
- Shenzhen
- Lyon
- Oslo
- Cape Town
- Reykjavik
- Bordeaux
- Salzburg
- Nara
- Porto
- Innsbruck
- Marrakesh
- San Francisco
- Copenhagen
- Ljubljana

## Replies
- ask_place: Which place should I show? Tip: say “I live in …” and I'll use it next time.
- checking: Looking for {place}…
- done: {name}, {country}: https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=12/{lat}/{lon}
- not_found: I couldn't find a place called “{place}”.
