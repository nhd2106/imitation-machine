# Debugging Checklist

- Start feedback-loop-first: build a concrete command, test, prompt, script, replay, or harness that reaches the reported failure.
- Confirm the loop gives a deterministic pass/fail signal for the real symptom, not a nearby failure.
- For intermittent failures, repeat or stress the trigger until you improve the flaky repro rate enough to debug.
- Minimize the reproduction until only the necessary trigger remains.
- Record expected behavior, actual behavior, and the exact original symptom.
- Rank 3-5 falsifiable hypotheses before testing one; each hypothesis states the prediction that would confirm or kill it.
- Add a prediction-based probe only when it produces evidence for the active hypothesis.
- Change one variable at a time.
- Run the smallest check that can confirm or kill a hypothesis.
- Log the result before moving to the next hypothesis.
- Choose a regression seam that exercises the real bug pattern before fixing; document if no valid seam exists.
- Stop once evidence isolates the root cause.
- Remove temporary instrumentation before claiming done.
- Before claiming fixed, rerun the original symptom and capture regression proof with original symptom verification.
- There is no tracker-publishing shortcut: debugging evidence does not publish tracker updates without a separate approved workflow.
