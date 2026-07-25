// ============================================================
// Enums
// ============================================================

export type AnalysisStatus =
  | "pending"
  | "cloning"
  | "parsing"
  | "analyzing"
  | "embedding"
  | "complete"
  | "failed";

export type FileType = "source" | "config" | "test" | "documentation" | "build" | "other";

// ============================================================
// Request Types
// ============================================================

export interface RepoIngestRequest {
  repo_url: string;
  branch?: string;
}

export interface QuestionRequest {
  repo_id: string;
  question: string;
  include_code_snippets?: boolean;
  file_path?: string;
}

export interface ChangeImpactRequest {
  repo_id: string;
  file_path: string;
  description?: string;
}

// ============================================================
// Response Types
// ============================================================

export interface RepoIngestResponse {
  repo_id: string;
  status: AnalysisStatus;
  message: string;
  file_count: number;
  languages: Record<string, number>;
}

export interface AnalysisStatusResponse {
  repo_id: string;
  status: AnalysisStatus;
  progress: number;
  current_step: string;
  steps_completed: string[];
  error: string | null;
  created_at: string;
}

export interface RepoListItem {
  repo_id: string;
  repo_url: string;
  status: AnalysisStatus;
  progress: number;
  created_at: string;
}

// ============================================================
// Architecture
// ============================================================

export interface DependencyEdge {
  source: string;
  target: string;
  import_name: string;
}

export interface ArchitectureLayer {
  name: string;
  description: string;
  files: string[];
  responsibilities: string[];
}

export interface ArchitectureResponse {
  repo_id: string;
  summary: string;
  tech_stack: string[];
  layers: ArchitectureLayer[];
  dependency_graph: DependencyEdge[];
  design_patterns: string[];
  file_count: number;
  total_lines: number;
}

// ============================================================
// Entry Points
// ============================================================

export interface EntryPointFile {
  path: string;
  score: number;
  reason: string;
  in_degree: number;
  out_degree: number;
}

export interface EntryPointsResponse {
  repo_id: string;
  entry_points: EntryPointFile[];
  graph_stats: Record<string, number>;
}

// ============================================================
// Question (RAG)
// ============================================================

export interface CodeSnippet {
  file: string;
  code: string;
  lines: string;
  symbol: string;
}

export interface QuestionResponse {
  repo_id: string;
  question: string;
  answer: string;
  relevant_files: string[];
  code_snippets: CodeSnippet[];
  confidence: number;
}

// ============================================================
// Glossary
// ============================================================

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
  source_files: string[];
  usage_count: number;
}

export interface GlossaryResponse {
  repo_id: string;
  terms: GlossaryTerm[];
  total_terms: number;
}

// ============================================================
// File Explorer
// ============================================================

export interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  language?: string;
  line_count?: number;
  file_count?: number;
  children?: FileTreeNode[];
}

export interface FileContentResponse {
  path: string;
  content: string;
  language: string;
  line_count: number;
}

export interface FileSearchResult {
  path: string;
  language: string;
  line_count: number;
}

// ============================================================
// Architecture (extended)
// ============================================================

export interface DesignPatternDetailed {
  name: string;
  where: string;
  why: string;
}

export interface ArchitectureExtended extends ArchitectureResponse {
  tech_stack_categorized: Record<string, string[]>;
  repo_type: string;
  architecture_style: string;
  data_flow: string;
  mermaid_diagram: string;
  design_patterns_detailed: DesignPatternDetailed[];
}

// ============================================================
// Onboarding
// ============================================================

export interface OnboardingPrerequisite {
  skill: string;
  why: string;
  resources?: string;
}

export interface OnboardingSetupStep {
  step: number;
  title: string;
  command?: string;
  explanation: string;
}

export interface OnboardingKeyConcept {
  concept: string;
  explanation: string;
  where_to_look: string;
}

export interface OnboardingWeekPlan {
  day: string;
  goal: string;
  tasks: string[];
  files_to_read: string[];
}

export interface OnboardingCommonTask {
  task: string;
  steps: string[];
  example_files: string[];
}

export interface OnboardingGotcha {
  title: string;
  description: string;
}

export interface OnboardingResponse {
  welcome_message: string;
  prerequisites: OnboardingPrerequisite[];
  setup_steps: OnboardingSetupStep[];
  architecture_overview: string;
  key_concepts: OnboardingKeyConcept[];
  first_week_plan: OnboardingWeekPlan[];
  common_tasks: OnboardingCommonTask[];
  gotchas: OnboardingGotcha[];
  who_to_ask: string;
}

// ============================================================
// Change Impact
// ============================================================

export interface ImpactedFile {
  path: string;
  impact_level: "high" | "medium" | "low";
  reason: string;
  suggestion: string;
}

export interface ChangeImpactResponse {
  repo_id: string;
  target_file: string;
  risk_level: "high" | "medium" | "low";
  summary: string;
  impacted_files: ImpactedFile[];
  test_files_affected: string[];
  recommendations: string[];
}