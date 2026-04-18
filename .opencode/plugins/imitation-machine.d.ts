type AgentPermission = {
  edit?: string;
  bash?: string;
  webfetch?: string;
};

type AgentConfig = {
  mode?: string;
  description?: string;
  prompt?: string;
  permission?: AgentPermission;
};

type PluginConfig = {
  skills?: {
    paths?: string[];
  };
  agent?: Record<string, AgentConfig>;
};

type PluginHooks = {
  config(config: PluginConfig): Promise<void>;
  "experimental.chat.messages.transform"?: (input: unknown, output: { messages: Array<{ info: { role: string }; parts: Array<Record<string, unknown>> }> }) => Promise<void>;
  "tool.execute.before"?: (input: unknown, output: unknown) => Promise<void>;
};

declare const ImitationMachinePlugin: () => Promise<PluginHooks>;

export default ImitationMachinePlugin;
