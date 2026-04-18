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

// ── Submit a URL or content for ingestion ───────────────────────────────────
export function useIngestUrl() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/briefs/ingest/", payload);
      return data;
    },
  });
}

// ── Ingest a YouTube video transcript ───────────────────────────────────────
export function useIngestYouTube() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/briefs/ingest/youtube/", payload);
      return data;
    },
  });
}

// ── Upload a PDF for ingestion ──────────────────────────────────────────────
export function useIngestPdf() {
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
  });
}
