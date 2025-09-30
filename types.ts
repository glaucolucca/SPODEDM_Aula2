export type uuid = string;

export type TodoItem = { id: uuid; text: string; status: "Pendente" | "Concluído"; createdAt: string };