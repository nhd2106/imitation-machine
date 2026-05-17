# Debugging Checklist

- Reproduce the failure with a concrete command or prompt.
- Minimize the reproduction until only the necessary trigger remains.
- Record expected behavior and actual behavior.
- State one active hypothesis.
- Add instrumentation only when it produces evidence for that hypothesis.
- Run the smallest check that can confirm or kill a hypothesis.
- Change one variable at a time.
- Log the result before moving to the next hypothesis.
- Stop once evidence isolates the root cause.
- Before claiming fixed, rerun the original symptom and capture regression proof.
