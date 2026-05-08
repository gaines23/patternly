import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get("/v1/users/me/");
      return data;
    },
    retry: false,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.patch("/v1/users/me/", payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/users/me/password/", payload);
      return data;
    },
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: async ({ email = "" } = {}) => {
      const { data } = await api.post("/v1/users/invites/", { email });
      return data;
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await api.get("/v1/users/audit-log/");
      return data;
    },
  });
}

export function useSignOutAll() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/v1/users/me/sign-out-all/");
      return data;
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await api.get("/v1/users/members/");
      return data;
    },
  });
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/v1/users/members/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
  });
}

export function useMyTeam() {
  return useQuery({
    queryKey: ["my-team"],
    queryFn: async () => {
      const { data } = await api.get("/v1/users/me/team/");
      return data;
    },
  });
}

export function useMyTeams() {
  return useQuery({
    queryKey: ["my-teams"],
    queryFn: async () => {
      const { data } = await api.get("/v1/users/me/teams/");
      return data;
    },
  });
}

export function useSwitchTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamId) => {
      const { data } = await api.post("/v1/users/me/active-team/", { team_id: teamId });
      return data;
    },
    onSuccess: (data) => {
      // The user's active_team has changed, so every team-scoped cache
      // (briefs, library, todos, members) is now stale. Reset everything
      // and let components refetch under the new team.
      queryClient.setQueryData(["me"], data);
      queryClient.invalidateQueries();
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token) => {
      const { data } = await api.post("/v1/users/me/invites/accept/", { token });
      return data;
    },
    onSuccess: (data) => {
      if (data?.user) {
        queryClient.setQueryData(["me"], data.user);
      }
      queryClient.invalidateQueries();
    },
  });
}

export function useUpdateMyTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      // If payload contains a File (e.g. logo upload), send as multipart.
      const hasFile = payload && Object.values(payload).some((v) => v instanceof File);
      if (hasFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          if (typeof value === "boolean") fd.append(key, value ? "true" : "false");
          else fd.append(key, value);
        });
        const { data } = await api.patch("/v1/users/me/team/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
      }
      const { data } = await api.patch("/v1/users/me/team/", payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["my-team"], data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
