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
