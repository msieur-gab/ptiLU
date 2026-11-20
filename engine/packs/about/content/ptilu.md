---
title: ptiLU
questions:
- what is ptilu
- what does ptilu mean
- what is this
- who are you
- what does the name mean
answer: ptiLU (p'tit LU) stands for Private, Teachable, Interpretable Language Understanding: a small model that understands short commands on the device, offline, and says "I can't" rather than guessing.
next: engine
---
# ptiLU

ptiLU (p'tit LU) stands for Private, Teachable, Interpretable Language Understanding. It understands
short requests on the device, offline, and says "I can't" rather than guessing.

## Why it is small
Assistants usually sit on a large language model, a cloud connection, or both. For a small device that
should do a handful of things well, that is far more than needed: heavy, opaque, online, and confidently
wrong when it hasn't understood. ptiLU tries the opposite: small, single-purpose minds that run on the CPU
of a cheap board, or offline in a phone's browser.

## How you teach it
What it didn't understand waits in an inbox. There, a sentence can be added to a skill, become a new skill
with its own answer, or be refused. A taught sentence becomes a pattern with placeholders, written in the
skill's own file, and works at once.
