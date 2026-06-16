import { describe, expect, test } from "vitest";
import type { DemoMessage } from "@/types/demo-chat";
import { demoEvents } from "@/lib/demo-chat/events";
import { applyDemoEvent, collectStreamableParts, revealTextAt, summarizeLogParts } from "@/lib/demo-chat/stream";

const userMessage: DemoMessage = {
  id: "user-1",
  role: "user",
  parts: [{ type: "text", text: "hello" }],
};

const assistantMessage: DemoMessage = {
  id: "assistant-1",
  role: "assistant",
  parts: [
    { type: "reasoning", state: "streaming", text: "thinking" },
    { type: "text", text: "answer" },
  ],
};

describe("demo chat stream helpers", () => {
  test("appends and replaces message snapshots by id", () => {
    const appended = applyDemoEvent([], { type: "append-message", message: userMessage });

    expect(appended).toEqual([userMessage]);

    const replaced = applyDemoEvent(appended, {
      type: "replace-message",
      message: { ...userMessage, parts: [{ type: "text", text: "updated" }] },
    });

    expect(replaced).toHaveLength(1);
    expect(replaced[0]?.parts).toEqual([{ type: "text", text: "updated" }]);
  });

  test("collects text and streaming reasoning parts for reveal animation", () => {
    expect(collectStreamableParts(assistantMessage.parts)).toEqual([
      { index: 0, fullText: "thinking" },
      { index: 1, fullText: "answer" },
    ]);
  });

  test("reveals text one character at a time", () => {
    const part = revealTextAt({ type: "text", text: "" }, 2, "answer");

    expect(part).toEqual({ type: "text", text: "ans" });
    expect(part).not.toBeNull();
    expect(revealTextAt(part!, 99, "answer")).toBeNull();
  });

  test("summarizes rich parts for the event log", () => {
    const parts = summarizeLogParts([
      {
        type: "tool-research",
        state: "output-available",
        input: { topic: "Tool states overview" },
        output: {
          summary: "done",
          steps: [{ label: "Initialize tool", description: "created", status: "complete" }],
        },
      },
    ]);

    expect(parts).toEqual([
      {
        type: "tool-research",
        state: "output-available",
        input: { topic: "Tool states overview" },
        outputSteps: 1,
        summary: "done",
        steps: [{ label: "Initialize tool", description: "created", status: "complete" }],
      },
    ]);
  });

  test("default demo events do not surface a failed research tool", () => {
    const failedResearchParts = demoEvents.flatMap((event) =>
      event.message.parts.filter((part) => part.type === "tool-research" && part.state === "output-error"),
    );

    expect(failedResearchParts).toHaveLength(0);
  });

  test("default demo events preserve rendered UI sections in the final transcript", () => {
    const messages = demoEvents.reduce<DemoMessage[]>((current, event) => applyDemoEvent(current, event), []);
    const parts = messages.flatMap((message) => message.parts);

    expect(messages.filter((message) => message.role === "assistant").length).toBeGreaterThanOrEqual(6);
    expect(parts.some((part) => part.type === "file")).toBe(true);
    expect(parts.some((part) => part.type === "tool-research" && part.state === "output-available")).toBe(true);
    expect(parts.some((part) => part.type === "plan")).toBe(true);
    expect(parts.some((part) => part.type === "queue")).toBe(true);
    expect(parts.some((part) => part.type === "text" && part.text.includes("最终建议"))).toBe(true);
  });
});
