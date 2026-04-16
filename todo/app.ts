import {
  addTodo,
  clearCompletedTodos,
  createInitialTodoState,
  removeTodo,
  toggleTodo,
  type TodoState,
} from "./state";

const form = document.querySelector<HTMLFormElement>("#todo-form");
const input = document.querySelector<HTMLInputElement>("#todo-input");
const list = document.querySelector<HTMLUListElement>("#todo-list");
const remainingCount = document.querySelector<HTMLSpanElement>("#remaining-count");
const clearCompletedButton = document.querySelector<HTMLButtonElement>("#clear-completed");

if (!form || !input || !list || !remainingCount || !clearCompletedButton) {
  throw new Error("TODO app failed to initialize");
}

const todoForm = form;
const todoInput = input;
const todoList = list;
const todoRemainingCount = remainingCount;
const todoClearCompletedButton = clearCompletedButton;

let state: TodoState = createInitialTodoState();

function render(current: TodoState): void {
  todoList.innerHTML = "";

  for (const item of current.items) {
    const row = document.createElement("li");
    row.className = "todo-item";

    const label = document.createElement("label");
    label.className = "todo-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.addEventListener("change", () => {
      state = toggleTodo(state, item.id);
      render(state);
    });

    const text = document.createElement("span");
    text.textContent = item.text;
    if (item.done) {
      text.className = "done";
    }

    label.append(checkbox, text);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Delete";
    removeButton.addEventListener("click", () => {
      state = removeTodo(state, item.id);
      render(state);
    });

    row.append(label, removeButton);
    todoList.append(row);
  }

  const remaining = current.items.filter((item) => !item.done).length;
  todoRemainingCount.textContent = `${remaining} item${remaining === 1 ? "" : "s"} left`;
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state = addTodo(state, todoInput.value);
  todoInput.value = "";
  todoInput.focus();
  render(state);
});

todoClearCompletedButton.addEventListener("click", () => {
  state = clearCompletedTodos(state);
  render(state);
});

render(state);
