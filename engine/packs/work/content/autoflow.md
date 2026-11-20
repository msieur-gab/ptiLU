---
title: AutoFlow
type: work
context: self-initiated
year: 2026–
where: Independent project
themes: [gdpr, trust, privacy]
intro: AutoFlow is my answer to that.
brief: "We need to be GDPR-compliant."
question: Why can only legal see where the risk is?
answer: Draw how data moves through the company by hand. A tiny model running in the browser turns the drawing into a working pipeline that anonymises, encrypts and documents the data, without it ever leaving the device.
tagline: A visual GDPR governance workbench where you draw the data flow — and the diagram itself shows you where the risk lives.
why: Every Record of Processing Activities tool on the market turns a spatial, relational question — how does personal data move through our organisation? — into a spreadsheet. The structure of the tool prevents the understanding it is supposed to produce.
what: A local-first workbench where hand-drawn shapes become GDPR compliance modules, connected by Sankey-style bands whose thickness shows how much personal data flows through and whose colour shows how exposed it is. A canvas that recognises drawings on the device. A scoring formula published openly so anyone can inspect it. Zero server infrastructure.
outcome: The tool that maps an organisation's data flows never lets that map leave the device. The scoring is published mathematics, not vendor opinion. The act of building the flow teaches the regulation's logic — the interaction IS the audit.
source: web-thecube/content/pieces/autoflow
keywords: [gdpr, privacy, data protection, personal data, compliance, compliant, regulation, regulatory, legal, risk, dpo, anonymise, anonymize, anonymisation, anonymization, encrypt, encryption, sensitive data, hr, patient, health, sharing data, data flow, audit, explain, explainable, ai act, local, on-device, browser, sovereignty]
answers:
  - Where does our personal data actually go?
  - How do we make GDPR understandable to people outside legal?
  - Can we use our customer data with AI and stay GDPR-compliant?
  - Compliance keeps saying no. What would a yes look like?
  - Can regulation be a design brief instead of a blocker?
  - Can the data stay on the user's device?
  - How do we anonymise data before sharing it?
questions:
  - q: How do we see where personal data flows in our organisation?
    see: A ROPA describes a network
  - q: Is there an alternative to compliance spreadsheets?
    see: GDPR requires every organisation processing personal data
  - q: How can a data protection officer see risk at a glance?
    see: The Sankey clicked because
  - q: Our compliance tool is hosted in the US. Is that a problem?
    see: There is a second problem layered on the first.
  - q: How can we trust a risk score?
    see: The scoring model publishes itself.
  - q: How do we help people understand what GDPR requires?
    see: AutoFlow is a training tool as much as a compliance tool.
  - q: What should a tool do when it cannot recognise what you drew?
    see: The classifier is not allowed to guess.
  - q: Why build without frameworks or a build step?
    see: No build step, no framework dependency.
  - q: How is the risk colour calculated?
    see: The Sankey carries two dimensions in one band.
  - q: Can the tool extend to healthcare data or NIS2?
    see: The schema is the architecture.
  - q: Who is compliance tooling really for?
    see: The deeper argument the tool makes
  - q: How do you train a small model that works for real users?
    see: The training data comes from the same canvas
---

*Creator — Systems Designer & Design Engineer — 2026 — solo*

## TL;DR

**Why:** Every Record of Processing Activities tool on the market turns a spatial, relational question — how does personal data move through our organisation? — into a spreadsheet. The structure of the tool prevents the understanding it is supposed to produce.

**What:** A local-first workbench where hand-drawn shapes become GDPR compliance modules, connected by Sankey-style bands whose thickness shows how much personal data flows through and whose colour shows how exposed it is. A canvas that recognises drawings on the device. A scoring formula published openly so anyone can inspect it. Zero server infrastructure.

**Outcome:** The tool that maps an organisation's data flows never lets that map leave the device. The scoring is published mathematics, not vendor opinion. The act of building the flow teaches the regulation's logic — the interaction IS the audit.

## Overview

AutoFlow is an independent project — a data sovereignty workbench for domain experts who bear legal responsibility for personal data they cannot technically protect. HR managers, GPs, compliance officers, legal secretaries: people told to "anonymise this before sharing it" without ever being given a tool that lets them do so without involving a developer or a cloud service. Built solo, in vanilla web components, with on-device classification and a published scoring model.

## Problem

GDPR requires every organisation processing personal data to maintain a Record of Processing Activities — Article 30. The industry response was spreadsheets, SaaS dashboards, and compliance platforms that turn a regulation about protecting people into a data entry exercise. A Data Protection Officer opens a tool, fills in fields, saves a row. The output is a table that satisfies an auditor but teaches no one anything about where risk actually lives.

The problem is not that these tools are bad at their job. The problem is that their job is wrong.

A ROPA describes a network — who collects personal data, what happens to it, where it is stored, who receives it. That is a spatial, directional, relational question. Every tool on the market answers it with rows and columns. When a DPO needs to know "what happens to health records after they enter our system?" — the answer is a path through a network. Not cell B247.

There is a second problem layered on the first. The data a DPO enters into a ROPA tool is itself sensitive — a complete map of an organisation's personal data processing. The market leaders host that map on third-party servers, often under US jurisdiction. The compliance tool creates a compliance problem about the compliance tool. The territory and the map should be made from the same material.

## The moment

The first sketches were node graphs. Boxes, lines, arrows — the obvious answer when you say "diagram." They failed almost immediately. A node graph lets you connect anything to anything, which is technically expressive and operationally meaningless. A DPO does not need infinite freedom. They need a *sequence* — where the data enters, what happens to it, where it leaves. Freedom was making the structure invisible again.

I redrew the canvas as a sequencer. Left to right. Modules arranged like a signal chain — load, condition, transform, enrich, export. The same metaphor a music producer uses to think about audio passing through effects. The horizontal axis became the story: data starts on the left, has things done to it in the middle, ends on the right. There is no other path to walk. The shape of the canvas teaches the shape of the regulation.

Then the second question. If the diagram is the document, the diagram has to *show risk*. Not after you click. Not after you read. At a glance. I tried colour-coded cells, heatmap overlays, badge icons — all of them turned risk into a separate vocabulary layered on top of the structure. The DPO had to learn the dashboard before they could read it.

The Sankey clicked because it carries two dimensions in a single band. Thickness is how much personal data is moving. Colour is how exposed that data is. The information lives in the connection itself, not in a legend you have to consult. A thick red band crossing a border is not a chart annotation. It is the picture, drawn correctly.

That was the moment. The diagram stopped being a representation of the document and became the document.

## Approach

### Design principles

Three principles, held together.

**Affordance.** The canvas IS the workspace. You draw where you want the module to live, and the shape itself decides what it is — circle becomes Data Subject, square becomes Data Store, diamond becomes a compliance gate. There is no "add module" button. No mode switch. The interaction is indistinguishable from sketching on a whiteboard, except the whiteboard understands what you drew.

**Transparency.** The scoring model is published mathematics, not a black box. A separate audit page imports the same code the application runs and exposes every weight, every threshold, every multiplier — with an interactive calculator that lets any regulator, auditor, or DPO verify the result themselves. Trust is structural here, not promised.

**Sovereignty.** The data a ROPA tool sees is the most sensitive map in an organisation. AutoFlow runs entirely client-side. No server, no account, no telemetry. The classifier runs on the device. The scoring runs on the device. The flow never leaves the browser tab that drew it. The tool practices what the regulation preaches.

### Key decisions

*The Sankey carries two dimensions in one band.* Each personal data field adds 4 pixels of band width — a connection carrying name and email is thin, a connection carrying twelve fields is visibly heavier. The colour is computed from three factors: sensitivity (Article 9 special categories score highest), state (clear text exposes fully, encryption neutralises, anonymisation eliminates), and destination (US jurisdiction under CLOUD Act, EU encrypted access-controlled, and everything between). Multiply the three. Above the high threshold — red. Above the medium — orange. Below — blue. Three colours, matching the decision space a DPO actually operates in: act now, review, or accept.

*The band is a gradient, not a single colour.* Source colour on the left, arrival colour on the right. A band that leaves blue and arrives red is telling you: this data was protected when it departed, but the destination undid that protection. A band that stays red end to end is telling you: this data was never protected at all. The gradient is the narrative. The thickness is the scale. Together they answer "how bad is this?" faster than any dashboard.

*The classifier is not allowed to guess.* Below the confidence threshold, the drawn strokes flash red and erase themselves. The canvas returns to blank. A compliance tool that misinterprets a gesture produces a record that misleads the regulator. A tool that admits uncertainty produces trust. Accountability over confidence — the same principle that governed Senz eight years earlier.

*The training data comes from the same canvas as the inference data.* The first version of the classifier was trained on a public dataset of crowd-sourced drawings. It scored well on tests and failed on real fingers. The strokes a single user makes on a specific canvas do not look like crowd-sourced sketches. So the training set was redrawn — on the same canvas the tool uses to recognise. The model is small because it is exact, trained where it lives, on the strokes it will actually see. Not an engineering detail. The same design instinct as everything else in the tool: the territory and the map are made from the same material.

*The scoring model publishes itself.* `audit.html` is a standalone page that imports the same scoring code the application uses. Every weight, every threshold, every multiplier is inspectable. An interactive calculator lets anyone pick any combination and see the score and colour update in real time. A regulator or DPO opens the page and verifies: health record + clear + US store = red band. Not an opinion. Arithmetic. The same arithmetic the tool runs every time a connection is made.

*The schema is the architecture.* Every module type owns a schema file: its fields, its risk logic, its output contract, its validation warnings. The card component is a dumb renderer — it reads a schema, builds a form, displays the result. All domain knowledge lives in the schemas. Adding a new module type — FHIR healthcare bundle, NIS2 incident output, EHDS interoperability — is adding a schema file, not modifying core code. The architecture scales by addition.

*No build step, no framework dependency.* Vanilla JavaScript. Web components. No NPM supply chain. No forced upgrades. The application is the source code. A sovereignty decision, not a minimalism preference — the tool is small enough to inspect end-to-end, and stable across the decade-scale timelines that compliance regulations actually live on.

## Outcome

AutoFlow is in development. The outcome it points at is not a metric but a stance.

The deeper argument the tool makes is about who compliance tooling is for. If it is for auditors, a spreadsheet suffices — rows satisfy checkboxes. If it is for the people responsible for protecting personal data, the tool should make risk visible, not just recordable. A DPO should be able to glance at their screen and see the problem — a thick red band crossing a border — not discover it in a quarterly report.

AutoFlow is a training tool as much as a compliance tool. The act of building the flow — drawing shapes, connecting them, watching bands change colour as you configure jurisdictions and encryption — teaches the regulation's logic. The interaction IS the education. The colour IS the feedback. The Sankey IS the understanding. A DPO who builds one flow learns more about their organisation's data posture than they would reading the spreadsheet they spent three months filling in.

The same architecture extends naturally. FHIR R4 bundles for EHDS healthcare interoperability. Verifiable Credential issuance for eIDAS 2.0. Audit trail artifacts for NIS2 incident reporting. Each is a new schema file. The core does not change. The published scoring formula does not change. The on-device boundary does not change.

## What it invites

The map should look like the territory. The tool that protects data should not be the tool that leaks it. The mathematics behind a risk score belong in front of the user, not behind a vendor's confidence.

These are not innovations. They are the obvious shape of the work, recovered after a decade of compliance tools that treated regulation as a billing surface rather than a design constraint. AutoFlow is one instance of that recovery. The principles transfer.

## AI tools, human ownership

Built solo. Product direction, architecture, every design decision, and acceptance criteria were mine. The tools below carried specific weight in the workflow.

**Gemini** — Market-signal research. I framed the questions, weighed returned signals against domain knowledge, and decided which findings shaped product direction.

**Lumo** — European regulation. EU-jurisdictional by design. I framed the compliance questions, tested returned interpretations against project constraints, and decided which guardrails to embed.

**Claude Code (CLI)** — Code pairing, refactor, and review. Implementation against constraints I defined. I owned acceptance, integration, and ship decisions.

**Claude (web)** — Positioning and pressure-testing. Used to stress-test my own framing — challenging assumptions, surfacing competing perspectives, sharpening claims before they shipped.

The principles that shaped the approach — accountability-over-confidence, on-device NLU, schema-driven architecture — carry forward from earlier collaboration with Sven Martinov and Olivier Gonthier on Senz at Kaiser X Labs.

## Tech

ONNX Runtime Web (WASM backend, SIMD) for on-device shape classification · tiny CNN trained on hand-drawn samples from the same canvas as inference · MiniLM-L6-v2 for natural language module configuration · vanilla web components, no framework, no build step · schema-driven module cards with shared reference data for jurisdictions, data categories, encryption methods, legal bases, transfer mechanisms · Sankey-band renderer with thickness-by-volume and gradient-by-exposure encoding · standalone `audit.html` that imports the live scoring code · Web Crypto API (RSA-OAEP + AES-GCM hybrid) for the encryption module · DID-based key management for recipient-encrypted output · roadmap modules: FHIR R4 bundle output, Verifiable Credential issuance, audit-trail compliance artifact.
