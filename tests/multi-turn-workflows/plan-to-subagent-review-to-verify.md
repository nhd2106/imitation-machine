# Multi-Turn Workflow: Plan To Subagent Review To Verify

## Turn 1

User: "Start with `plan`. Break this approved fixture wave into executable work as plan ID `PLN-903`. Use task ID `TSK-410` for the workflow fixture. Keep the verification evidence concrete in the plan instead of generic."

Expected behavior:
- load `plan`
- produce approved plan ID `PLN-903`
- preserve task ID `TSK-410` as the single task chain carried through the workflow
- record concrete verification evidence for each task rather than generic placeholders

## Turn 2

User: "`PLN-903` is approved. Execute `TSK-410` with `subagent-driven-development` and keep the plan ID and task ID visible while the fresh worker moves through `review-spec` and `review-quality`."

Expected behavior:
- hand off from `plan` to `subagent-driven-development`
- carry forward plan ID `PLN-903` and task ID `TSK-410`
- require the ordered review chain `subagent-driven-development -> review-spec -> review-quality`
- keep fresh-worker execution and review gates explicit instead of collapsing them into a generic implementation update

## Turn 3

User: "The implementation for `TSK-410` is done. Run `review-spec` first, record the review outcome, and keep the stage explicit before anything moves ahead."

Expected behavior:
- run `review-spec` before `review-quality`
- keep task ID `TSK-410` attached to the review outcome
- record the concrete review outcome `spec passed`
- do not skip forward to quality review before spec is resolved

## Turn 4

User: "Spec passed for `TSK-410`. Continue to `review-quality`, keep the review outcome explicit, and only mark it ready for verify if quality passed."

Expected behavior:
- hand off from `review-spec` to `review-quality`
- preserve task ID `TSK-410` and the spec-passed review outcome
- record the quality review outcome explicitly, including quality passed when it is ready for verify
- keep the staged progression visible rather than replacing it with a generic done message

## Turn 5

User: "Quality passed for `TSK-410`. Use `verify`, carry forward `PLN-903`, `TSK-410`, plus the earlier `review-spec` outcome `spec passed` and the `review-quality` outcome `quality passed`, then report fresh verification evidence from `agentic verify all` before anyone says done."

Expected behavior:
- hand off from `review-quality` to `verify`
- carry forward plan ID `PLN-903`, task ID `TSK-410`, and the prior review outcome history including `spec passed` and `quality passed`
- require fresh verification evidence from `agentic verify all`
- report concrete verification evidence before completion instead of a confidence-only summary
