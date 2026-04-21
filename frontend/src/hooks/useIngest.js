import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

// ── Fetch platforms for the dropdown ────────────────────────────────────────
export function usePlatforms(category) {
  return useQuery({
    queryKey: ["platforms", category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : "";
      const { data } = await api.get(`/v1/briefs/platforms/${params}`);
      return data;
    },
  });
}

// ── Fetch platform knowledge records ───────────────────────────────────────
export function usePlatformKnowledge(filters = {}) {
  const params = new URLSearchParams();
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.category) params.set("category", filters.category);
  if (filters.knowledge_type) params.set("knowledge_type", filters.knowledge_type);
  const qs = params.toString();
  return useQuery({
    queryKey: ["platformKnowledge", filters],
    queryFn: async () => {
      const { data } = await api.get(`/v1/briefs/knowledge/${qs ? `?${qs}` : ""}`);
      return data;
    },
  });
}

// ── Fetch community insight records ────────────────────────────────────────
export function useCommunityInsights(filters = {}) {
  const params = new URLSearchParams();
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.type) params.set("type", filters.type);
  const qs = params.toString();
  return useQuery({
    queryKey: ["communityInsights", filters],
    queryFn: async () => {
      const { data } = await api.get(`/v1/briefs/insights/${qs ? `?${qs}` : ""}`);
      return data;
    },
  });
}

// ── Fetch training case files ──────────────────────────────────────────────
export function useTrainingCaseFiles() {
  return useQuery({
    queryKey: ["trainingCaseFiles"],
    queryFn: async () => {
      const { data } = await api.get("/v1/briefs/?training_only=true");
      return data;
    },
  });
}

// ── Invalidate all ingested data caches ─────────────────────────────────────
function useIngestInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["platformKnowledge"] });
    queryClient.invalidateQueries({ queryKey: ["communityInsights"] });
    queryClient.invalidateQueries({ queryKey: ["trainingCaseFiles"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };
}

// ── Submit a URL or content for ingestion ───────────────────────────────────
export function useIngestUrl() {
  const invalidate = useIngestInvalidation();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/briefs/ingest/", payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

// ── Ingest a YouTube video transcript ───────────────────────────────────────
export function useIngestYouTube() {
  const invalidate = useIngestInvalidation();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/briefs/ingest/youtube/", payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

// ── Upload a PDF for ingestion ──────────────────────────────────────────────
export function useIngestPdf() {
  const invalidate = useIngestInvalidation();
  return useMutation({
    mutationFn: async ({ file, platform, sourceAttribution }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", platform);
      if (sourceAttribution) formData.append("source_attribution", sourceAttribution);
      const { data } = await api.post("/v1/briefs/ingest/pdf/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: invalidate,
  });
}
