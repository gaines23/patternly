import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

const integrationKeys = {
  clickup: (caseFileId) => ["integration", "clickup", caseFileId],
};

export function useClickUpIntegration(caseFileId) {
  return useQuery({
    queryKey: integrationKeys.clickup(caseFileId),
    queryFn: async () => {
      const { data } = await api.get(`/v1/integrations/clickup/${caseFileId}/status/`);
      return data;
    },
    enabled: !!caseFileId,
  });
}

export function useConnectClickUp(caseFileId) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get(`/v1/integrations/clickup/${caseFileId}/connect/`);
      return data;
    },
    onSuccess: ({ authorize_url }) => {
      if (authorize_url) {
        window.location.assign(authorize_url);
      }
    },
  });
}

export function useDisconnectClickUp(caseFileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/v1/integrations/clickup/${caseFileId}/disconnect/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.clickup(caseFileId) });
    },
  });
}

// Validate a personal API token. Returns the workspaces it can access.
// No persistence — purely a side-effect-free check.
export function useValidateClickUpToken(caseFileId) {
  return useMutation({
    mutationFn: async (accessToken) => {
      const { data } = await api.post(
        `/v1/integrations/clickup/${caseFileId}/validate-token/`,
        { access_token: accessToken },
      );
      return data; // { workspaces: [{id, name, color}] }
    },
  });
}

// Persist a personal API token as the active connection. Pass workspace_id
// when the token has access to multiple workspaces.
export function useConnectClickUpToken(caseFileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accessToken, workspaceId }) => {
      const { data } = await api.post(
        `/v1/integrations/clickup/${caseFileId}/connect-token/`,
        {
          access_token: accessToken,
          ...(workspaceId ? { workspace_id: workspaceId } : {}),
        },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.clickup(caseFileId) });
    },
  });
}
