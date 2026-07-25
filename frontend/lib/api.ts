import type {
  RepoIngestRequest,
  RepoIngestResponse,
  AnalysisStatusResponse,
  RepoListItem,
  ArchitectureResponse,
  EntryPointsResponse,
  QuestionRequest,
  QuestionResponse,
  GlossaryResponse,
  ChangeImpactRequest,
  ChangeImpactResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || res.statusText, res.status);
  }

  return res.json();
}

// ============================================================
// Repository
// ============================================================

export const api = {
  // Ingest a new repository
  ingestRepo: (data: RepoIngestRequest) =>
    request<RepoIngestResponse>("/repos/ingest", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get analysis status
  getRepoStatus: (repoId: string) =>
    request<AnalysisStatusResponse>(`/repos/${repoId}/status`),

  // List all repositories
  listRepos: () =>
    request<{ repositories: RepoListItem[] }>("/repos").then((r) => r.repositories),

  // Delete a repository
  deleteRepo: (repoId: string) =>
    request<{ message: string }>(`/repos/${repoId}`, { method: "DELETE" }),

  // ============================================================
  // Analysis Results
  // ============================================================

  getArchitecture: (repoId: string) =>
    request<ArchitectureResponse>(`/repos/${repoId}/architecture`),

  getEntryPoints: (repoId: string) =>
    request<EntryPointsResponse>(`/repos/${repoId}/entry-points`),

  getGlossary: (repoId: string) =>
    request<GlossaryResponse>(`/repos/${repoId}/glossary`),

  // ============================================================
  // On-Demand Agents
  // ============================================================

  askQuestion: (repoId: string, data: QuestionRequest) =>
    request<QuestionResponse>(`/repos/${repoId}/ask`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  analyzeChangeImpact: (repoId: string, data: ChangeImpactRequest) =>
    request<ChangeImpactResponse>(`/repos/${repoId}/change-impact`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ============================================================
  // Onboarding
  // ============================================================

  getOnboarding: (repoId: string) =>
    request<any>(`/repos/${repoId}/onboarding`),

  // ============================================================
  // File Explorer
  // ============================================================

  getFileTree: (repoId: string) =>
    request<{ repo_id: string; file_count: number; tree: any[] }>(`/repos/${repoId}/files`),

  getFileContent: (repoId: string, filePath: string) =>
    request<{ path: string; content: string; language: string; line_count: number }>(
      `/repos/${repoId}/files/content?path=${encodeURIComponent(filePath)}`
    ),

  searchFiles: (repoId: string, query: string) =>
    request<{ query: string; results: Array<{ path: string; language: string; line_count: number }> }>(
      `/repos/${repoId}/files/search?q=${encodeURIComponent(query)}`
    ),
};