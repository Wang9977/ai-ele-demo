"use client";

import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { EventPanel } from "@/components/ai-elements/event-panel";
import { MessageRenderer } from "@/components/ai-elements/message-renderer";
import { StickScroll } from "@/components/ai-elements/stick-scroll";
import {
  applyDemoEvent,
  collectStreamableParts,
  revealTextAt,
  sleep,
  speedScale,
  stepsThrough,
  summarizeLogParts,
  updateMessagePart,
} from "@/lib/demo-chat/stream";
import type { DemoEvent, DemoMessage, DemoSpeed, DemoStatus, EventLogEntry, ToolStep } from "@/types/demo-chat";

type ToolStepReveal = {
  partIndex: number;
  steps: ToolStep[];
};

export function DemoClient() {
  const [speed, setSpeed] = useState<DemoSpeed>("slow");
  const demo = useDemoChat(speed);
  const isIdle = demo.status === "ready" && demo.messages.length === 0;
  const isFinished = demo.status === "ready" && demo.messages.length > 0;

  return (
    <main className="grid h-[100dvh] w-full grid-cols-1 gap-4 overflow-hidden px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(440px,42vw)]">
      <section className="flex min-h-0 flex-1 flex-col">
        <header className="mb-4 shrink-0 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">AI Elements Agent Chat Demo</h1>
          <p className="max-w-[58rem] text-lg leading-8 text-muted-foreground">
            这个 Demo 使用假接口模拟 assistant message，重点展示 Message、 Reasoning、 Tool、 Attachments 和 ChainOfThought 的组合方式。
          </p>
        </header>

        <StickScroll>
          {demo.messages.map((message) => (
            <MessageRenderer key={`${message.id}-${message.parts.length}`} message={message} />
          ))}
        </StickScroll>

        <DemoControls
          speed={speed}
          onSpeedChange={setSpeed}
          isIdle={isIdle}
          isRunning={demo.status === "submitted" || demo.status === "streaming"}
          isPaused={demo.status === "paused"}
          isFinished={isFinished}
          onStart={() => demo.sendMessage("帮我分析一下 Agent Chat UI 应该怎么设计")}
          onPause={demo.pause}
          onResume={demo.resume}
          onReset={demo.reset}
        />
      </section>

      <section className="min-h-0 flex flex-col overflow-hidden lg:pt-[88px]">
        <EventPanel log={demo.log} status={demo.status} />
      </section>
    </main>
  );
}

function useDemoChat(speed: DemoSpeed) {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [status, setStatus] = useState<DemoStatus>("ready");
  const [log, setLog] = useState<EventLogEntry[]>([]);
  const shouldStopRef = useRef(false);
  const isPausedRef = useRef(false);
  const resumeRef = useRef<null | (() => void)>(null);
  const messagesRef = useRef<DemoMessage[]>([]);
  messagesRef.current = messages;

  const waitIfPaused = useCallback(async () => {
    if (!isPausedRef.current) {
      return;
    }

    await new Promise<void>((resolve) => {
      resumeRef.current = resolve;
    });
  }, []);

  const commitSnapshot = useCallback((mutator: (messages: DemoMessage[]) => DemoMessage[], event: DemoEvent["type"], phaseKey: string, messageId: string) => {
    setMessages((current) => {
      const next = mutator(current);
      const message = next.find((candidate) => candidate.id === messageId);
      const parts = message ? summarizeLogParts(message.parts) : [];

      setLog((currentLog) => {
        const existingIndex = currentLog.findIndex((entry) => entry.phaseKey === phaseKey);
        const entry = { phaseKey, event, parts };

        if (existingIndex >= 0) {
          const clone = [...currentLog];
          clone[existingIndex] = entry;
          return clone;
        }

        return [...currentLog, entry];
      });

      return next;
    });
  }, []);

  const revealTextParts = useCallback(
    async (event: DemoEvent, phaseKey: string) => {
      const streamableParts = collectStreamableParts(event.message.parts);

      if (streamableParts.length === 0) {
        return;
      }

      const maxLength = Math.max(...streamableParts.map((part) => part.fullText.length));
      const delay = Math.round(20 * speedScale[speed]);

      for (let cursor = 0; cursor < maxLength; cursor += 1) {
        if (shouldStopRef.current) {
          return;
        }

        await waitIfPaused();

        if (cursor % 8 === 0 || cursor === maxLength - 1) {
          commitSnapshot(
            (current) => {
              let next = current;

              for (const part of streamableParts) {
                next = updateMessagePart(next, event.message.id, part.index, (messagePart) => revealTextAt(messagePart, cursor, part.fullText) ?? messagePart);
              }

              return next;
            },
            "replace-message",
            phaseKey,
            event.message.id,
          );
        } else {
          setMessages((current) => {
            let next = current;

            for (const part of streamableParts) {
              next = updateMessagePart(next, event.message.id, part.index, (messagePart) => revealTextAt(messagePart, cursor, part.fullText) ?? messagePart);
            }

            return next;
          });
        }

        if (delay > 0) {
          await sleep(delay);
        }
      }
    },
    [commitSnapshot, speed, waitIfPaused],
  );

  const revealToolSteps = useCallback(
    async (event: DemoEvent, phaseKey: string, stepsToReveal: ToolStepReveal[]) => {
      if (stepsToReveal.length === 0) {
        return;
      }

      const delay = Math.round(600 * speedScale[speed]);

      for (const { partIndex, steps } of stepsToReveal) {
        for (let index = 0; index < steps.length; index += 1) {
          if (shouldStopRef.current) {
            return;
          }

          await waitIfPaused();

          commitSnapshot(
            (current) =>
              updateMessagePart(current, event.message.id, partIndex, (part) => {
                if (part.type !== "tool-research" || !part.output) {
                  return part;
                }

                return {
                  ...part,
                  output: {
                    ...part.output,
                    steps: stepsThrough(steps, index, "active"),
                  },
                };
              }),
            "replace-message",
            phaseKey,
            event.message.id,
          );

          if (delay > 0) {
            await sleep(delay);
          }

          if (shouldStopRef.current) {
            return;
          }

          await waitIfPaused();

          commitSnapshot(
            (current) =>
              updateMessagePart(current, event.message.id, partIndex, (part) => {
                if (part.type !== "tool-research" || !part.output) {
                  return part;
                }

                return {
                  ...part,
                  output: {
                    ...part.output,
                    steps: stepsThrough(steps, index, "complete"),
                  },
                };
              }),
            "replace-message",
            phaseKey,
            event.message.id,
          );
        }
      }
    },
    [commitSnapshot, speed, waitIfPaused],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      shouldStopRef.current = false;
      isPausedRef.current = false;
      setStatus("submitted");

      try {
        const response = await fetch("/api/demo-chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error("Failed to load demo response");
        }

        const data = (await response.json()) as { events: DemoEvent[] };
        setStatus("streaming");

        const eventDelays = [300, 400, 200, 200, 200, 400, 200, 200, 200, 200, 200];
        const scale = speedScale[speed];

        for (let index = 0; index < data.events.length && !shouldStopRef.current; index += 1) {
          await waitIfPaused();

          const event = data.events[index]!;
          const phaseKey = `evt-${index}`;
          const streamableParts = collectStreamableParts(event.message.parts);

          if (streamableParts.length > 0 && event.message.role === "assistant") {
            const emptyTextEvent: DemoEvent = {
              ...event,
              message: {
                ...event.message,
                parts: event.message.parts.map((part, partIndex) =>
                  streamableParts.find((candidate) => candidate.index === partIndex) && (part.type === "text" || part.type === "reasoning")
                    ? { ...part, text: "" }
                    : part,
                ),
              },
            };

            commitSnapshot((current) => applyDemoEvent(current, emptyTextEvent), event.type, phaseKey, event.message.id);
            await revealTextParts(event, phaseKey);
          } else {
            const previousMessage = messagesRef.current.find((message) => message.id === event.message.id);
            const previousParts = previousMessage?.parts ?? [];
            const stepsToReveal = event.message.parts
              .map((part, partIndex) => {
                if (part.type !== "tool-research" || !part.output || part.output.steps.length === 0) {
                  return null;
                }

                const previousPart = previousParts[partIndex];

                if (previousPart?.type === "tool-research" && previousPart.output && previousPart.output.steps.length !== 0) {
                  return null;
                }

                return { partIndex, steps: part.output.steps };
              })
              .filter((item): item is ToolStepReveal => item !== null);

            if (stepsToReveal.length > 0) {
              const eventWithHiddenSteps: DemoEvent = {
                ...event,
                message: {
                  ...event.message,
                  parts: event.message.parts.map((part, partIndex) =>
                    part.type === "tool-research" && part.output && stepsToReveal.some((item) => item.partIndex === partIndex)
                      ? { ...part, output: { ...part.output, steps: [] } }
                      : part,
                  ),
                },
              };

              commitSnapshot((current) => applyDemoEvent(current, eventWithHiddenSteps), event.type, phaseKey, event.message.id);
              await revealToolSteps(event, phaseKey, stepsToReveal);
            } else {
              commitSnapshot((current) => applyDemoEvent(current, event), event.type, phaseKey, event.message.id);
            }
          }

          const delay = Math.round((eventDelays[index] ?? 400) * scale);

          if (delay > 0) {
            await sleep(delay);
          }
        }

        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    },
    [commitSnapshot, revealTextParts, revealToolSteps, speed, waitIfPaused],
  );

  const pause = useCallback(() => {
    setStatus((current) => {
      if (current === "streaming") {
        isPausedRef.current = true;
        return "paused";
      }

      return current;
    });
  }, []);

  const resume = useCallback(() => {
    setStatus((current) => {
      if (current === "paused") {
        isPausedRef.current = false;
        resumeRef.current?.();
        resumeRef.current = null;
        return "streaming";
      }

      return current;
    });
  }, []);

  const reset = useCallback(() => {
    shouldStopRef.current = true;
    isPausedRef.current = false;
    resumeRef.current?.();
    resumeRef.current = null;
    setMessages([]);
    setLog([]);
    setStatus("ready");
  }, []);

  return { messages, status, log, sendMessage, pause, resume, reset };
}

function DemoControls({
  speed,
  onSpeedChange,
  isIdle,
  isRunning,
  isPaused,
  isFinished,
  onStart,
  onPause,
  onResume,
  onReset,
}: {
  speed: DemoSpeed;
  onSpeedChange: (speed: DemoSpeed) => void;
  isIdle: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}) {
  const speedOptions: Array<{ value: DemoSpeed; label: string }> = [
    { value: "slow", label: "0.5×" },
    { value: "normal", label: "1×" },
    { value: "fast", label: "2.5×" },
    { value: "instant", label: "Max" },
  ];

  return (
    <div className="mt-4 flex shrink-0 items-center gap-4">
      {isIdle && <ControlButton primary onClick={onStart}>开始演示</ControlButton>}
      {isRunning && <ControlButton onClick={onPause}>暂停</ControlButton>}
      {isPaused && <ControlButton primary onClick={onResume}>继续</ControlButton>}
      {(isPaused || isFinished) && <ControlButton onClick={onReset}>重置</ControlButton>}

      <span className="text-sm text-muted-foreground">速度</span>
      <div className="flex items-center gap-1 rounded-lg border p-1">
        {speedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSpeedChange(option.value)}
            disabled={isRunning || isPaused}
            className={[
              "rounded-md px-3 py-1 text-sm transition-colors",
              speed === option.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              (isRunning || isPaused) && "cursor-not-allowed opacity-50",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ControlButton({ children, onClick, primary = false }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-5 py-3 text-base font-semibold transition-colors",
        primary ? "bg-foreground text-background hover:bg-foreground/90" : "border bg-background hover:bg-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
