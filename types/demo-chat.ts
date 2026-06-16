export type DemoStatus = "ready" | "submitted" | "streaming" | "paused" | "error";

export type DemoSpeed = "slow" | "normal" | "fast" | "instant";

export type MessageRole = "user" | "assistant";

export type StepStatus = "pending" | "active" | "complete";

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export type TextPart = {
  type: "text";
  text: string;
};

export type ReasoningPart = {
  type: "reasoning";
  state: "streaming" | "done";
  text: string;
};

export type FilePart = {
  type: "file";
  id: string;
  filename: string;
  mediaType: string;
  url: string;
};

export type ToolStep = {
  label: string;
  description: string;
  status: StepStatus;
};

export type ToolResearchPart = {
  type: "tool-research";
  state: ToolState;
  input?: Record<string, string>;
  output?: {
    summary: string;
    steps: ToolStep[];
  };
  errorText?: string;
};

export type PlanPart = {
  type: "plan";
  title: string;
  description?: string;
  isStreaming: boolean;
  steps: Array<{
    title: string;
    status: StepStatus;
  }>;
};

export type QueuePart = {
  type: "queue";
  label: string;
  count: number;
  items: Array<{
    title: string;
    description?: string;
    status: "pending" | "completed";
  }>;
};

export type DemoPart =
  | TextPart
  | ReasoningPart
  | FilePart
  | ToolResearchPart
  | PlanPart
  | QueuePart;

export type DemoMessage = {
  id: string;
  role: MessageRole;
  parts: DemoPart[];
};

export type DemoEvent = {
  type: "append-message" | "replace-message";
  message: DemoMessage;
};

export type EventLogEntry = {
  phaseKey: string;
  event: DemoEvent["type"];
  parts: EventLogPart[];
};

export type EventLogPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; state: ReasoningPart["state"]; text: string }
  | { type: "file"; filename: string }
  | {
      type: "tool-research";
      state: ToolState;
      input?: Record<string, string>;
      outputSteps?: number;
      summary?: string;
      steps?: ToolStep[];
    }
  | { type: "plan"; title: string; stepsCount: number; isStreaming: boolean }
  | { type: "queue"; label: string; count: number; itemsCount: number };
