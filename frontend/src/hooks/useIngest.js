import { useQuery, useMutation } from "@tanstack/react-query";
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

// ── Submit a URL for ingestion ──────────────────────────────────────────────
export function useIngestUrl() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/briefs/ingest/", payload);
      return data;
    },
  });
}
