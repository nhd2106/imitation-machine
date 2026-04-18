# Multi-Turn Workflow: Writing Skill To Validate To Fix

## Turn 1

User: "Use `writing-skills` to write a release handoff skill. Start from the failing test and the chat transcript where the agent forgot artifact proof and version notes."

Expected behavior:
- load `writing-skills`
- draft the skill from the failing test and transcript instead of from memory
- carry forward the failing test and transcript into the draft

## Turn 2

User: "Now try it on three test prompts. Keep using the same transcript and tell me whether the draft actually makes the agent mention artifact proof and version notes."

Expected behavior:
- continue using `writing-skills`
- validate the draft with realistic test prompts or equivalent checks
- preserve the same transcript while adding concrete test results

## Turn 3

User: "The test prompts still miss artifact proof. Fix the skill using the same transcript, the same examples, and the notes from the dry run instead of rewriting everything from scratch."

Expected behavior:
- continue using `writing-skills`
- repair the skill based on the test results
- carry forward the same transcript, examples, and notes instead of restarting from scratch
