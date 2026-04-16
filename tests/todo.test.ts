import { describe, expect, test } from "bun:test";
import {
  addTodo,
  clearCompletedTodos,
  createInitialTodoState,
  removeTodo,
  toggleTodo,
} from "../todo/state";

describe("todo state", () => {
  test("adds a todo item", () => {
    const state = createInitialTodoState();
    const next = addTodo(state, "Write tests");

    expect(next.items.length).toBe(1);
    expect(next.items[0]?.id).toBe("1");
    expect(next.items[0]?.text).toBe("Write tests");
    expect(next.items[0]?.done).toBe(false);
  });

  test("toggles an existing todo item", () => {
    const state = addTodo(createInitialTodoState(), "Ship tiny app");
    const toggled = toggleTodo(state, "1");

    expect(toggled.items[0]?.done).toBe(true);
  });

  test("removes an existing todo item", () => {
    const state = addTodo(createInitialTodoState(), "Remove me");
    const next = removeTodo(state, "1");

    expect(next.items.length).toBe(0);
  });

  test("clears only completed todo items", () => {
    const withTwo = addTodo(
      addTodo(createInitialTodoState(), "done item"),
      "keep item",
    );
    const withOneDone = toggleTodo(withTwo, "1");

    const next = clearCompletedTodos(withOneDone);

    expect(next.items.length).toBe(1);
    expect(next.items[0]?.id).toBe("2");
    expect(next.items[0]?.text).toBe("keep item");
    expect(next.items[0]?.done).toBe(false);
  });
});
