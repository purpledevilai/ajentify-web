export interface ApiUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  organizations: ApiOrganizationRef[];
}

export interface ApiOrganizationRef {
  id: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: ApiUser;
}

export interface SuccessResponse {
  success: boolean;
}

export interface ApiOrganization {
  org_id: string;
  name: string;
  users: string[];
  webhook_url?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ApiLLMModel {
  model: string;
  model_provider: string;
  input_token_cost: number;
  output_token_cost: number;
  context_window_size: number;
  order?: number | null;
  use_responses_api?: boolean;
}

export interface ApiParameterDefinition {
  pd_id: string;
  org_id: string;
  schema: Record<string, unknown>;
  stage_id?: string | null;
  logical_name?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateParameterDefinitionParams {
  org_id?: string;
  schema: Record<string, unknown>;
}

export interface UpdateParameterDefinitionParams {
  schema: Record<string, unknown>;
}

export interface ApiTool {
  tool_id: string;
  org_id: string;
  name: string;
  description?: string | null;
  pd_id?: string | null;
  code?: string | null;
  pass_context: boolean;
  is_async: boolean;
  is_client_side_tool: boolean;
  stage_id?: string | null;
  logical_name?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateToolParams {
  org_id?: string;
  name: string;
  description: string;
  pd_id?: string | null;
  code?: string | null;
  pass_context?: boolean;
  is_async?: boolean;
  is_client_side_tool?: boolean;
}

export type UpdateToolParams = Partial<Omit<CreateToolParams, "org_id">>;

export interface ApiAgent {
  agent_id: string;
  agent_name: string;
  agent_description: string;
  prompt: string;
  org_id: string;
  is_public: boolean;
  is_default_agent: boolean;
  agent_speaks_first?: boolean;
  tools?: string[];
  uses_prompt_args?: boolean;
  prompt_arg_names?: string[];
  voice_id?: string | null;
  initialize_tool_id?: string | null;
  model_id?: string | null;
  stage_id?: string | null;
  logical_name?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateAgentParams {
  agent_name: string;
  agent_description: string;
  prompt: string;
  org_id?: string;
  is_public: boolean;
  agent_speaks_first?: boolean;
  tools?: string[];
  uses_prompt_args?: boolean;
  prompt_arg_names?: string[];
  voice_id?: string | null;
  initialize_tool_id?: string | null;
  model_id?: string | null;
}

export type UpdateAgentParams = Partial<Omit<CreateAgentParams, "org_id">>;

/**
 * Built-in tool shipped by the platform. Distinct from `ApiTool`: default
 * tools have no `org_id`, no ParameterDefinition (their JSON schema is
 * inlined as `parameters`), and carry a `category` used to group them in
 * the agent designer.
 */
export interface ApiDefaultTool {
  tool_id: string;
  name: string;
  description?: string | null;
  parameters: Record<string, unknown>;
  pass_context?: boolean;
  is_async?: boolean;
  is_client_side_tool?: boolean;
  category: string;
}

export interface GetDefaultToolsResponse {
  tools: ApiDefaultTool[];
}

export interface GetAgentsResponse {
  agents: ApiAgent[];
}
export interface GetToolsResponse {
  tools: ApiTool[];
}
export interface GetParameterDefinitionsResponse {
  parameter_definitions: ApiParameterDefinition[];
}
export interface GetModelsResponse {
  models: ApiLLMModel[];
}

/**
 * Org-token metadata as returned by GET /api-keys. The raw JWT is never
 * exposed in the list view — only a hint built from its last 8 chars.
 */
export interface ApiAPIKeySummary {
  api_key_id: string;
  org_id: string;
  token_hint: string;
  valid: boolean;
  created_at: number;
}

/** Full APIKey, returned only when a new key is generated. */
export interface ApiAPIKey {
  api_key_id: string;
  org_id: string;
  token: string;
  valid: boolean;
  type: "org" | "client";
  user_id: string;
  client_id?: string | null;
  created_at: number;
  updated_at: number;
  expires_at?: number | null;
}

export interface GetAPIKeysResponse {
  api_keys: ApiAPIKeySummary[];
}

export interface ApiDataWindow {
  data_window_id: string;
  org_id: string;
  name?: string | null;
  description?: string | null;
  data: string;
  stage_id?: string | null;
  logical_name?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateDataWindowParams {
  org_id?: string;
  name?: string | null;
  description?: string | null;
  data: string;
}

export interface UpdateDataWindowParams {
  name?: string | null;
  description?: string | null;
  data?: string | null;
}

export interface GetDataWindowsResponse {
  data_windows: ApiDataWindow[];
}

export interface ApiIntegration {
  integration_id: string;
  org_id: string;
  type: string;
  integration_config: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface CreateIntegrationParams {
  type: string;
  integration_config: Record<string, unknown>;
  org_id?: string;
}

export interface UpdateIntegrationParams {
  type?: string;
  integration_config?: Record<string, unknown>;
}

export interface GetIntegrationsResponse {
  integrations: ApiIntegration[];
}

export interface ApiJSONDocument {
  document_id: string;
  name: string;
  data: Record<string, unknown>;
  org_id: string;
  stage_id?: string | null;
  logical_name?: string | null;
  created_at: number;
  updated_at: number;
  is_public: boolean;
}

export interface CreateJSONDocumentParams {
  name: string;
  data: Record<string, unknown>;
  org_id?: string;
  is_public?: boolean;
}

export interface UpdateJSONDocumentParams {
  name?: string;
  data?: Record<string, unknown>;
  is_public?: boolean;
  stage_id?: string | null;
  logical_name?: string | null;
}

export interface GetJSONDocumentsResponse {
  json_documents: ApiJSONDocument[];
}

export interface ApiStage {
  stage_id: string;
  org_id: string;
  name: string;
  description?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateStageParams {
  org_id?: string;
  name: string;
  description?: string | null;
}

export interface UpdateStageParams {
  name?: string;
  description?: string | null;
}

export interface GetStagesResponse {
  stages: ApiStage[];
}

export type DeleteStageMode = "detach" | "destroy";

// --- Manifest / Deploy types ------------------------------------------------

export interface ManifestTool {
  name: string;
  description?: string | null;
  input_schema?: Record<string, unknown> | null;
  code?: string | null;
  pass_context?: boolean;
  is_async?: boolean;
  is_client_side_tool?: boolean;
}

export interface ManifestSRE {
  name: string;
  description?: string | null;
  output_schema: Record<string, unknown>;
  is_public?: boolean;
  prompt_template: string;
  variable_names?: string[] | null;
  model_id?: string | null;
}

export interface ManifestAgent {
  name: string;
  description: string;
  prompt: string;
  is_public?: boolean;
  agent_speaks_first?: boolean;
  tools?: string[];
  uses_prompt_args?: boolean;
  prompt_arg_names?: string[];
  voice_id?: string | null;
  initialize_tool_id?: string | null;
  model_id?: string | null;
}

export interface Manifest {
  $schema?: string;
  tools?: Record<string, ManifestTool>;
  sres?: Record<string, ManifestSRE>;
  agents?: Record<string, ManifestAgent>;
}

export interface DeployRequest {
  stage: string;
  org_id?: string;
  manifest: Manifest;
}

export interface ResourceOp {
  kind: "parameter_definition" | "tool" | "sre" | "agent";
  op: "create" | "update" | "delete" | "noop";
  logical_name: string;
  resource_id: string | null;
  diff_summary: string | null;
}

export interface DeployResponse {
  stage_id: string;
  stage_name: string;
  stage_created: boolean;
  summary: { create: number; update: number; delete: number; noop: number };
  operations: ResourceOp[];
}

export interface ApiStructuredResponseEndpoint {
  sre_id: string;
  org_id: string;
  name: string;
  description?: string | null;
  pd_id: string;
  is_public: boolean;
  prompt_template?: string | null;
  variable_names?: string[] | null;
  model_id?: string | null;
  stage_id?: string | null;
  logical_name?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateSREParams {
  org_id?: string;
  name: string;
  description?: string | null;
  pd_id: string;
  is_public?: boolean;
  prompt_template: string;
  variable_names?: string[] | null;
  model_id?: string | null;
}

export interface UpdateSREParams {
  name?: string;
  description?: string | null;
  pd_id?: string;
  is_public?: boolean;
  prompt_template?: string;
  variable_names?: string[] | null;
  model_id?: string | null;
  stage_id?: string | null;
  logical_name?: string | null;
}

export interface GetSREsResponse {
  sres: ApiStructuredResponseEndpoint[];
}

export interface DailyUsage {
  date: string;
  total_tokens: number;
}

export interface ModelCost {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: string;
}

export interface UsageResponse {
  daily_usage: DailyUsage[];
  total_cost: string;
  model_costs: ModelCost[];
}
