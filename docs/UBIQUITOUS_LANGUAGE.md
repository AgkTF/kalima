# Ubiquitous Language

## Capture lifecycle

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Capture** | A raw word or phrase recorded from reading or watching, before enrichment | Raw entry, input, recorded word |
| **Enrichment** | The agent process that adds definition, translation, nuance, examples, and connections to a **Capture** | Processing, annotation, augmenting |
| **Entry** | A **Capture** that has been enriched and approved, now residing in the **Word Bank** | Word entry, bank entry, record |
| **Re-enrichment** | A second or subsequent **Enrichment** run on a **Capture** or **Entry**, typically after attaching better **Source Context** | Re-processing, enrichment refresh |

## Sessions and sources

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Session** | A period of reading or watching a single **Source**, opened and closed explicitly by the user | Reading session, watching session, context window |
| **Source** | The material being read or watched during a **Session** — a book, video, or article | Material, content, reference |
| **Source Context** | Optional text from the **Source** (chapter, subtitle file, article) that enables higher-quality **Enrichment** | Source material, source text, reference text |
| **Locator** | A position within a **Source** — page number, chapter, timestamp, or URL fragment — provided at capture time | Position, reference, pointer |
| **One-off** | A **Capture** made outside of any **Session**, with no **Source** association | Standalone, ad-hoc |

## Enrichment quality

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Confidence** | The agent's self-assessed certainty that an **Enrichment** is correct and context-appropriate | Certainty, quality score |
| **Flag** | An **Enrichment** marked as uncertain by the agent, requiring human **Review** | Marked, ambiguous, uncertain |
| **Auto-approve** | An **Enrichment** with high **Confidence** that bypasses detailed human **Review** | Fast-approve, skip |
| **Review** | The human act of approving, correcting, or rejecting an **Enrichment** | Approval, verification |
| **Tier** | The model class used for **Enrichment** — fast/cheap for first pass, premium for flagged **Enrichments** | Model level, pass type |

## The word bank

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Word Bank** | The user's personal collection of approved **Entries** | Vocabulary, collection, bank |
| **Item** | A word or phrase that is the subject of a **Capture** or **Entry** — covers both single words and multi-word expressions | Token, term, word |

## Entry schema fields

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Definition** | The context-appropriate meaning of an **Item**, chosen based on **Source** and surrounding text | Meaning, sense |
| **Translation** | The Arabic equivalent of an **Item**, matching the register and nuance of the **Source** | Arabic translation, equivalent |
| **Nuance** | A note explaining the subtle shade of meaning, connotation, or usage context of an **Item** in its specific **Source** | Note, subtlety, explanation |
| **Example** | A sentence demonstrating the **Item** in use, generated to match the register and domain of the **Source** | Example sentence, usage |

## Relationships

- A **Session** is associated with exactly one **Source**
- A **Session** has many **Captures**
- A **Capture** belongs to exactly one **Session** or is a **One-off**
- A **Capture** may include a **Locator** (chapter, page, timestamp)
- A **Source** may optionally have **Source Context** attached (chapter text, subtitle file, fetched article)
- A **Capture** with **Source Context** yields higher-quality **Enrichment** than one without
- A **Capture** becomes an **Entry** after successful **Enrichment** and **Review**
- An **Enrichment** is assessed for **Confidence**; low **Confidence** results in a **Flag**
- A **Flagged Enrichment** is upgraded to a higher **Tier** or sent for human **Review**
- Attaching **Source Context** to a previously context-less **Capture** triggers **Re-enrichment**
- An **Entry** in the **Word Bank** connects to other **Entries** through shared **Source**, domain, or semantic relationships

## Example dialogue

> **Dev:** "When a user starts a **Session** reading Moby Dick, and they **Capture** 'serendipity' with a **Locator** of chapter 12 page 45, what happens?"

> **Domain expert:** "The **Capture** is stored with the **Session** metadata. If the user attached chapter 12 as **Source Context**, the **Enrichment** agent can locate the word in context and produce a high-quality **Entry**. Otherwise it enriches using just the **Source** title and genre."

> **Dev:** "And if the agent's **Confidence** is low — say 'bank' is ambiguous without seeing the surrounding sentence?"

> **Domain expert:** "The **Enrichment** gets a **Flag**. It's queued for human **Review**, and may be upgraded to a higher **Tier** model for a second pass. If the user later attaches **Source Context**, we run **Re-enrichment** to improve it."

> **Dev:** "What about words captured without any **Session** — like from a conversation?"

> **Domain expert:** "That's a **One-off**. No **Source**, no **Locator**, minimal context. The **Enrichment** still runs, but with less precision. The user can optionally tag it with a loose source hint like 'conversation' to give the agent a register signal."

## Flagged ambiguities

- "Word" was used throughout the conversation to mean both a single word (e.g., "serendipity") and a multi-word phrase (e.g., "call me Ishmael"). We canonicalize both as **Item** — a word or phrase that is the subject of a **Capture** or **Entry**.
- "Review" was used ambiguously to mean both (a) approving enriched entries and (b) SRS flashcard-style studying. We restrict **Review** to meaning (a) — the approval step. SRS flashcard review is explicitly out of scope for the initial build and should use a different term (e.g., "study" or "recall practice") when added later.
- "Context" was used loosely to mean both (a) the surrounding text from the source material and (b) the metadata about what/where the user was reading. We split these: **Source Context** for (a) — the actual text content — and **Session** metadata for (b). The general word "context" is avoided as a domain term.
- "Source" and "Source Context" are distinct. A **Source** is the material identity (title, type). **Source Context** is the optional text content that enables exact-quote enrichment. A **Capture** always has a **Source** (or is a **One-off**) but might not have **Source Context**.