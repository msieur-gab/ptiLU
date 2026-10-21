---
skill: remember_me
help: remember your name and where you live
train_only: first, city
samples: 8
acts: yes
---
# Remember me

Saves your name and the place you live, on this device only (browser storage). The place is
looked up once on Open-Meteo's place search to get its coordinates and time zone, which the
weather and time skills then use.

## Slots
- name: text
- place: place

## Examples
- my name is [{first}](name)
- {call me|you can call me|just call me} [{first}](name)
- I'm [{first}](name)
- {I am|this is} [{first}](name){ speaking|}
- {remember that |please remember |}my name is [{first}](name)
- I live in [{city}](place)
- {remember that |please remember |}I live in [{city}](place)
- my {home|home town|city} is [{city}](place)
- I'm {based|living} in [{city}](place)
- {I moved|we moved} to [{city}](place)
- {set|change} my {location|city|home} to [{city}](place)
- {my location is|I'm located in} [{city}](place)
- I'm [{first}](name) and I live in [{city}](place)
- my name is [{first}](name) and I live in [{city}](place)
- I live in [{city}](place) and my name is [{first}](name)
- I live in [{city}](place){,| and} {call me|I'm} [{first}](name)
- {remember|save|store} my {name|location|city}
- {from now on|from today} {call me|my name is|I'm} [{first}](name)
- {I'm|we're} {now |}{living|staying} in [{city}](place)

## Values: first
- Gab
- Gabriel
- Eva
- Romain
- Léa
- Sam
- Yuki
- Amara
- Lucas
- Mia
- Noah
- Chloé
- Tom
- Ines
- Doc
- Boss
- Chief
- Professor
- Kiki

## Values: city
- Munich
- Paris
- Lisbon
- Tokyo
- Berlin
- Lyon
- New York
- Shenzhen
- Montreal
- Vienna
- Barcelona
- Hamburg
- Hong Kong
- Rio de Janeiro
- Buenos Aires
- Cape Town
- San Francisco
- Kuala Lumpur
- New Delhi

## Replies
- name: Nice to meet you, {name}. I'll remember your name, on this phone only. | Got it, {name}. Saved on this phone.
- place: Got it: you live in {place}. I'll use it for the weather.
- place_found: Found it: {place}. Saved on this phone, I'll use it for the weather and the time.
- place_not_found: I saved “{place}”, but I couldn't find it on the map, so weather won't work for it yet.
- place_offline: I saved “{place}”. I'll look it up on the map when we're back online.
- ask: What should I remember? Your name (“my name is …”) or where you live (“I live in …”). | Tell me your name (“my name is …”) or where you live (“I live in …”). | What should I keep: your name (“my name is …”) or your city (“I live in …”)?
