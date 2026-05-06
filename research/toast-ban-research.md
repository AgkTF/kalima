# Research: GitHub's Design Philosophy on Toast Notifications vs. Inline Feedback

## Summary

GitHub's Primer design system explicitly **bans toast notifications** and recommends inline feedback, banners, and dialogs instead. The decision is driven primarily by accessibility (WCAG 2.2 compliance at Levels A and AA) and by systemic governance concerns at GitHub's scale — where many independent teams sharing one design system make toast misuse probable and costly. The core philosophy is that feedback should be **persistent, contextual, and proximity-based**: place the message near the action that triggered it, keep it visible until acknowledged or resolved, and avoid ephemeral, corner-of-screen notifications that are easily missed, hard to reach via keyboard/screen reader, and impossible to review after they disappear.

## Findings

### 1. GitHub Primer officially bans toasts and recommends three alternatives

The Primer accessibility documentation states unequivocally: **"Toasts pose significant accessibility concerns and are not recommended for use."** The design system reserves an entire dedicated page breaking down the barriers and offering alternatives. [Source](https://primer.style/accessibility/toasts/)

Primer's recommended messaging hierarchy (most to least prominent):
- **Banners** — for page/section-level feedback, placed at top of body content, persistent until dismissed
- **InlineMessages** — for contextual feedback near the action (below an input, next to a button, within a table)
- **Dialogs** — for deliberately interrupting the user with critical information requiring a decision

Key quote from the docs:
> *"There does not need to be a secondary form of reinforcement to communicate success, as it should be self-evident — including a toast to communicate this success may ironically lessen a sense of trust."*

### 2. GitHub identifies 4 primary WCAG violations and 8 usability problems with toasts

**Primary WCAG SC violations** (Level A/AA): [Source](https://primer.style/accessibility/toasts/)

| Criterion | Issue |
|---|---|
| **2.2.1 Timing Adjustable (A)** | Toasts auto-dismiss before many users can read or act on them |
| **1.3.2 Meaningful Sequence (A)** | Toasts are placed at DOM start/end, disconnected from what triggered them for assistive tech |
| **2.1.1 Keyboard (A)** | Interactive toasts are hard to reach and operate via keyboard; focus management on dismiss is unreliable |
| **4.1.3 Status Messages (AA)** | Toasts must be announced to AT without disrupting the user's working context — rarely done correctly |

**Usability problems** cited:

1. **Large displays** — Toast sits outside the user's field of view on wide monitors
2. **Distractions/multitasking** — Auto-dismiss means the message is gone if the user is tab-switching
3. **Blocking UI** — Floating toasts obscure underlying content (especially bottom-corner form buttons)
4. **Screen magnification** — Magnifier users may never see a toast in the corner
5. **Working memory** — No way to review the message after it disappears
6. **Banner blindness** — Overused pattern; users are trained to ignore them
7. **Disconnection** — Violates the gestalt principle of proximity (message is far from its trigger)
8. **Accidental dismissal** — Pressing Esc can dismiss the wrong thing

### 3. GitHub's Toast PR was explicitly rejected by the design team

In July 2023, a contributor submitted a PR (#3482) to introduce a `<Toast />` component to `@primer/react`. The PR received pushback from the accessibility team: [Source](https://github.com/primer/react/pull/3482)

> *"Toasts are listed as a High Risk Pattern for accessibility. Please bring this pattern to an upcoming Office Hour with the Accessibility team."* — @inkblotty (GitHub Accessibility)

The PR was ultimately **closed by the author** in August 2023 with the note:
> *"Closing this, as there has been a decision made to NOT contribute this into Primer at this time."*

When asked if it would be reconsidered, @langermank (GitHub Design) replied:
> *"We are currently considering our options around messaging type components, and will have more clarity to share next year! Stay tuned."*

In June 2024, instead of shipping a Toast, Primer shipped the **InlineMessage** component (PR #4443), solidifying their alternative pattern.

### 4. The "success messaging flowchart" explicitly rejects toasts for most success cases

Primer's decision tree states: [Source](https://primer.style/product/ui-patterns/notification-messaging/)

> *"If the success of the action is evident on the page → Additional visual messaging not needed."*

Only when success is NOT evident should a message be shown, and even then it should be a **Banner or InlineMessage**, never a toast. Examples:
- **Toast NOT needed:** Creating a single issue (user is taken to the new issue page), saving a comment edit (returns to updated comment)
- **InlineMessage needed:** Bulk creating issues, copy-to-clipboard (shows a checkmark or message near the button)

### 5. GitHub's position is fundamentally about governance at scale, not a universal rule

The counter-analysis from Courier (Dec 2025) makes a compelling distinction: [Source](https://www.courier.com/blog/youre-not-github-toasts-are-probably-fine-for-your-app)

> *"GitHub is operating with a huge surface area, a lot of independent teams, and a very high accessibility bar. In that world, pulling a sharp, easy-to-misuse pattern out of the shared system is one way to reduce risk. Most apps are not in that world."*

The author's recommended model: use toasts as **optional hints on top of a notification center**, never as the sole source of truth:
1. Every important event goes into a notification center (permanent, reviewable record)
2. Some events also trigger a toast (real-time optional hint)
3. Nothing is toast-only

Obra Studio's analysis concurs: [Source](https://obra.studio/blog/2025/11/25/github-no-longer-uses-toasts)

> *"Github is a bit too quick to dismiss toasts: they don't give any examples for feedback on mobile, nor give any examples on what to do in a fixed panel layout... The patterns they document only cover a subset of user interfaces."*

### 6. Linear uses a notification-inbox model, not real-time toasts

Linear's notification system is **inbox-centric**, not toast-centric: [Source](https://linear.app/docs/notifications)

- All notifications go to the Linear **inbox** (persistent, reviewable)
- Real-time delivery is via **desktop app, mobile app, Slack, or email digests**
- Linear explicitly **dropped browser-based desktop notifications** — they're "no longer supported"
- Users batch-process notifications via the inbox rather than reacting to transient pop-ups
- Notifications are grouped (status changes, priority changes, blocking relationships)

This aligns with GitHub's philosophy: persistent, reviewable, and user-controlled rather than ephemeral and interruptive.

### 7. The wider design system landscape is split — Carbon, Material, and others still support toasts

Major design systems take different stances:

| System | Toast Position | Source |
|---|---|---|
| **Carbon (IBM)** | Supports toasts with strict rules: ≤3 lines, stack vertically, actionable toasts persist until dismissed | [Source](https://carbondesignsystem.com/patterns/notification-pattern/) |
| **Material Design** | Snackbars at bottom of screen, brief, with optional action | Material Design docs |
| **PIE (Just Eat)** | Bottom-left/bottom-right, 5s auto-dismiss, priority queue, persistent if actionable | [Source](https://pie.design/components/toast) |
| **HDS (Helsinki)** | Toasts for non-contextual events; inline notifications for content-related info | [Source](https://hds.hel.fi/components/notification) |
| **Primer (GitHub)** | **Banned** — replaced with Banner + InlineMessage + Dialog | [Source](https://primer.style/accessibility/toasts/) |

### 8. The UX research consensus: toasts are for low-stakes, non-critical feedback only

The Human Standards notification guide (2025) establishes a clear hierarchy: [Source](https://www.humanstandards.org/interaction-patterns/notifications-feedback/)

1. **Inline/contextual** — least disruptive, near the trigger, persistent until resolved
2. **Toasts/snackbars** — low disruption, auto-dismiss 4-6s, for action confirmations and undo opportunities
3. **Banners/alerts** — moderate disruption, persistent, for system status and important warnings
4. **Modals/dialogs** — highest disruption, for destructive confirmations and critical errors

Smashing Magazine's Vitaly Friedman strongly advises against toast error messages specifically: [Source](https://smashingmagazine.com/2022/08/error-messages-ux-design/)

> *"I'd definitely stay away from designing error messages as toasts, even if they are persistent. The better we can connect an error with its cause visually, the less likely it is to be overlooked."*

### 9. GitHub follows through on the philosophy in practice

Investigation confirms GitHub uses **zero toasts across all platforms** — GitHub.com web, GitHub Desktop, and the iOS client. This is a comprehensive, enforced design decision, not just documentation. [Source](https://obra.studio/blog/2025/11/25/github-no-longer-uses-toasts)

### 10. Key tradeoffs summary

**Inline/persistent feedback advantages (GitHub's position):**
- Accessible to screen reader and keyboard users
- No reliance on timing/auto-dismiss
- Proximity to the action creates direct mental association
- Users can review at their own pace
- No content obscured by floating elements
- Consistent DOM placement

**Toast advantages (industry counterpoint):**
- Very easy to implement globally (`toast.add()` from anywhere)
- Useful for async/background completions where user may be elsewhere in the app
- Lower-code alternative for teams without dedicated design resources
- Familiar pattern users already understand
- Works well when paired with a notification center as the source of truth

**Primary risk of inline-only (critics' view):**
- Layout shifts when banners appear can be jarring in panel/fixed layouts
- Requires more deliberate design work per use case (no one-size-fits-all)
- No pattern for transient feedback on scroll-less views (code editors, dashboards)

## Sources

- **Kept:** Primer Accessible Notifications and Messages (https://primer.style/accessibility/toasts/) — authoritative, primary source for GitHub's toast ban and all WCAG analysis
- **Kept:** Primer Notification Messaging (https://primer.style/product/ui-patterns/notification-messaging/) — official flowcharts and decision trees for message type selection
- **Kept:** primer/react PR #3482 (https://github.com/primer/react/pull/3482) — documents the explicit rejection of Toast component by GitHub's design/accessibility team
- **Kept:** primer/react PR #4443 (https://github.com/primer/react/pull/4443) — shows InlineMessage shipped as the alternative to Toast
- **Kept:** Courier "You're Not GitHub" (https://www.courier.com/blog/youre-not-github-toasts-are-probably-fine-for-your-app) — best counter-analysis; articulates the scale/governance distinction and the notification-center model
- **Kept:** Obra Studio analysis (https://obra.studio/blog/2025/11/25/github-no-longer-uses-toasts) — practical critique with specific gaps (mobile, panel layouts)
- **Kept:** Hacker News discussion (https://news.ycombinator.com/item?id=46196831) — real developer/user perspectives; many concur with GitHub
- **Kept:** Human Standards Notifications & Feedback (https://www.humanstandards.org/interaction-patterns/notifications-feedback/) — comprehensive 2025 industry consensus on notification hierarchy
- **Kept:** Carbon Design System Notifications (https://carbondesignsystem.com/patterns/notification-pattern/) — major enterprise design system comparison
- **Kept:** Linear Notifications Docs (https://linear.app/docs/notifications) — real-world inbox-centric model from a well-regarded product
- **Kept:** Smashing Magazine Error Messages UX (https://smashingmagazine.com/2022/08/error-messages-ux-design) — authoritative UX voice against toast errors

- **Dropped:** Medium "GitHub Just Killed Toast Messages" — secondary summary, no original research beyond Primer docs already covered
- **Dropped:** Red Hat Alert Guidelines — too specific to Red Hat's component API, redundant with Carbon/Material
- **Dropped:** PIE Design System Toast docs — covered by Carbon comparison already
- **Dropped:** Various smaller design system docs (Keep, Recursica, etc.) — redundant; the major systems (Primer, Carbon, Material) cover the spectrum

## Gaps

1. **No public talks or articles by GitHub designers** were found that explain the philosophy in a narrative/conference format. The decision is documented in internal (staff-only) deep dives and the public accessibility docs, but no designer blog post, podcast, or conference talk articulating the reasoning was discoverable. The closest is the Primer accessibility documentation itself.

2. **No specific user testing data** is published. GitHub references "thorough, moderated, task-based testing with blind, low vision, and motor control disabilities" using NVDA, JAWS, VoiceOver, Windows Magnifier, and Dragon — but the actual test results, methodology, and findings are internal. Adam Silver (cited in GitHub's docs) claims this testing occurred, but the data itself is not public.

3. **Notion and Things (by Cultured Code)** specific toast/inline patterns were not deeply researched. The search results focused more on Linear (which was well documented). A follow-up could examine Notion's specific feedback patterns in their web and desktop apps, and Things' approach on iOS/macOS.

4. **Mobile-specific guidance** is notably absent from GitHub's toast documentation. Primer covers responsive design principles but does not address whether the toast ban applies equally on mobile web or in native mobile contexts, where toasts/snackbars originated. This is also the primary critique from the Obra Studio analysis.
