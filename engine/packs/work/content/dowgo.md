---
title: Dowgo
type: work
context: commissioned
year: 2024
where: Dowgo · two-week consulting engagement
themes: [ideas, trust]
intro: Dowgo was exactly that.
brief: "Our due diligence data room needs to be better organised."
question: What if the data room showed what's missing and who has to act, instead of only storing files?
answer: A two-week engagement that redesigned a due diligence data room around a conversational layer. The file system stays, and an agent beside it surfaces what's missing, takes delegation in plain language and points to the next action. Delivered as working code, in production.
tagline: A due diligence data room redesign that turned passive document storage into guided action — without making anyone learn anything new.
why: Due diligence platforms treat document management as an organisation problem. It isn't. Users can organise. What they cannot do is see what's missing, who needs to act, and what comes next — while juggling legal teams, auditors, and deadlines across borders.
what: A two-week consulting engagement that redesigned the data room around a conversational layer. The file system stays. An agent sits beside it — greets you by name, surfaces what's missing, accepts delegation in natural language, and points the workspace at the next action. Delivered as working code in the client's production stack, not a reference design.
outcome: In production. The company raised €2M in funding shortly after and now processes €300K+ in active business through the platform. The redesigned data room is the surface where every one of those transactions begins.
source: web-thecube/content/pieces/dowgo
keywords: [due diligence, data room, fundraising, raising, funding, investors, investor, auditors, audit, legal, documents, document management, process, complex, complexity, friction, workflow, onboarding, agent, conversational, delegation, consulting, two weeks, prototype, production, fintech, blockchain, renewable energy]
answers:
  - We're raising. How do we get due diligence under control?
  - Our process has grown too complex. Where does the friction come from?
  - How do we improve a tool without making people learn something new?
  - What can a consultant deliver in two weeks?
questions:
  - q: We are raising money. How do we get due diligence under control?
    see: The file system showed them what existed.
  - q: How do we improve a tool without making people learn something new?
    see: Users had decades of fluency with file systems
  - q: Should we add AI to sort our documents?
    see: Pattern matching, not AI categorisation.
  - q: Is it safe to send sensitive documents to an AI model?
    see: In a platform handling sensitive investment documentation
  - q: Why not just build a dashboard?
    see: I sketched five dashboard concepts
  - q: What can be delivered in two weeks?
    see: Two weeks from first conversation to working code
  - q: How do you coordinate document requests between many parties?
    see: Natural language delegation.
  - q: What did the redesign change for the business?
    see: In production. The company raised
  - q: How do you work in a domain you do not know?
    see: Walking into someone else's domain
  - q: What happens if the ambitious feature fails?
    see: Built to degrade.
  - q: How do you hand work over to a development team?
    see: Delivered in the client's stack.
  - q: How do you push back on a client's brief?
    see: I pushed back on the brief
---

*External Consultant — Systems Design & Prototyping — 2024 — engaged by Romain Menetrier, CPO/CTO of Dowgo*

## TL;DR

**Why:** Due diligence platforms treat document management as an organisation problem. It isn't. Users can organise. What they cannot do is see what's missing, who needs to act, and what comes next — while juggling legal teams, auditors, and deadlines across borders.

**What:** A two-week consulting engagement that redesigned the data room around a conversational layer. The file system stays. An agent sits beside it — greets you by name, surfaces what's missing, accepts delegation in natural language, and points the workspace at the next action. Delivered as working code in the client's production stack, not a reference design.

**Outcome:** In production. The company raised €2M in funding shortly after and now processes €300K+ in active business through the platform. The redesigned data room is the surface where every one of those transactions begins.

## Overview

Dowgo is a blockchain-based renewable energy investment platform. Romain Menetrier, CPO/CTO, engaged me to redesign the due diligence data room — a regulated workflow where founders, legal teams, auditors, and investors coordinate around twenty-four required document types across ten categories. Two weeks. One consultant. Working code delivered into the client's git repository in React and Shadcn — the same stack the development team uses in production.

## Problem

Every due diligence platform on the market is built on the same paradigm: a data room. Folders, files, upload buttons. The metaphor is a filing cabinet — a place to put things so other people can find them. The paradigm works. Users know how file systems behave. That fluency is an asset, not a constraint.

Users could organise. What they could not do was act.

The file system showed them what existed. It did not show them what was missing, what was overdue, or who needed to provide what. Every action required holding the full mental model of the regulated process in your head — and no surface anywhere told you where you stood. The cognitive load did not live in filing documents. It lived in tracking the process around them.

The brief, when Romain first described it, was to add AI categorisation. A modern solution for a modern platform. That instinct was wrong, and saying so was the first job.

## The moment

I pushed back on the brief and asked for time before touching a screen. Not designing. Listening. Mapping how users actually worked — not how they described working.

I sketched five dashboard concepts during the first week. Each was technically correct and emotionally wrong. Dashboards make the user do the same triage that was already exhausting them, just with prettier charts. The problem wasn't a missing view. It was a missing voice. The data room held information. It never spoke.

The reframe arrived as a constraint, not a feature: *make it feel too easy to be true.* Due diligence platforms compete on visible complexity — every vendor stuffs the screen to justify the price tag. But Dowgo's real value was invisible: blockchain verification, regulatory rigor at the protocol level, code intelligence built by a CTO who understood compliance as infrastructure rather than policy. When that much intelligence flows through interconnected data, a single feature can unfold many tasks at once. Simplifying the interface did not diminish the platform. It magnified it.

That was the direction. Not a dashboard. A colleague handing you the next thing.

## Approach

### Design principles

Three principles, held together.

**Augment, never replace.** Users had decades of fluency with file systems. Replacing that paradigm meant replacing muscle memory. The cost is retraining. The benefit is aesthetic. Instead, the conversational layer was inserted *alongside* the file system, leaving the existing structure intact and giving it a voice.

**Restraint as a design skill.** In a platform handling sensitive investment documentation — financial records, legal filings, KYC data — sending content to a third-party AI model introduces legal liability that the engagement could not justify. Pattern matching runs locally, costs nothing, exposes no data, and categorises the same documents with the same accuracy. Saying no to the modern answer was harder than saying yes. It was the right call.

**Conversation over command.** The interface splits into two cognitive surfaces — an agent that thinks for you, a workspace that works with you. The agent narrows attention to the next action. The workspace executes it. Neither pretends to do the other's job. The loop closes on every upload.

### Key decisions

*Two surfaces, one loop.* The agent greets by name, knows the time of day, understands the user's role. Drop a ZIP archive — the system unpacks it, reads each file, and sorts everything into the canonical due diligence structure using pattern matching against the known anatomy of a data room. Once files are placed, the agent shifts register: it announces progress as a conversation, surfaces missing items as action cards, and points the workspace at the relevant folder when an action card is tapped. Every upload reassesses the state. The system is always current — not because someone updated a status field, but because the conversation never stops.

*Pattern matching, not AI categorisation.* Twenty-four required document types across ten categories — Overview, Legal, Financials, Tax, Tech, Market, Governance, KYC/AML, Commercial, Risk. Regex with lookahead constraints captures the document anatomy more reliably than any LLM inference, runs in milliseconds on the device, and exposes zero content to a third party. The matching is a small dataset of human knowledge encoded once, not a model retraining problem forever.

*Natural language delegation.* Due diligence involves multiple external parties. Coordinating document requests through form interfaces means filling out fields for recipient, document type, deadline, priority, notes — per request, per party. The delegation input compresses that into a single line: `@legal team provide shareholder agreement by :next Friday`. Trigger characters for people, files, and deadlines. The system parses the sentence, resolves the date in any European format, identifies the document type, and presents the delegation for confirmation. The interface does not ask the user to speak its language. It speaks theirs.

*Welcoming entry, then scroll into the familiar.* The page opens with a greeting, the user's name, an always-visible status tracker, and action cards immediately operable. A smooth scroll then descends into the file system everyone already knew how to use. Two radically different paradigms, representing exactly the same data, connected by a single gesture.

*Built to degrade.* The conversational agent enhances the experience. Remove it, and the core still works — file organisation, completion tracking, missing document alerts. Ambitious features ride on top of solid foundations. They never hold them hostage.

*Delivered in the client's stack.* React and Shadcn, pushed directly into the production repository. Not a reference design to be interpreted by a development team. Working code to be extended. Alongside it: a Figma design system, hand-drawn interaction sketches, and written documentation of the design intent behind each decision — so the team could extend the product without guessing why something was built a certain way.

## Outcome

The outcome was not a feature list. It was a posture.

The data room stopped being a place to deposit documents and became a place where action was already on the table. The user's mental model — what's missing, what's due, who needs to act — was no longer something they carried alone. The system carried it with them, and asked for the next move at the moment the next move was possible.

Two weeks from first conversation to working code in their repository. A 30-minute validation session with Romain confirmed the concept was technically feasible, cost-conscious, and intuitive. The development team took it from there. Dowgo went into production. The company raised €2M in funding shortly after. The platform now processes €300K+ in active business — and every one of those transactions begins inside the surface I redesigned.

The data room is one face of a deeper system — blockchain-anchored investment infrastructure built by a CTO who understands compliance at the protocol level. The interface had to honour that invisible infrastructure without imitating it. Simple on the surface. Serious underneath.

## What it invites

Walking into someone else's domain — blockchain, renewable energy, investment compliance — and finding the real problem does not require expertise in the domain. It requires expertise in how people work. The question is never "what technology should we add?" The question is "where does the human struggle, and what is the minimum layer that makes the struggle disappear?"

The user did not learn anything new. The system started talking. The features that mattered were the ones removed, not the ones added.

That is not a UX improvement. It is a paradigm shift delivered as a whisper.

## Team

Dowgo was a solo engagement. Romain Menetrier carried the client side — he understood the problem deeply enough to recognise the reframing when it arrived, and trusted the engagement enough to let it land in production code. The development team at Dowgo extended the prototype into the live platform.

## AI tools, human ownership

Built solo. Product direction, architecture, every design decision, and acceptance criteria were mine. The tools below carried specific weight in the workflow.

**Gemini** — Market-signal research. I framed the questions, weighed returned signals against domain knowledge, and decided which findings shaped product direction.

**Lumo** — European regulation. EU-jurisdictional by design. I framed the compliance questions, tested returned interpretations against project constraints, and decided which guardrails to embed.

**Claude Code (CLI)** — Code pairing, refactor, and review. Implementation against constraints I defined. I owned acceptance, integration, and ship decisions.

**Claude (web)** — Positioning and pressure-testing. Used to stress-test my own framing — challenging assumptions, surfacing competing perspectives, sharpening claims before they shipped.

## Tech

React + Shadcn/ui + TypeScript production deliverable · regex-based document classification against a canonical 24-required + 8-optional schema across 10 categories · ZIP archive ingestion and local extraction · custom relative-date parser for European formats and natural language ("next Friday", "tomorrow") · natural language delegation input with trigger characters for people, files, deadlines · React hooks + localStorage state, no global state management · scroll-snap three-section layout · action-card carousel · personal re-implementation in Lit web components + Dexie/IndexedDB · Figma design system + interaction sketches delivered alongside the code.
