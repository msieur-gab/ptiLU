---
title: Senz
type: work
context: commissioned
year: 2018–21
where: Allianz · Kaiser X Labs
themes: [ideas, trust]
intro: That's what Senz was about.
brief: "We need to innovate faster."
question: What if testing an idea cost less than the meeting about it?
answer: Experts sketch an interface on paper and get a deployable MVP built on the company's own design system. 96% less time from idea to MVP, six months before Microsoft's Sketch2Code and seven years before Figma Make.
why: Large organisations lose most of their internal ideas to a validation cycle too expensive to run. Four disciplines, months of sprint, a six-figure budget — most experts never get permission to test what they already know.
what: A platform that lets non-designers and non-developers sketch an interface on paper, have it read by a sovereign vision model, and deploy as production code in the company's own design system — without a developer in the loop.
outcome: Employees inside Allianz tested radical business ideas in days instead of quarters, including one that opened a new insurance market segment through a service the standard product pipeline would never have produced.
source: web-thecube/content/pieces/senz
keywords: [innovation, innovate, idea, ideas, prototype, prototyping, mvp, test, testing, experiment, sketch, drawing, design system, developer, developers, faster, speed, slow, budget, deck, board, decision, debate, meeting, corporate, insurance, agency, empower, team, non-technical, proof of concept, poc, validate]
answers:
  - How can my team test an idea before we commit a budget?
  - How do we stop debating ideas and start learning from them?
  - Can people without a technical background build a prototype themselves?
  - How do we make failing cheap enough that people dare to try?
  - The board wants proof, not another deck. Where do we start?
  - Our innovation lab is too slow. How do we speed it up?
  - Everyone agrees something must change. Nobody agrees on what.
questions:
  - q: How do we make a design system adoptable?
    see: Paper and pen. The most radical
  - q: How do we transform a large corporation?
    see: Organisations are closed systems
  - q: How do we accelerate innovation?
    see: Senz bypassed the six-figure budget gate
  - q: How do we reduce the cost of an MVP?
    see: Large organisations lose most of their internal ideas
  - q: Can people without a technical background build a prototype themselves?
    see: A platform that lets non-designers and non-developers
  - q: How do we stop debating ideas and start testing them?
    see: Senz bypassed the six-figure budget gate
  - q: What should an AI do when it is not sure?
    see: The model was trained by design never to pretend
  - q: Why did an earlier tool for non-experts fail?
    see: Momentum had come first
  - q: How does a drawing become working code?
    see: A two-stage recognition pipeline.
  - q: Can one small test open a new market?
    see: An in-house agent working on bike insurance
  - q: Should the AI run on our own servers?
    see: On-device, sovereign model.
  - q: Who built Senz?
    see: I led the project end-to-end
---

*Making sense of ideas — turning a sketch into a deployed prototype without a developer in the loop.*

## Summary

**Why:** Large organisations lose most of their internal ideas to a validation cycle too expensive to run. Four disciplines, months of sprint, a six-figure budget — most experts never get permission to test what they already know.

**What:** A platform that lets non-designers and non-developers sketch an interface on paper, have it read by a sovereign vision model, and deploy as production code in the company's own design system — without a developer in the loop.

**Outcome:** Employees inside Allianz tested radical business ideas in days instead of quarters, including one that opened a new insurance market segment through a service the standard product pipeline would never have produced.

## Overview

Senz was a prototyping tool built at Kaiser X Labs and deployed inside Allianz. It gave domain experts — claims handlers, underwriters, product managers — direct authorship over working product prototypes, without a developer in the chain. I led the project with Sven Martinov and Olivier Gonthier as the core team, inside Kaiser X Labs, Allianz's innovation studio. Shipped seven years before Figma Make.

## Problem

Large organisations spent the last decade on digital transformation, secretly hoping it would keep startups and market disruptors away from their business. Each new framework, method, and tool they stacked on was meant to make them faster. Instead, it raised the locking bar on budget approval — committing a full team of designers, researchers, and developers to build an MVP that was already outdated before launch.

They didn't need more matter. They needed to rearrange what they had.

Organisations are closed systems of a different kind of matter. Frameworks, components, design systems, data, business logic, flows, APIs, and the people who understand them — the latent potentials sitting inside every large company. None of it is missing. Most is underused, mis-combined, or defended by whichever team currently owns its shape.

Lavoisier, working on combustion in the 1780s, established a principle that dismantled alchemy: in a closed system, nothing new is created and nothing is lost. Everything is transformed.

Senz was built on this principle.

## The moment

Momentum had come first — a tool we built to let non-experts contribute to Allianz's Angular atomic library. It failed. The learning curve was too steep, and the people it was supposed to empower could not climb it quickly enough to stay engaged. The system was sophisticated. That was the problem.

A few months later, in a meeting about the coming design system, a home claims expert walked to the whiteboard and started sketching a First Notification of Loss — boxes, hero, the few inputs a customer needs to report that something has gone wrong. She asked the builders whether their components could handle the cases and logic she was drawing. My mind slipped sideways, to Google Photos — how it had quietly crossed the threshold where labelling an image was the same thing as reading it. Pixels into signal. Signal into structured matter the system could act on.

Paper and pen. The most radical and simple input on earth. The medium people reach for long before they turn to a computer, available in every office and every country, affordable at every economic tier. If Google could turn photos into structured matter at scale, we could turn drawings into production components the same way. Momentum had tried to teach experts a new tool. Senz would meet them at the tool they already used.

## Approach

### Design principles

Senz was built on three principles, held together.

**Affordance.** The interface mirrored the simplicity of the raw material it accepted. A canvas, a side toolbar, a predict button. No dashboard, no project setup. Input arrived through whichever surface the user already had — a phone photo via the companion app, direct drawing on a touch-enabled laptop, drag-and-drop of pre-made wireframe elements, SVG or image upload. Data arrived the same way: spreadsheet, CSV, database endpoint, one click through connectors. Senz never contained data. It managed the flow between systems that already held it.

**Assistance.** The model was a translation layer, never a generative one. The system recognised the user's intent but did not produce it. Completed steps folded and dismissed as progress was made, clearing the canvas without erasing the path. Real-time collaboration ran through mandate roles — admin, designer, reviewer, approver — so different experts could author different layers of the same prototype without colliding.

**Transparency.** The model was trained by design never to pretend. Confidence thresholds were tuned to surface uncertainty rather than hide it — if the system did not recognise a shape, it said so. Every decision was the user's, and therefore auditable by the user. The stack was there to serve, not to harvest.

### Key decisions

*The companion app preprocessing pipeline.* Users couldn't be asked to stage their shot. A phone photo of a real whiteboard, with glare, angle, and other people's notes in the background, had to be readable by the production system — no special paper, no careful framing, no instructions. Browser-based capture wasn't technically possible at the time, so the companion app handled its own computer-vision preprocessing before the main model ever saw the image: object extraction, foreign-item removal, drop-shadow and flare filtering, perspective correction. Affordance enforced upstream, not just in the UI.

*One predict button, not continuous recognition.* The model ran on our own on-prem hardware. Continuous prediction would have burned compute for marginal UX gain, and we refused it on ecological grounds. The consequence reshaped the interaction: a deliberate predict action invited the user to think first, draw, and then translate. The pause before pressing predict was a thinking space the tool preserved on purpose.

*A two-stage recognition pipeline.* A wireframe is not a grid of pixels. It's a document with layout structure — a button is a button partly because of where it sits in the composition, not only because of how it looks. The recognition ran in two stages to honour that: a detection model (RetinaNet) located the shapes on the page, and a classification model (LayoutLM) read each region in its spatial context, deciding what the shape was given what surrounded it. The system understood composition, not just shapes.

*Direct manipulation on the canvas, versioning for tested journeys.* The drawing was live material. Marks could be erased, redrawn, moved, scaled at any point — the canvas worked the way a sketchbook works, and adjustments happened in the drawing itself. Versioning operated at a different layer. Once a prototype had been predicted and deployed — run against users, shown to stakeholders, tested in the wild — that version was preserved. The user could then branch the project, redraw the canvas, and produce a new version to compare against the first. A/B testing was an intentional capability, not a side effect: projects could be cloned, deployed online with public or password-gated access, and evaluated side by side against real users.

*Side-by-side prediction, then toggle.* The first release showed the original drawing and the recognised version side by side by default. In testing we watched users begin to contort their sketches to help the model read them — the draw-predict-infinity-loop — and we moved side-by-side to a toggle. Transparency, on demand. Default-visible uncertainty had become its own attention tax.

*On-device, sovereign model.* No remote API calls. No third-party cloud dependency that could change its terms or lose compliance posture mid-project. This was a 2018 decision that most 2026 AI products still have not made.

## Outcome

The outcome was not a metric. It was a capacity.

Senz bypassed the six-figure budget gate that had stood in front of every internal test. No one needed approval to test a business idea. A claims handler, an underwriter, a product manager could now assemble a working prototype from a sketch in days rather than quarters, deploy it, run it against real data, and archive it when it didn't work — without a developer in the chain, without a design sprint, without a proposal deck. The unit of measurement shifted from *the idea* to *the test*. Failure became cheaper than the meeting held to debate it.

One specific test proves the capacity worked.

An in-house agent working on bike insurance — a single employee, not a consultant — used Senz to test an idea the company would not have generated otherwise. The observation was plain: many urban cyclists were not ready to commit to monthly or yearly premiums, and the institutional default was to write them off. The hypothesis was that this was the wrong gesture.

What if, instead of turning these people away, the company offered them a near-zero-cost service — something small, useful, oriented toward preventing the risk they were not yet ready to insure against? Not a discount. Not a trial. A caring gesture: the business acknowledging it was about risk reduction, not only premium collection.

Senz made it testable in days. The prototype was assembled from existing customer data, infrastructure, and risk models — recombined into a service that would never have survived the budget approval required to build it conventionally. The segment the company had previously been unable to reach began to engage — not with the product, but with the posture behind it. Trust was the outcome. The service was only its instrument.

> Technology like this will revolutionize the way we innovate and supports non-designers and non-developers on their way to build a digital product by themselves.
> — Kai Kölsch, Founder & CEO, Seedbox Ventures

## What it invites

The matter is already there. The work doesn't belong where it used to.

It stops being the specialist's — the consultant, the lab, the people with permission to conjure. It belongs to anyone who touches the matter. The CTO whose systems already contain latent capability. The designer who has seen what the customers actually need. The claims expert at the whiteboard. These are the people who already know. Most of the time, they are waiting for permission.

Senz was one instrument for granting that permission. There will be others. The matter is rarely the obstacle.

## Team

I led the project end-to-end at Kaiser X Labs (Allianz): product concept and design, full UX, end-to-end training dataset and labeling strategy, multi-framework reasoning, and the research-insights connectors that let us validate business models on real data.

The core team was three.

**Sven Martinov**
: Built the four ML models. Deployed, ran, and scaled the on-prem inference servers. Scaled the labeling studio. Owned the FastAPI connectors across the ML and no-code surfaces.

**Olivier Gonthier**
: Rebuilt the multimodal interface — touch, pen, drag-and-drop, upload. Built the multi-framework code-mapping engine and the conditional business-logic builder.

Two earlier contributors shaped Senz before the core team came together.

**Jakob Berhend**
: Design and documentation in Senz's early stage. Kept the project's progress legible as the concept took shape.

**Maksim Kipot**
: Built the front-end of the original Senz prototype.

Björn Frank sponsored the deployment with continuous support and a visionary commitment to scale the product in-house.

## Tech

Flutter companion app with custom computer-vision preprocessing · RetinaNet for region detection, LayoutLM for contextual classification · on-prem inference, no remote API calls · multi-framework output (Angular, Vue, React) targeting numerous design systems including Allianz's internal library, IBM Carbon, Google Material, Microsoft Fluent · webhook and connector-based integrations · declarative flow and logic composition layer · versioned prototypes with public or password-gated deployment.
