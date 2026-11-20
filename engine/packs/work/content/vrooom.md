---
title: Vrooom
type: work
context: self-initiated
year: ""
where: Self-initiated
themes: [screens]
intro: Vrooom came from that thought.
brief: "Kids' games belong on screens."
question: What if the digital part only existed to send parents and kids outside together?
answer: A hand-planed wooden car with an NFC tag. Tap it at a playground or a walk to check in and earn a badge, then print it, colour it and glue it into a handmade travel passport. The phone witnesses the adventure, it doesn't run it.
tagline: A business model disguised as a wooden car.
what: A wooden toy with an NFC chip links to a playground discovery PWA. Children check in, earn badges, print them through the company website, color them, glue them into a handmade passport. Every print sends a parent to the product catalog — without an ad, a popup, or a captured email.
why: Children's apps monetize attention. Growth hacking monetizes trust. Both extract more than they give. Vrooom inverts the model: the utility earns the visit, the visit earns the discovery, the discovery earns the next purchase — if the product deserves it.
how: NFC as entry point, zero accounts, zero tracking, E2E encrypted WebRTC bridge to website for printing. The product serves an immediate need with no compromise. The business grows because people come back, not because they're brought back.
proof: 15 seconds of screen time per session. Zero data sent to any server. The growth channel is a parent choosing to print something for their child.
source: web-thecube/content/pieces/vrooom
keywords: [children, kids, child, toy, toys, wooden, wood, screen, screens, screen time, play, playground, outdoor, outside, family, parent, parents, together, nfc, game, games, phygital, physical, without ads, advertising, discovery, crowdfunding, handmade]
answers:
  - Can a toy be connected without being addictive?
  - Can digital play happen without a screen?
  - Can the object itself be how people find the product?
questions:
  - q: Can a product grow without advertising?
    see: This is led-growth without the growth hacking.
  - q: How do we get parents off their phones at the playground?
    see: The phone is not the villain.
  - q: Can a children's product work without tracking children?
    see: A wooden car. Beech
  - q: Why refuse gamification?
    see: No points, no streaks, no leaderboards.
  - q: How does the business make money without ads?
    see: A parent standing at a printer
  - q: Should a connected toy work without its app?
    see: The first prototypes went to neighborhood kids.
  - q: How do you align a business model with the user's interest?
    see: And Vrooom carries a question the others don't ask.
  - q: How little screen time can a digital product need?
    see: 15 seconds of screen time per session.
  - q: Why should the parent hold the phone, not the child?
    see: The phone belongs to the parent.
  - q: How do you make an object that lasts?
    see: Hand-planed from rectangular blocks
  - q: What is wrong with children's apps?
    see: Children's apps are a billion-dollar industry
  - q: How does a child check in at a playground?
    see: No "select a playground" step.
---

## TLDR

**What:** A wooden toy with an NFC chip links to a playground discovery PWA. Children check in, earn badges, print them through the company website, color them, glue them into a handmade passport. Every print sends a parent to the product catalog — without an ad, a popup, or a captured email.

**Why:** Children's apps monetize attention. Growth hacking monetizes trust. Both extract more than they give. Vrooom inverts the model: the utility earns the visit, the visit earns the discovery, the discovery earns the next purchase — if the product deserves it.

**How:** NFC as entry point, zero accounts, zero tracking, E2E encrypted WebRTC bridge to website for printing. The product serves an immediate need with no compromise. The business grows because people come back, not because they're brought back.

**Proof:** 15 seconds of screen time per session. Zero data sent to any server. The growth channel is a parent choosing to print something for their child.

---

**Role:** Systems Designer & Product Strategist

**Key supporter:** Thomas Duester — kept pushing when I was ready to move on. Some projects survive because someone else refuses to let them die.

**Stack:** Vanilla JS, Three.js, Leaflet, Overpass API, Valhalla routing, Dexie.js

**Design metric:** Screen time measured in seconds per interaction, not minutes.

## The Scene That Repeats

A child runs to the bench where her father sits. She holds up a stick — a wand, perhaps, or a sword, or something that has no name yet because she is still deciding. She wants him to see.

He glances up from his phone. "That's nice, honey." His eyes return to the screen.

She waits. The stick lowers. She walks back to the grass, alone.

The phone is not the villain. The phone is the symptom. The villain is the exhaustion, the isolation, the impossible demands placed on parents who have no village. The phone fills the vacuum we created.

But what else could fill it?

## The Industry's Bargain

Children's apps are a billion-dollar industry built on a single transaction: silence purchased with screen time. Engagement is the metric. Retention is the goal. The app succeeds when the child does not look up.

Behind this industry sits another one: growth hacking. Captured emails. Retargeting pixels. Push notifications. Streak mechanics. Dark patterns dressed as engagement. The business model requires the user to be brought back — because the product alone is not worth returning to.

What if the product was worth returning to?

## The Inversion

A wooden car. Beech — closed grain, food-safe, built to outlast the child who holds it. Inside: an NFC tag. Tap it to a parent's phone and a PWA opens — a playground discovery app that checks in at parks, earns badges, and gets out of the way. Fifteen seconds of screen time per session. No account. No data sent anywhere. No push notifications. No streaks.

The app serves one need: a child wants to explore. It serves it completely, then disappears.

Brands win more from being remembered for what they leave behind than from what they took.

> The toy does not need the phone. The phone needs the parent.

This is the foundation. A product that respects its user has earned something no retargeting pixel can buy: trust. A parent who trusts the product comes back. Not because they were reminded. Because they chose to.

## The Object Earns the System

The shape descends from a childhood memory — matchbox cars with cork wheels. Why those toys lasted was not their complexity. It was their simplicity. They were substrates for play, not scripts for it. No doors, no windows, no driver. Every detail removed is a story the child gets to add.

Hand-planed from rectangular blocks — finding the right taper, grip, and weight happened physically, not in CAD. The bottom tapers at front and back — not decoration, but function. Push it like a friction toy and the taper lifts it slightly, prevents scratching, makes the glide smooth. There is a Japanese carpentry principle: build it in a way that it lasts as long as it took the tree to grow.

The first prototypes went to neighborhood kids. No instructions, no explanation. They connected with the object before anyone mentioned the app. The wood, the weight, the shape. If the physical object does not stand alone — if it needs the digital to justify itself — the design has failed. The NFC inside is an expansion, not a requirement.

The design goal for the first moment a child taps the car to a parent's phone: nothing less than magic. Eyes shining. The thing in their hand was hiding this all along.

A product people love is a product people return to. That is not a marketing insight. It is a design decision.

## The System

No avatar, no account, no login. The child's identity in the app is their wooden car.

The NFC tag carries a URL pointing to a car configuration — a 3D model with mapped parts, colors, and sounds. Tap the car to the phone, and it appears on screen: a rendered wooden toy that spins, responds to touch, and revs its engine. The 3D viewer captures a side-view snapshot that becomes the child's marker on the map. Their car drives across the neighborhood as they walk.

No "select a playground" step. No trip planning. The child walks. When they arrive — a playground, a park, a pool — they tap "I'm here." Fresh GPS, nearest match within 150 metres, visit logged.

## The Growth Channel Is Paper

The badge system is designed to end in paper, not pixels.

- **Playground badges** — one per unique place visited
- **Regular badges** — earned after 10 visits to the same place
- **Milestone badges** — shields for 1, 5, 10, 25, 50 unique playgrounds

All badges are SVG line art. Intentionally uncolored. The badge page connects to the Vrooom website via end-to-end encrypted WebRTC — a single button, no account, no cloud. The 3D car viewer doubles as a coloring-book generator — choose an angle and it renders a line-art outline ready for printing.

> Print the badges. Cut along the lines. Color them in. Color the car. Glue them into a handmade passport.

The badges end in paper. But the path to paper passes through the Vrooom website. That visit is not accidental.

A parent standing at a printer, waiting for badge sheets, is standing inside the company's product catalog. No banner. No popup. No "you might also like." They came because the app was useful. They stay because the products are visible. They return because their child earned new badges.

This is led-growth without the growth hacking. No captured email. No retargeting pixel. No notification asking them to come back. The utility earns the visit. The visit earns the discovery. The discovery earns the next purchase — if the product deserves it.

Every children's app monetizes attention. Vrooom monetizes the moment a parent chooses to print something for their child. The difference is who holds the power in that transaction.

## What Was Rejected

**Gamification.** No points, no streaks, no leaderboards. The moment you add streaks, you add anxiety. A playground is not a competition.

**Social features.** No friends, no sharing, no "see where other kids are." Social features shift focus from exploration to performance. The child should discover playgrounds because they are curious, not because their friend did.

**Turn-by-turn navigation.** Vrooom shows walking routes when asked, but does not guide. A child walking to a playground should look at the world, not at a screen.

**Photo capture.** Rejected — it puts the phone back in the child's hands at the moment they should be playing. The check-in is the record. The badge is the memory.

**Child-held device.** The phone belongs to the parent. If the child holds the phone, the phone becomes the toy. If the parent holds the phone, the phone becomes the bridge.

**Ads, emails, push notifications.** The conventional growth toolkit. Every one of them trades user trust for a short-term metric. The product grows by being worth returning to, or it does not grow.

## What Lasts

A shape that carries no date cannot become dated. A material that ages cannot become obsolete. Fifty years from now, the same car will feel the same in a child's hand, will invite the same open stories, will wait for the same imagination to bring it alive.

And perhaps, by then, it will carry something more. The passport stamps from trips that became legends. The layers of memory pressed into an object, invisible as the NFC chip, present as the wood's weight.

> The toy is not the legacy. The play is the legacy. The toy is just what holds it.

## What Vrooom Shares

Vrooom is the third project in the physical-digital-bridge cluster:

> **Drop** — bottle cap triggers water map. Utility.
> **Pebbble** — stone triggers encrypted voice. Presence.
> **Vrooom** — wooden car triggers playground discovery. Play.

But Vrooom adds something the others don't: the output is physical too. The digital layer is sandwiched between two physical ones — a wooden car on one end, a paper passport on the other.

And Vrooom carries a question the others don't ask. Drop proves that public infrastructure can replace proprietary APIs. Pebbble proves that privacy can be enforced by architecture. Vrooom demonstrates something else: a working system where the business model and the user's interest are structurally aligned — not by policy, not by promise, but by architecture. The parent goes to the website because they want to, not because they were nudged.

The companies that need this thinking are the ones starting to realize that the extraction model has a ceiling. Users leave. Regulation tightens. Brand trust erodes. The ones who figure out how to grow by giving more than they take will outlast the ones still optimizing click-through rates.

A car in the hand. A playground around the corner. The phone already forgotten.
