---
name: design
description: Use when designing or implementing UI, pages, or components where visual direction, interaction quality, and responsive behavior must be decided before building
---

# Design

UI work needs a point of view. Do not produce a default, interchangeable layout and call it design.

## Hard Gate

Before building UI, lock the direction first. Do not jump straight into component code while the audience, visual direction, and constraints are still vague.

Direction lock is a required output, not a vibe. If the brief still sounds interchangeable with three other products, it is not locked.

## When To Use

- new pages
- visual redesigns
- component systems or dashboards
- interaction-heavy UI changes

Do not use this for backend logic or pure data-pipeline work.

## Workflow

```dot
digraph design_flow {
  "UI request" [shape=doublecircle];
  "Understand audience and context" [shape=box];
  "Lock direction with checklist" [shape=box];
  "Choose one memorable design anchor" [shape=box];
  "Define interaction quality and responsive constraints" [shape=box];
  "Check companion references" [shape=box];
  "Implement UI with handoff-ready direction" [shape=box];
  "Open in browser and validate" [shape=box];
  "Needs revision?" [shape=diamond];

  "UI request" -> "Understand audience and context";
  "Understand audience and context" -> "Lock direction with checklist";
  "Lock direction with checklist" -> "Choose one memorable design anchor";
  "Choose one memorable design anchor" -> "Define interaction quality and responsive constraints";
  "Define interaction quality and responsive constraints" -> "Check companion references";
  "Check companion references" -> "Implement UI with handoff-ready direction";
  "Implement UI with handoff-ready direction" -> "Open in browser and validate";
  "Open in browser and validate" -> "Needs revision?";
  "Needs revision?" -> "Implement UI with handoff-ready direction" [label="yes"];
}
```

## Direction Lock

Before implementation, establish:

- who uses this and in what context
- the visual direction in specific terms
- the one thing the user should remember
- hard constraints: platform, responsiveness, accessibility, performance
- the interaction quality: what should feel crisp, calm, dense, playful, or fast
- the browser validation plan: which breakpoints and states must be checked before done

"Clean and modern" is not a direction.

Use `references/design-direction-checklist.md` to force a concrete direction lock before handoff or implementation.

## Visual Guidance

- typography should carry personality, not disappear into defaults
- color should feel like a system, not random hex choices
- motion should emphasize important transitions, not decorate everything
- layout should reflect the content density and product intent

## Interaction Quality

- define what high-quality interaction means for this surface before building it
- name the primary moments that need special care: hover, focus, empty states, loading, error, success, and first-use onboarding
- choose interaction patterns that match the product tone instead of default library behavior
- if the interaction model is undecided, pause implementation and resolve it first

## Implementation Rules

- use semantic HTML
- design responsively from the start
- maintain accessible contrast and keyboard behavior
- keep the implementation complexity proportional to the design ambition
- preserve the product's existing design language if one already exists
- make the direction handoff-ready: another implementer should be able to build from the brief without guessing the taste level

Use `references/design-brief-example.md` as the target level of specificity for implementation handoff.

## Browser Validation

Open the result in a browser before claiming it is done.

If it only looks correct in code, it is not finished.

Minimum browser validation:

- check the primary layout at mobile, tablet, and desktop widths
- validate the core interaction quality in the browser, not just static screenshots
- verify that hierarchy, spacing, and motion still support the chosen direction under realistic content
- note any browser validation gaps explicitly if you could not check them

## Red Flags

Stop if the UI still feels like:

- a generic template
- a design with no clear visual anchor
- a desktop-only composition crammed onto mobile
- a set of effects with no hierarchy
- a page you have not actually viewed in the browser

## Companion Files

- `references/design-reference.md`
- `references/design-direction-checklist.md`
- `references/design-brief-example.md`
