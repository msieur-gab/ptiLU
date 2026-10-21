---
skill: get_date
help: tell the date (“what day is next friday?”)
samples: 8
train_only: day
---
# Dates

Today's date, the date of "next friday" or "the 14th", and how many days until a date. Dates are
read by the date parser (web/entities.js); holidays are not known.

## Slots
- day: datetime

## Examples
- what's the date{ today|}{?|}
- what is {today's|the} date{?|}
- what day is it{ today|}{?|}
- {which|what} day {is it|are we}{ today|}{?|}
- what's today{?|}
- what day of the week is it{?|}
- {what's|what is} the date {day}{?|}
- what {day|date} is {day}{?|}
- {which|what} date {is|will it be} {day}{?|}
- what day {does|is} {day} fall on{?|}
- how many days until {day}{?|}
- how {long|many days} {is it |}{until|till|before} {day}{?|}
- {tell me|give me} the date{ please|}
- {is today|is it} {monday|friday|the weekend|sunday}{?|}
- what month is it{?|}
- what year is it{?|}

## Values: day
- tomorrow
- next friday
- the 20th
- december 24
- in 3 weeks
- next monday
- the day after tomorrow
- in 10 days
- this saturday
- yesterday
- march 3
- next sunday
- in a month
- the 1st of january
- last friday
- in 100 days

## Replies
- today: Today is {date}. | It's {date}.
- other: {phrase} is {date}. | That's {date}.
- range: {phrase} runs from {from} to {to}.
- until: {n} until {date}. | {date} is in {n}.
- since: {date} was {n} ago.
- is_today: Yes, today is {date}.
- not_today: No, today is {date}.
- other_one: If you meant the other one, that's {date}.
- unknown: I don't know which date “{what}” is. Try a date like “december 25” or “next friday”. | “{what}” isn't a date I can read. Try “december 25” or “next friday”. | I can't place “{what}” on the calendar. Something like “next friday” works.
- month: It's {month}.
- year: It's {year}.
