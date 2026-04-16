export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
};

export type TodoState = {
  nextId: number;
  items: TodoItem[];
};

export function createInitialTodoState(): TodoState {
  return {
    nextId: 1,
    items: [],
  };
}

export function addTodo(state: TodoState, text: string): TodoState {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return state;
  }

  return {
    nextId: state.nextId + 1,
    items: [
      ...state.items,
      {
        id: String(state.nextId),
        text: trimmed,
        done: false,
      },
    ],
  };
}

export function toggleTodo(state: TodoState, id: string): TodoState {
  return {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      return {
        ...item,
        done: !item.done,
      };
    }),
  };
}

export function removeTodo(state: TodoState, id: string): TodoState {
  return {
    ...state,
    items: state.items.filter((item) => item.id !== id),
  };
}

export function clearCompletedTodos(state: TodoState): TodoState {
  return {
    ...state,
    items: state.items.filter((item) => !item.done),
  };
}
