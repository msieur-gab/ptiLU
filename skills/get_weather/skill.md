---
skill: get_weather
help: check the weather (“weather tomorrow”)
train_only: city, day
samples: 8
---
# Weather

Current weather or the forecast for up to 16 days, from Open-Meteo (open-meteo.com: free,
no key). Without a place it uses the place you told the agent you live in. The day comes
from the date parser ("tomorrow", "on friday", "this weekend").

This file is what people say and what the agent answers. What is sent to Open-Meteo, and
what is read back for "now", is in action.md next to it. skill.js finds the asked-for day(s)
in the 16-day forecast.

## Slots
- place: place, required, ask: ask_place, default: home
- day: datetime

## Examples
- what's the weather{ like|}{ today| now|}{?|}
- {how's|what's} the weather {in|at} [{city}](place){ today| now|}{?|}
- what's the weather {like |}{in|at} [{city}](place) {day}{?|}
- {will|is it going to} {rain|snow} {day}{?|}
- {will|is it going to} {rain|snow} in [{city}](place) {day}{?|}
- {do I need|should I take} an umbrella{ {day}|}{?|}
- {how|how's the} weather {day}{?|}
- {weather|forecast}{ please| today| for {day}|}
- {weather|forecast} {for|in} [{city}](place){ {day}|}
- what's the {forecast|weather forecast} {day}{?|}
- what's the {forecast|weather forecast} for [{city}](place){ {day}|}{?|}
- {how|how's it} {hot|cold|warm} {is it |}{outside|out there}{?|}
- {how|how's it} {hot|cold|warm} is it in [{city}](place){?|}
- what's the temperature {outside|out there}{?|}
- what's the temperature in [{city}](place){ {day}|}{?|}
- is it {sunny|raining|snowing|windy|cold|hot} {outside|in [{city}](place)}{?|}
- {is it|will it be} {sunny|nice|warm|cold} {day}{?|}
- {tell me|give me} the weather{ for [{city}](place)|}{ {day}|}
- {can|could} you check the weather{ in [{city}](place)|}{?|}
- {should|can} I {go for a walk|ride my bike|hang the laundry outside} {day}{?|}
- {do I need|should I wear|should I bring|will I need} {a coat|a jacket|an umbrella|sunglasses|gloves|a scarf|sunscreen|boots}{ {day}|}{?|}
- is it going to {rain|snow|be sunny|be cold|be warm|be windy|storm} {day}{?|}
- {any|is there any} {rain|snow|sun|wind} {expected|coming|forecast}{ in [{city}](place)|}{ {day}|}{?|}
- what's it like {outside|out there}{ {day}|}{?|}

## Values: city
- Munich
- Paris
- Tokyo
- Lisbon
- New York
- Berlin
- London
- Shenzhen
- Kyoto
- Lyon
- Barcelona
- Hamburg
- Vienna
- Zurich
- Montreal
- Marseille
- Oslo
- Rome
- the Alps
- Garmisch
- Hong Kong
- Rio de Janeiro
- Buenos Aires
- Cape Town
- San Francisco
- Kuala Lumpur
- New Delhi

## Values: day
- today
- tomorrow
- tonight
- this afternoon
- this weekend
- on friday
- on monday
- next week
- the day after tomorrow
- on saturday
- this evening
- in 3 days
- later
- this morning
- tomorrow morning

## Replies
- now: {place} right now: {sky}, {temp}°C, wind {wind} km/h.
- day: {when} in {place}: {sky}, {min} to {max}°C, {rain}% chance of rain.
- days: {place}, {phrase}:
- ask_place: Which city? Tip: say “I live in …” and I'll remember it for next time. | Where? Name a city. If you say “I live in …”, I'll remember it. | Which place should I check? Say “I live in …” once and I'll know next time.
- not_found: I couldn't find a place called “{place}”.
- too_far: I can only see 16 days ahead.
- past: I only have the forecast, not past weather.
- checking: Checking the weather for {place}…
