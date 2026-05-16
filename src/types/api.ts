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
