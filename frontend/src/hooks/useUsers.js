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
