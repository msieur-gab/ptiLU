---
title: Pebbble
type: work
context: self-initiated
year: 2024–
where: Self-initiated
themes: [distance, privacy, screens]
intro: Pebbble was born from that question.
brief: "Separated families stay in touch with calls and messaging apps."
question: What if a parent's voice lived in something the child can hold, that nobody can block?
answer: Hand-formed stones with a sealed NFC tag carrying encrypted voice messages. No screen, no account. Holding the stone is the key, and a message can wait years to open, like one for an 18th birthday.
tagline: A stone that carries voices.
what: A handcrafted stone with a hidden NFC chip. Tap it to a phone, hear a parent's voice. End-to-end encrypted, stored on IPFS, decrypted only by physical possession of the object.
why: We have dematerialised the things that carry memory — the voice, the touch, the object on the nightstand. Co-parenting apps track schedules. Messaging tools store everything on servers that can be subpoenaed. None of them were designed for a three-year-old who cannot read, or for a family where distance is not chosen but imposed.
how: Client-side AES-256-GCM encryption, IPFS for censorship-resistant storage, NFC serial number as key derivation input. No accounts, no server, no database of messages. The system is incapable of betraying its users — not by policy, but by architecture.
proof: Working PWA with dual playback modes (persistent and ephemeral). The architecture designed for the hardest case serves every other case trivially.
source: web-thecube/content/pieces/pebbble
keywords: [child, children, kid, kids, daughter, son, parent, parents, father, mother, family, separated, separation, distance, far away, abroad, abduction, custody, divorce, voice, message, messages, presence, memory, memories, keepsake, stone, object, nfc, encrypted, encryption, censorship, blocked, birthday, grandparents, without a phone, without a screen]
answers:
  - How can a child keep a parent's voice when they live apart?
  - How do I stay present for a child who lives far away?
  - How do I leave a message my child can only open years from now?
  - Can technology hide inside an ordinary object?
  - What happens to my data if the company disappears?
questions:
  - q: How can a parent stay present for a child who lives far away?
    see: A handcrafted stone with a hidden NFC chip
  - q: Why voice instead of text or video?
    see: The physiology is unambiguous.
  - q: How do you design for a child who cannot read?
    see: The first attempts were not stones.
  - q: How can a message stay private without trusting a company?
    see: The encryption key is derived from the NFC tag
  - q: What if the device the child uses is monitored?
    see: Ephemeral mode: the audio plays once.
  - q: Why a stone?
    see: The object needed to be convenient
  - q: Why not an app from the app store?
    see: An app in the app store can be found
  - q: Can a message survive censorship?
    see: Content-addressed, decentralized.
  - q: What about the right to be forgotten?
    see: But permanence has a cost.
  - q: Why design for the worst case?
    see: The extreme case: no reliable internet
  - q: Why no accounts or passwords?
    see: An account is a target.
  - q: How is the stone made?
    see: Each Pebbble is hand-shaped
---

## TLDR

**What:** A handcrafted stone with a hidden NFC chip. Tap it to a phone, hear a parent's voice. End-to-end encrypted, stored on IPFS, decrypted only by physical possession of the object.

**Why:** We have dematerialised the things that carry memory — the voice, the touch, the object on the nightstand. Co-parenting apps track schedules. Messaging tools store everything on servers that can be subpoenaed. None of them were designed for a three-year-old who cannot read, or for a family where distance is not chosen but imposed.

**How:** Client-side AES-256-GCM encryption, IPFS for censorship-resistant storage, NFC serial number as key derivation input. No accounts, no server, no database of messages. The system is incapable of betraying its users — not by policy, but by architecture.

**Proof:** Working PWA with dual playback modes (persistent and ephemeral). The architecture designed for the hardest case serves every other case trivially.

---

**Role:** Creator & Lead Designer/Engineer

**Stack:** Vanilla JS, Web Crypto API (AES-256-GCM, PBKDF2), Web NFC, IPFS/Pinata, Dexie.js

**Period:** 2024–present

## The Slow Fade

> "Loin des yeux, loin du cœur."
> Far from the eyes, far from the heart.
> — French proverb

The proverb exists in every language because the pain exists in every culture. Distance erodes presence. Absence, sustained long enough, becomes its own kind of loss — not the sharp grief of death, but the slow fade of connection stretched too thin.

We have dematerialised most of what carries memory. The letters are gone. The photo albums are in a cloud. The voice that said goodnight is a notification on a screen that was already dismissed. We traded physical presence for digital convenience and lost something we cannot name but feel every day.

Some distances are chosen. The parent who works across time zones, who trades bedtime stories for quarterly targets. The sacrifice made for provision, paid in presence.

Some distances are imposed. The military family whose parent serves on foreign soil, whose calls come at strange hours if they come at all.

And some distances are stolen. The child taken across a border. The parent left searching. The silence that authorities cannot even quantify.

Behind every uncounted case is a parent who cannot hold their child. A child who cannot hear their parent's voice.

I am personally familiar with this silence.

An entire industry looked at these families — all of them, from the business traveler to the abducted child — and offered them scheduling apps.

## Voice, Not Text

The first attempts were not stones. They were logbooks — heavily tech-oriented memory systems capturing text, pictures, timestamps, anchors in time. They failed the way most technology fails families: by assuming literacy, by demanding interaction, by feeling like documentation rather than connection. A three-year-old cannot read a logbook. A six-year-old does not find comfort in a timestamped archive. These systems recorded presence. They did not deliver it.

Language, persistence, reading ability — each became a constraint that narrowed the question: which stimulus triggers not the recall of a memory, but the feeling of a reconforting presence? The research pointed in one direction. The human brain treats a familiar voice as a neurobiological safety cue. A child recognizes their parent's voice from birth. By two months, that voice is encoded as a marker of safety — a familiar voice evokes the entire mental representation of a person, including visual memories and emotional context, even in the absence of a face. Neuroscience has a clinical term for what a parent's voice does to a child's nervous system: non-pharmacological anxiolytic. It reduces anxiety without medication. Not image, not video, not text. Voice carries the message, the sentiment, the emotions, and most importantly — the presence.

The physiology is unambiguous. Hearing a loved one's voice triggers a measurable cortisol reduction — stress suppression — and a significant increase in oxytocin, the hormone that mediates bonding. Text messaging produces neither. No cortisol change. No oxytocin release. Physiologically identical to the control group. A text says "I love you." A voice makes the body believe it.

A study of 1,772 participants found that voice-only communication consistently outperforms video in empathetic accuracy — the ability to correctly identify what another person is feeling. Removing visual input forces the brain to focus entirely on paralinguistic cues: tone, inflection, rhythm. Video calls can paradoxically increase distress in children by highlighting physical absence. The screen shows the parent's face but confirms they are not here. Voice does not carry that contradiction. Voice accompanies. It does not remind you of what is missing.

Emotional voices are not only recognised more accurately — they are retained better over time. After one week, the memory trace of an emotional voice is nearly twice as strong as a neutral one. A parent's voice saying goodnight is not just heard in the moment. It persists. The brain holds onto it because it matters.

> A voice in the dark is a presence. A text in the dark is information.

## A Stone

Technology announces itself. Screens glow. Devices demand charging. Gadgets require learning, updating, maintaining.

A stone does not announce itself. A stone on a nightstand is invisible. A stone in a pocket is unremarkable. A stone in the hands of a child being monitored raises no suspicion.

The object needed to be convenient — something that fits in a child's pocket, something you could always have with you. Watching children explore their surroundings, one thing always appealed to me: a cross-gender constant, older than any toy. Children collect stones. Simple, dirty stones, cherished like the most precious discovery of the day — sometimes of a life. No child has ever been taught to pick up a stone. They just do.

Each Pebbble is hand-shaped from a water-based composite that solidifies on contact with air and reproduces the exact texture and feel of a river pebble — same grain, same weight, same way it warms progressively in your hand as you hold it. The material allows shaping around water-resistant, sealed NFC tags without seams, without molding marks, without any visible sign that it holds anything at all. People discovering it for the first time try to see how it opens, what it contains. There is nothing to find. It is a stone.

A child might find it interesting at first. But the relationship with the stone changes when they realise it is coated with a fine luminescent layer that makes it glow in the dark — distinguishing it from every other pebble in their collection. And it changes again, permanently, when they witness it connect to a phone and hear a voice they love.

Not just another nice pebble. A magical one. Like the pebbles from *Le Petit Poucet* — the stones that lead him and his brothers and sisters back through the forest, back to their family, back to their loved ones. That is where the stone comes from.

Inside each one: an NFC chip. No battery. No screen. No moving parts. Twelve cents of hardware that draws power only at the moment of reading, then waits again. It will wait for decades. Hold the stone to a phone. Hear your parent's voice. A child does not need to understand IPFS or NFC. They need to understand: hold this to the phone, and you hear mama's voice.

I collected reference pebbles from a river. They stand aligned in a box on my desk — guides for shape and weight. Hand-shaping these stones has something relaxing about it, leaning towards meditation. The constraint was finding a material clean enough — non-toxic once cured, safe for a child who will carry it everywhere. Once solved, the process became straightforward. The complexity lives elsewhere.

> What lasts is simple. What matters should last.

## The Worst Case Designs the Architecture

Design for the extreme case and the common case becomes trivial.

The extreme case: no reliable internet, active censorship, a monitored device, a child too young for interfaces, content that must survive hostile infrastructure, technology that must last years without maintenance.

Every layer solves a specific constraint:

**The stone is the key.** The encryption key is derived from the NFC tag's unique serial number plus a timestamp, run through PBKDF2 with 100,000 iterations. The key doesn't exist anywhere — not on a server, not in the app, not in the stone. It is computed at the moment of reading from the physical object itself. No accounts, no passwords. Physical possession is the only authentication.

**IPFS distributes the voice.** Content-addressed, decentralized. Block one node, it routes through another. Block a domain — there is no domain to block. A voice recorded in one country reaches a child in another regardless of what stands between them.

**No central server.** The storage provider never sees plaintext. There is no database of messages, no server logs, no central point that can be compelled to reveal content.

> The system is private by architecture, not by policy. There is no database of messages to subpoena.

If a parent's voice can reach an abducted child — safely, secretly, persistently — then the military family on deployment, the divorced couple across distance, the grandparent recording stories are all already served.

## Two Modes, One Stone

The app itself serves two fundamentally different experiences. The reader must be poetic — the interface disappearing to offer nothing but the presence of a warm voice. How do you design a screen that gets out of the way of a parent saying goodnight? The writer is the opposite problem: recording, managing, reusing messages, adding music. A parent recording a bedtime story at 11 PM after a long day cannot afford to fight an interface. Simplicity is not a trend here — it is the constraint that guarantees the system gets used at all.

But the deeper split is not between reading and writing. It is between safety and evidence.

A child with their own phone keeps the voice always available. Cached, ready whenever loneliness arrives at 2 AM. But what about a child using a borrowed device? A shared tablet at a shelter? A phone belonging to someone who must not know what it accessed?

Ephemeral mode: the audio plays once. When the app closes, nothing remains. No history, no cache, no evidence. The voice was heard, and then — nothing.

This is the hardest design constraint I've worked with. Not technically. Emotionally. The idea that a child needs to hear their parent's voice in secret, and that evidence of hearing it could make things worse.

## What Was Rejected

**Accounts.** An account is a target. It can be discovered, subpoenaed, locked. The stone authenticates by physical possession. Nothing else.

**Cloud storage.** A server is a single point of failure and a single point of compulsion. IPFS distributes content. No entity controls it.

**Mobile app.** An app in the app store can be found on the phone. A PWA launched from an NFC tap operates ephemerally — no installation, no icon, no evidence. The web is the delivery mechanism because the web can disappear.

**User-created passwords.** A child cannot remember a password. The stone itself is the password.

## What Pebbble Shares

Pebbble is one of three projects using the same architecture: NFC tag on a physical object triggers a web experience with zero intermediary.

> **Drop** — bottle cap triggers water map. Utility.
> **Vrooom** — wooden car triggers playground discovery. Play.
> **Pebbble** — stone triggers encrypted voice. Presence.

Same pattern, different stakes. The NFC tap replaces the entire onboarding flow in all three. But only Pebbble carries the weight of what happens when the physical object is the last connection between a parent and a child. The architecture that makes Drop convenient makes Pebbble necessary.

## The Tension That Stays Unresolved

IPFS permanence is the feature for the humanitarian case. Once pinned, the voice persists independent of any server, company, or jurisdiction.

But permanence has a cost. What about messages you later regret? What about a child who grows up and wants the voice to stop? This tension — between censorship resistance and the right to be forgotten — is unresolved. I include this because most portfolios present resolved problems. This one isn't resolved. That's honest.

## Ripples

As a child, it took me hours of practice to learn to skip stones across water. But what I loved most about it — and certainly why I still love it — is not the throw. It is what happens after. Each impact of the stone on the surface creates ripples that spread outward, connect to each other, and travel until they reach the shore. Their final physical destination.

A voice recorded into a Pebbble does the same thing. It leaves one hand, crosses whatever distance stands between two people, and arrives — not as data, not as notification, but as presence. A ripple that reaches the shore.

A stone. A voice. A child who remembers.
