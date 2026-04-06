import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

export const briefKeys = {
  all: ["generatedBriefs"],
  lists: () => [...briefKeys.all, "list"],
  detail: (id) => [...briefKeys.all, "detail", id],
};

export function useGenerateBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rawPrompt) => {
      const { data } = await api.post("/v1/workflows/generate/", {
        raw_prompt: rawPrompt,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: briefKeys.lists() });
    },
  });
}

export function useGeneratedBriefs() {
  return useQuery({
    queryKey: briefKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get("/v1/workflows/briefs/");
      return data;
    },
  });
}

export function useGeneratedBrief(id) {
  return useQuery({
    queryKey: briefKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/v1/workflows/briefs/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useBriefByCaseFile(caseFileId) {
  return useQuery({
    queryKey: [...briefKeys.all, "byCaseFile", caseFileId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/workflows/briefs/?case_file_id=${caseFileId}`);
      return data[0] || null;
    },
    enabled: !!caseFileId,
  });
}

export function useMarkBriefConverted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ briefId, caseFileId }) => {
      const { data } = await api.patch(`/v1/workflows/briefs/${briefId}/convert/`, {
        case_file_id: caseFileId,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(briefKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: briefKeys.lists() });
    },
  });
}

export function useBriefFeedback(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.patch(
        `/v1/workflows/briefs/${id}/feedback/`,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(briefKeys.detail(id), data);
    },
  });
}
