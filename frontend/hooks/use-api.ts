import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  RepoIngestRequest,
  QuestionRequest,
  ChangeImpactRequest,
} from "@/types";

// ============================================================
// Query Keys
// ============================================================

export const queryKeys = {
  repos: ["repos"] as const,
  repoStatus: (id: string) => ["repo", id, "status"] as const,
  architecture: (id: string) => ["repo", id, "architecture"] as const,
  entryPoints: (id: string) => ["repo", id, "entry-points"] as const,
  glossary: (id: string) => ["repo", id, "glossary"] as const,
};

// ============================================================
// Repository Hooks
// ============================================================

export function useRepos() {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: api.listRepos,
    refetchInterval: 10000,
  });
}

export function useRepoStatus(repoId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.repoStatus(repoId),
    queryFn: () => api.getRepoStatus(repoId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "failed") return false;
      return 3000;
    },
  });
}

export function useIngestRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RepoIngestRequest) => api.ingestRepo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repos });
    },
  });
}

export function useDeleteRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repoId: string) => api.deleteRepo(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repos });
    },
  });
}

// ============================================================
// Analysis Hooks
// ============================================================

export function useArchitecture(repoId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.architecture(repoId),
    queryFn: () => api.getArchitecture(repoId),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useRegenerateArchitecture(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.regenerateArchitecture(repoId),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.architecture(repoId), data),
  });
}

export function useEntryPoints(repoId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.entryPoints(repoId),
    queryFn: () => api.getEntryPoints(repoId),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useRegenerateEntryPoints(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.regenerateEntryPoints(repoId),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.entryPoints(repoId), data),
  });
}

export function useGlossary(repoId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.glossary(repoId),
    queryFn: () => api.getGlossary(repoId),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useRegenerateGlossary(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.regenerateGlossary(repoId),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.glossary(repoId), data),
  });
}

// ============================================================
// On-Demand Mutation Hooks
// ============================================================

export function useAskQuestion(repoId: string) {
  return useMutation({
    mutationFn: (data: QuestionRequest) => api.askQuestion(repoId, data),
  });
}

export function useChangeImpact(repoId: string) {
  return useMutation({
    mutationFn: (data: ChangeImpactRequest) =>
      api.analyzeChangeImpact(repoId, data),
  });
}

// ============================================================
// Onboarding
// ============================================================

export function useOnboarding(repoId: string, enabled = true) {
  return useQuery({
    queryKey: ["repo", repoId, "onboarding"] as const,
    queryFn: () => api.getOnboarding(repoId),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useRegenerateOnboarding(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.regenerateOnboarding(repoId),
    onSuccess: (data) => queryClient.setQueryData(["repo", repoId, "onboarding"], data),
  });
}

// ============================================================
// File Explorer
// ============================================================

export function useFileTree(repoId: string, enabled = true) {
  return useQuery({
    queryKey: ["repo", repoId, "files"] as const,
    queryFn: () => api.getFileTree(repoId),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useFileContent(repoId: string, filePath: string, enabled = true) {
  return useQuery({
    queryKey: ["repo", repoId, "file", filePath] as const,
    queryFn: () => api.getFileContent(repoId, filePath),
    enabled: enabled && !!filePath,
    staleTime: 10 * 60 * 1000,
  });
}