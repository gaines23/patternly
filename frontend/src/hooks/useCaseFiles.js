import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

// ── Keys ──────────────────────────────────────────────────────────────────────
export const caseFileKeys = {
  all: ["caseFiles"],
  lists: () => [...caseFileKeys.all, "list"],
  list: (filters) => [...caseFileKeys.lists(), filters],
  details: () => [...caseFileKeys.all, "detail"],
  detail: (id) => [...caseFileKeys.details(), id],
  stats: () => [...caseFileKeys.all, "stats"],
  warnings: (tools) => [...caseFileKeys.all, "warnings", tools],
};

// ── Fetch all case files (paginated, filterable) ──────────────────────────────
export function useCaseFiles(filters = {}) {
  return useQuery({
    queryKey: caseFileKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.industry) params.set("industry", filters.industry);
      if (filters.tool) params.set("tool", filters.tool);
      if (filters.workflow_type) params.set("workflow_type", filters.workflow_type);
      if (filters.min_satisfaction) params.set("min_satisfaction", filters.min_satisfaction);
      if (filters.search) params.set("search", filters.search);
      if (filters.page) params.set("page", filters.page);
      const { data } = await api.get(`/v1/briefs/?${params}`);
      return data;
    },
  });
}

// ── Fetch single case file ────────────────────────────────────────────────────
export function useCaseFile(id) {
  return useQuery({
    queryKey: caseFileKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/v1/briefs/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

// ── Create case file ──────────────────────────────────────────────────────────
export function useCreateCaseFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/briefs/", payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate the list so it refetches
      queryClient.invalidateQueries({ queryKey: caseFileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caseFileKeys.stats() });
    },
  });
}

// ── Update case file ──────────────────────────────────────────────────────────
export function useUpdateCaseFile(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put(`/v1/briefs/${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(caseFileKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: caseFileKeys.lists() });
    },
  });
}

// ── Delete case file ──────────────────────────────────────────────────────────
export function useDeleteCaseFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/v1/briefs/${id}/`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: caseFileKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: caseFileKeys.lists() });
    },
  });
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export function useCaseFileStats() {
  return useQuery({
    queryKey: caseFileKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get("/v1/briefs/stats/");
      return data;
    },
  });
}

// ── Proactive roadblock warnings ──────────────────────────────────────────────
export function useRoadblockWarnings(tools = []) {
  return useQuery({
    queryKey: caseFileKeys.warnings(tools),
    queryFn: async () => {
      if (!tools.length) return { warnings: [] };
      const { data } = await api.get(
        `/v1/briefs/roadblocks/warnings/?tools=${tools.join(",")}`
      );
      return data;
    },
    enabled: tools.length > 0,
  });
}
