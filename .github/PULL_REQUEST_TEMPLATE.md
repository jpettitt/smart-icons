<!--
PR template — see AGENTS.md for the full contribution guide.

Do not remove sections. Mark sections "n/a" with a one-line reason
when they truly don't apply (e.g. "n/a — docs-only"). Reviewers use
this template to track what was tested and what's at risk; removing
parts of it makes review harder.
-->

## Summary

<!--
1–3 bullets on what changed and why. Focus on the *why*; the diff
shows the *what*. Link to an issue or design discussion if one
motivated the change.
-->

-

## Test plan

<!--
What you ran locally before requesting review. For code changes,
all four boxes must be checked. For docs-only PRs, write "n/a —
docs only" below the checklist and leave the boxes unticked.
-->

- [ ] `.venv/bin/pytest -q` — backend tests pass
- [ ] `cd frontend && npm run typecheck` — zero TypeScript errors
- [ ] `cd frontend && npm test` — frontend tests pass
- [ ] `cd frontend && npm run build` — committed bundles match a fresh build (no diff under `custom_components/smart_icons/static/`)

**Manual / UI verification:**

<!--
For UI changes: how you exercised the change in HA. Which dashboard
surface? Which cards? Mobile app? If you couldn't test a surface,
say so explicitly so a reviewer can pick it up.
-->

## Risk

<!--
Anything a reviewer should think hardest about. Schema changes,
storage migrations, cross-surface paint behavior, anything that
could regress an existing install on upgrade. "Low — internal
refactor with full test coverage" is a valid answer when true.
-->

## Docs touched

<!--
Tick the docs you updated in this PR, or write "n/a — internal
change" if no user-visible behavior or future plans changed.
-->

- [ ] `README.md`
- [ ] `CHANGELOG.md`
- [ ] `TODO.md`
- [ ] `DESIGN.md`
- [ ] `docs/examples.md`
- [ ] n/a — internal change
