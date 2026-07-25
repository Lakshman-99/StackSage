import { create } from "zustand";

export type RepoTab =
  | "onboarding"
  | "architecture"
  | "entry-points"
  | "files"
  | "ask"
  | "glossary"
  | "change-impact";

interface AppState {
  // Active repo tab
  activeTab: RepoTab;
  setActiveTab: (tab: RepoTab) => void;

  // Ingest modal
  isIngestOpen: boolean;
  openIngest: () => void;
  closeIngest: () => void;

  // Q&A history per repo
  qaHistory: Record<string, Array<{ question: string; answer: string; confidence: number }>>;
  addQA: (repoId: string, entry: { question: string; answer: string; confidence: number }) => void;
  clearQA: (repoId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: "onboarding",
  setActiveTab: (tab) => set({ activeTab: tab }),

  isIngestOpen: false,
  openIngest: () => set({ isIngestOpen: true }),
  closeIngest: () => set({ isIngestOpen: false }),

  qaHistory: {},
  addQA: (repoId, entry) =>
    set((state) => ({
      qaHistory: {
        ...state.qaHistory,
        [repoId]: [...(state.qaHistory[repoId] || []), entry],
      },
    })),
  clearQA: (repoId) =>
    set((state) => ({
      qaHistory: { ...state.qaHistory, [repoId]: [] },
    })),
}));