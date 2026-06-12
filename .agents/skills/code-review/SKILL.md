---
name: code-review
description: "Review a GitHub pull request for problems. Use when asked to review a PR, do a code review, check a PR for issues, or review pull request changes. Focuses only on identifying problems — not style nits or praise."
---

# PR Code Review

You are a specialized code review agent. Your goal is to review a pull request and identify **problems only** — bugs, security issues, correctness errors, performance regressions, missing error handling at system boundaries, and violations of repository conventions. Do not comment on style preferences, do not add praise, and do not suggest improvements that aren't fixing a problem.

## CRITICAL: Step Ordering

**You MUST complete Step 1 (local checkout) BEFORE fetching PR diffs or file lists.** Branch-discovery calls (e.g., `gh pr view` to get the branch name) are allowed, but do not fetch diffs or file lists until Step 1 is resolved. Skipping or reordering this step degrades review quality and violates the skill workflow.

## Understanding User Requests

Parse user requests to extract:
1. **PR identifier** — a PR number (e.g., `7890`) or full URL (e.g., `https://github.com/owner/repo/pull/7890`)
2. **Repository** — if a full URL is provided, extract the owner/repo from it. Otherwise, discover from the current repo:

```bash
gh repo view --json nameWithOwner --jq '.nameWithOwner'
```

If no PR number is given, check if the current branch has an open PR:

```bash
gh pr view --json number,title,headRefName 2>/dev/null
```

## Prerequisites (one-time human setup)

This skill posts review comments via a dedicated bot GitHub account so AI-authored feedback is visually distinct from human comments. Set this up once:

1. Create a separate GitHub account (a "machine user") — this will be the identity that posts all AI review comments.
2. On that account, generate a classic Personal Access Token with `repo` scope at https://github.com/settings/tokens
3. Store the token locally:

```bash
mkdir -p ~/.config/gh
echo ghp_your_token_here > ~/.config/gh/review-bot-token
chmod 600 ~/.config/gh/review-bot-token
```

4. If reviewing repos the bot account doesn't own, invite it as a collaborator.

After initial setup, no further human intervention is needed. The skill references `~/.config/gh/review-bot-token` in Step 6.

## Step 1: Ensure the PR Branch Is Available Locally (BLOCKING — must complete before any other step)

Check whether the PR branch is already checked out locally:

```bash
# Get PR branch name
gh pr view <number> --json headRefName --jq '.headRefName'
```

```bash
# Check if we're already on that branch
git branch --show-current
```

If the current branch **matches** the PR branch, proceed to Step 2.

If the current branch **does not match**, inform the user that the PR branch must be checked out locally for a proper review, and offer:

- **Option 1 (required)**: Check out the branch — stash any uncommitted work, fetch, and check out the PR branch. This gives the best review quality because surrounding code is available for context.
- **Option 2 (not recommended)**: Stop the review — diff-only reviews produce lower-quality results because the agent cannot read surrounding code for context.

### Checking out the branch

```bash
# Check for uncommitted changes
git status --porcelain
```

If there are uncommitted changes, warn the user and stash them:

```bash
git stash push -m "auto-stash before PR review of #<number>"
```

Then check out the PR branch (this handles both same-repo and fork PRs):

```bash
gh pr checkout <number>
```

## Step 2: Gather PR Context

Fetch the PR metadata, diff, and file list using the `gh` CLI.

1. **Head commit SHA** — needed for posting review comments in Step 6:

```bash
gh pr view <number> --json headRefOid --jq '.headRefOid'
```

Store this in a variable (`COMMIT`) for later use.

2. **PR details** — get the title, description, base branch, and author:

```bash
gh pr view <number> --json title,body,baseRefName,author
```

3. **Changed files** — get the list of changed files. Paginate if there are many files:

```bash
gh pr view <number> --json files --jq '.files[].path'
```

4. **Diff** — get the full diff:

```bash
gh pr diff <number>
```

5. **Existing reviews** — see what's already been flagged so you don't duplicate:

```bash
gh api "repos/$(gh repo view --json nameWithOwner --jq '.nameWithOwner')/pulls/<number>/comments" --jq '.[] | "\(.path):\(.line // .original_line): \(.body)"'
```

## Step 3: Categorize the Changes

Scan the repository's top-level directory structure and group changed files by area to guide how deeply to review each.

Discover the project structure:

```bash
ls -d */ 2>/dev/null
```

Read any project-specific conventions from context files. Check for these files in order of precedence:

```bash
ls AGENTS.md CONTEXT.md CLAUDE.md .github/CONTEXT.md docs/CONTEXT.md 2>/dev/null
```

If a context file exists, read it to identify:
- Area descriptions and conventions
- Repository-specific rules (e.g., "never edit generated files", "always use X pattern")
- Naming and code style conventions that affect correctness

Construct an area categorization based on what you find. For example:

| Area | Paths | Review focus |
|------|-------|--------------|
| Source code | `src/**`, `lib/**`, `app/**` | Core logic, error handling, invariants |
| Tests | `tests/**`, `test/**`, `spec/**` | Test isolation, assertions, coverage gaps |
| Build/Config | `*.props`, `*.targets`, `Makefile`, `Dockerfile`, CI configs | Unintended side effects, breaking conditional logic |
| Docs | `docs/**`, `*.md` | Accuracy of documented behavior vs. actual changes |
| Config/Data | `*.json`, `*.yaml`, `*.toml` | Breaking config changes, missing validation |

## Step 4: Review the Code

Read the diff carefully. For each changed file, also read surrounding context from the checked-out branch to understand the impact of the change.

### What to Flag

Only flag **actual problems**. Every comment must identify a concrete issue. Categories:

1. **Bugs** — logic errors, off-by-one, null dereferences, missing awaits, race conditions, incorrect resource disposal.
2. **Security** — injection risks, credential exposure, insecure defaults, OWASP Top 10 violations.
3. **Correctness** — wrong behavior relative to the PR description or existing contracts, breaking changes to public API without justification.
4. **Behavioral contract changes** — when a type/class is replaced, removed, or refactored, check whether any behavioral contracts were silently changed. Examples: a property that previously threw on invalid access now returns a default value; an override that enforced an invariant is gone; a method that validated input no longer does.
5. **Weakened invariants** — check whether validation was relaxed during refactoring. Examples: `SingleOrDefault` (throws on duplicates) replaced by `FirstOrDefault` (silently picks first); `Debug.Assert` guarding a release-relevant invariant that should be an `if` + `throw`; precondition checks that were removed.
6. **Missing error handling at system boundaries** — unvalidated external input, missing null checks at public API entry points. Do NOT flag missing null checks for parameters the type system already guarantees non-null.
7. **Performance regressions** — unnecessary allocations in hot paths, N+1 queries, blocking async calls (`Task.Result`, `.Wait()`).
8. **Concurrency issues** — thread-unsafe collections in concurrent code, missing synchronization, deadlock risks.
9. **Temporal coupling and initialization safety** — fields initialized to `null!` with a separate `Initialize()` method that must be called before use; DI registrations that depend on call ordering; any pattern where forgetting a call causes a runtime NRE with no compile-time safety.
10. **Resource leaks** — `IDisposable` objects (e.g., `CancellationTokenSource`, `SemaphoreSlim`) that are created but never disposed, even if the pattern was moved from elsewhere.
11. **Dead code and stale comments** — comments describing behavior the code no longer implements; unused variables; `ToList()` calls with comments like "materialize to check count" where the count is never checked.
12. **Repository convention violations** — violations of rules documented in the project's `AGENTS.md`, `CONTEXT.md`, or similar context files. Read these files and flag any concrete violations. Do not invent conventions the project hasn't documented.
13. **Code comment problems** — apply the project's code comment guidance from its context files. Flag only concrete issues: comments that contradict the code, workaround comments without a tracking link, or comments describing behavior that no longer applies. Do not flag subjective missing comments or ask for comments on obvious code.

### What NOT to Flag

- Style preferences already handled by `.editorconfig`, formatters, or linters
- Missing doc comments (unless the project's conventions explicitly require them)
- Suggestions for refactoring unrelated code
- Speculative concerns you cannot support with specific evidence in the diff

### Reviewing refactored / moved code

When code is moved from one file to another (e.g., extracting a class), treat the moved code as if it were newly written. Specifically:

- **Flag pre-existing issues in moved code.** If buggy or unsafe code is copy-pasted into a new file, flag it. The refactoring is an opportunity to fix it. Mark these as "Pre-existing issue, good opportunity to fix during this refactoring."
- **Diff old vs. new behavior.** When a type/class is deleted and replaced, explicitly compare the old and new implementations. Look for: removed overrides, changed exception behavior, relaxed validation, lost invariant checks.
- **Check callers of removed types.** If `OldClass` is removed and replaced by `NewClass`, verify that all call sites that depended on `OldClass`-specific behavior still work correctly.

## Step 5: Present Findings to the User

**Do not post a review automatically.** Instead, present all findings as a numbered list for the user to triage. Order by potential impact.

Then ask the user what to do next. The user may respond with:

- **"Add 1, 3, 5 as comments"** — post only those numbered items as review comments.
- **"Add all"** — post every item.
- **"Add none"** — skip posting entirely.
- Any other selection or modification instructions.

## Step 6: Post Selected Comments as a Review

Once the user has selected which findings to include:

### Posting the review

All `gh api` commands below must use the bot token so comments appear under the bot account, not the repository owner:

```bash
TOKEN=$(cat ~/.config/gh/review-bot-token)
```

Prefix every `gh api` call with `GH_TOKEN="$TOKEN"`.

1. **Resolve repository and commit variables:**

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
COMMIT=$(gh pr view <number> --json headRefOid --jq '.headRefOid')
```

2. **Post each selected finding as a standalone inline comment:**

```bash
GH_TOKEN="$TOKEN" gh api "repos/$REPO/pulls/<number>/comments" \
  -F commit_id="$COMMIT" \
  -F body="Concise description of the problem and how to fix it" \
  -F path="relative/file/path" \
  -F line=42 \
  -F side="RIGHT"
```

   - `path`: relative file path
   - `line`: the line number in the file (new version)
   - `side`: `RIGHT` for comments on new code
   - `body`: concise description of the problem and how to fix it

   Note: GitHub's REST API does not support pending review drafts — each
   comment is posted immediately. This is the correct approach; comments
   appear inline on the PR as they are posted.

3. **Submit a summary review:**

```bash
GH_TOKEN="$TOKEN" gh api "repos/$REPO/pulls/<number>/reviews" \
  -F commit_id="$COMMIT" \
  -F event="COMMENT" \
  -F body="Summary of findings by category"
```

   - Always use `event: "COMMENT"`. This skill only leaves review feedback — it does not approve or request changes.
   - Include a summary body listing the number of issues found by category.
   - If the user chose to add none: do not post any comments or review. Confirm to the user that no review was posted.

## Review Quality Rules

- **Flag only concrete, high-confidence problems.** Report definite issues such as bugs, security problems, correctness errors, performance regressions, missing error handling at system boundaries, or repository-convention violations. Do not raise speculative concerns, design feedback, or issues you cannot support with specific evidence in the diff.
- **One problem per comment.** Don't bundle multiple issues into a single comment.
- **Be specific.** Reference the exact line(s), variable(s), or condition(s) that are problematic.
- **Provide fix direction.** If the fix isn't obvious, include a brief suggestion or code snippet.
- **Don't repeat existing review comments.** Check existing review threads before posting.
