import type { DemoEvent, DemoMessage, DemoPart, EventLogPart, StepStatus, ToolStep } from "@/types/demo-chat";

export const speedScale = {
  slow: 2,
  normal: 1,
  fast: 0.4,
  instant: 0,
} as const;

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function applyDemoEvent(messages: DemoMessage[], event: DemoEvent): DemoMessage[] {
  if (event.type === "append-message") {
    return [...messages, event.message];
  }

  return messages.map((message) => (message.id === event.message.id ? event.message : message));
}

export function updateMessagePart(
  messages: DemoMessage[],
  messageId: string,
  partIndex: number,
  updater: (part: DemoPart) => DemoPart,
): DemoMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    return {
      ...message,
      parts: message.parts.map((part, index) => (index === partIndex ? updater(part) : part)),
    };
  });
}

export function collectStreamableParts(parts: DemoPart[]) {
  return parts
    .map((part, index) => {
      if (part.type === "text" || (part.type === "reasoning" && part.state === "streaming")) {
        return { index, fullText: part.text };
      }

      return null;
    })
    .filter((part): part is { index: number; fullText: string } => part !== null);
}

export function revealTextAt(part: DemoPart, cursor: number, fullText: string): DemoPart | null {
  if (cursor >= fullText.length) {
    return null;
  }

  if (part.type !== "text" && part.type !== "reasoning") {
    return null;
  }

  return {
    ...part,
    text: fullText.slice(0, cursor + 1),
  };
}

export function stepsThrough(steps: ToolStep[], activeIndex: number, status: StepStatus): ToolStep[] {
  return steps.slice(0, activeIndex + 1).map((step, index) => ({
    ...step,
    status: index < activeIndex ? "complete" : status,
  }));
}

export function summarizeLogParts(parts: DemoPart[]): EventLogPart[] {
  return parts.map((part) => {
    switch (part.type) {
      case "text":
        return { type: "text", text: part.text };
      case "reasoning":
        return { type: "reasoning", state: part.state, text: part.text };
      case "file":
        return { type: "file", filename: part.filename };
      case "tool-research":
        return {
          type: "tool-research",
          state: part.state,
          ...(part.input ? { input: part.input } : {}),
          ...(part.output
            ? {
                outputSteps: part.output.steps.length,
                summary: part.output.summary,
                steps: part.output.steps.map((step) => ({
                  label: step.label,
                  description: step.description,
                  status: step.status,
                })),
              }
            : {}),
        };
      case "plan":
        return {
          type: "plan",
          title: part.title,
          stepsCount: part.steps.length,
          isStreaming: part.isStreaming,
        };
      case "queue":
        return {
          type: "queue",
          label: part.label,
          count: part.count,
          itemsCount: part.items.length,
        };
    }
  });
}
