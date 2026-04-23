import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

// ── Keys ──────────────────────────────────────────────────────────────────────
export const projectKeys = {
  all:      ["projects"],
  lists:    () => [...projectKeys.all, "list"],
  list:     (filters) => [...projectKeys.lists(), filters],
  details:  () => [...projectKeys.all, "detail"],
  detail:   (id) => [...projectKeys.details(), id],
  stats:    () => [...projectKeys.all, "stats"],
  warnings: (tools) => [...projectKeys.all, "warnings", tools],
  summary:  (id, dates) => [...projectKeys.all, "summary", id, dates],
};

// ── Fetch all projects (paginated, filterable) ────────────────────────────────
export function useProjects(filters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.industry)         params.set("industry",         filters.industry);
      if (filters.tool)             params.set("tool",             filters.tool);
      if (filters.workflow_type)    params.set("workflow_type",    filters.workflow_type);
      if (filters.min_satisfaction) params.set("min_satisfaction", filters.min_satisfaction);
      if (filters.search)           params.set("search",           filters.search);
      if (filters.status)           params.set("status",           filters.status);
      if (filters.page)             params.set("page",             filters.page);
      const { data } = await api.get(`/v1/briefs/?${params}`);
      return data;
    },
  });
}

// ── Fetch single project ──────────────────────────────────────────────────────
export function useProject(id) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/v1/briefs/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

// ── Create project ────────────────────────────────────────────────────────────
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/briefs/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.stats() });
    },
  });
}

// ── Update project ────────────────────────────────────────────────────────────
export function useUpdateProject(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put(`/v1/briefs/${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ── Delete project ────────────────────────────────────────────────────────────
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/v1/briefs/${id}/`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ── Toggle project status (open ↔ closed) ────────────────────────────────────
export function useToggleProjectStatus(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/v1/briefs/${id}/status/`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(id), (old) =>
        old ? { ...old, status: data.status, closed_at: data.closed_at } : old
      );
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ── Toggle shareable link ─────────────────────────────────────────────────────
// Accepts the project id as a fallback when `mutate()` is invoked without one,
// so existing callers (`useShareProject(id)` + `mutate()`) keep working while
// new callers can pass the id directly at click time (`mutate(id)`).
export function useShareProject(fallbackId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const resolvedId = id ?? fallbackId;
      if (!resolvedId) throw new Error("useShareProject: missing project id");
      const { data } = await api.post(`/v1/briefs/${resolvedId}/share/`);
      return { id: resolvedId, ...data };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(data.id), (old) =>
        old ? { ...old, share_enabled: data.share_enabled, share_token: data.share_token } : old
      );
    },
  });
}

// ── Toggle client share link ──────────────────────────────────────────────
export function useClientShareProject(fallbackId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const resolvedId = id ?? fallbackId;
      if (!resolvedId) throw new Error("useClientShareProject: missing project id");
      const { data } = await api.post(`/v1/briefs/${resolvedId}/client-share/`);
      return { id: resolvedId, ...data };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(data.id), (old) =>
        old ? { ...old, client_share_enabled: data.client_share_enabled, client_share_token: data.client_share_token } : old
      );
    },
  });
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export function useProjectStats() {
  return useQuery({
    queryKey: projectKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get("/v1/briefs/stats/");
      return data;
    },
  });
}

// ── Project summary (AI-generated) ───────────────────────────────────────────
export function useProjectSummary(id, { summaryType = "full", startDate, endDate, enabled = false } = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: projectKeys.summary(id, { summaryType, startDate, endDate }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("type", summaryType);
      if (startDate) params.set("start_date", startDate);
      if (endDate)   params.set("end_date", endDate);
      const { data } = await api.get(`/v1/briefs/${id}/summary/?${params}`);
      // Refresh project detail cache so saved summary fields stay in sync
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      return data;
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
}

// ── Proactive roadblock warnings ──────────────────────────────────────────────
export function useRoadblockWarnings(tools = []) {
  return useQuery({
    queryKey: projectKeys.warnings(tools),
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
