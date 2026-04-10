import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

// ── Keys ──────────────────────────────────────────────────────────────────────
export const todoKeys = {
  all:   ["todos"],
  lists: () => [...todoKeys.all, "list"],
  list:  (filters) => [...todoKeys.lists(), filters],
};

// ── useTodos(filters) ─────────────────────────────────────────────────────────
export function useTodos(filters = {}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
      if (filters.case_file_id) params.set("case_file", filters.case_file_id);
      if (filters.search) params.set("search", filters.search);
      const { data } = await api.get(`/v1/todos/?${params}`);
      return data;
    },
  });

  return {
    todos: data?.results ?? data ?? [],
    totalCount: data?.count ?? data?.length ?? 0,
    isLoading,
    isError,
  };
}

// ── useCreateTodo ─────────────────────────────────────────────────────────────
export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/todos/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

// ── useUpdateTodo ─────────────────────────────────────────────────────────────
export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/v1/todos/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

// ── useDeleteTodo ─────────────────────────────────────────────────────────────
export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/v1/todos/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}
