"use client";

import { useEffect, useRef } from "react";
import type { DemoStatus, EventLogEntry, EventLogPart } from "@/types/demo-chat";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const statusDot: Record<DemoStatus, string> = {
  ready: "bg-green-500",
  submitted: "animate-subtle-pulse bg-yellow-500",
  streaming: "animate-subtle-pulse bg-blue-500",
  paused: "bg-amber-500",
  error: "bg-red-500",
};

const statusLabel: Record<DemoStatus, string> = {
  ready: "就绪",
  submitted: "已提交",
  streaming: "生成中……",
  paused: "已暂停",
  error: "出错",
};

const componentMap: Record<EventLogPart["type"], { label: string; component: string }> = {
  text: { label: "文本回复", component: "<MessageResponse />" },
  reasoning: { label: "思考过程", component: "<Reasoning />" },
  file: { label: "文件预览", component: "<Attachments />" },
  "tool-research": { label: "工具调用", component: "<Tool />" },
  plan: { label: "执行计划", component: "<Plan />" },
  queue: { label: "任务队列", component: "<Queue />" },
};

const toolExplanation: Record<string, string> = {
  "input-streaming": "工具入参还在流式生成，UI 应该展示“准备参数中”的状态。",
  "input-available": "工具入参已经准备好，下一步可以开始执行工具。",
  "output-available": "工具结果已经返回，可以把 output 渲染成更具体的 UI。",
  "output-error": "工具执行失败，UI 应该展示错误状态，而不是继续转圈。",
};

export function EventPanel({ log, status }: { log: EventLogEntry[]; status: DemoStatus }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [log.length]);

  return (
    <aside className="flex h-full flex-col gap-5">
      <div className="flex items-start gap-3 text-sm">
        <span className={cx("mt-1.5 inline-block size-2 rounded-full", statusDot[status])} />
        <div className="min-w-0">
          <p className="font-semibold">{statusLabel[status]}</p>
          <p className="text-xs text-muted-foreground">跟着事件流看 message parts 是怎么变成 UI 组件的。</p>
        </div>
        {log.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{log.length} events</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/30">
        <div className="shrink-0 border-b px-5 py-3">
          <p className="font-semibold text-sm">事件流</p>
          <p className="text-xs text-muted-foreground">说明、组件映射、变化字段和原始数据会一起展示。</p>
        </div>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-3 text-xs leading-relaxed">
          {log.length === 0 ? (
            <div className="rounded-md border border-dashed bg-background/60 p-3">
              <p className="font-medium">等待事件……</p>
              <p className="mt-1 text-muted-foreground">点击开始演示后，这里会逐条解释每个 message part 如何渲染成组件。</p>
            </div>
          ) : (
            log.map((entry, index) => (
              <EventLogCard
                key={entry.phaseKey}
                entry={entry}
                prevParts={index > 0 ? log[index - 1]!.parts : []}
                isFirst={index === 0}
                isLast={index === log.length - 1}
                isStreaming={status === "streaming"}
              />
            ))
          )}
          {status === "streaming" && (
            <div className="flex items-center gap-1 font-mono text-blue-500">
              <span className="animate-subtle-pulse">✧</span>
              <span>event:</span>
              <span className="animate-subtle-pulse">▌</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function EventLogCard({
  entry,
  prevParts,
  isFirst,
  isLast,
  isStreaming,
}: {
  entry: EventLogEntry;
  prevParts: EventLogPart[];
  isFirst: boolean;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const changedIndexes = changedPartIndexes(prevParts, entry.parts);
  const visibleParts = isFirst ? entry.parts : entry.parts.filter((_, index) => changedIndexes.has(index));
  const unchangedCount = entry.parts.length - visibleParts.length;
  const fields = [...new Set(visibleParts.flatMap((part) => Object.keys(part).filter((key) => key !== "type")))];

  return (
    <div className={cx("mb-3 rounded-md border bg-background/80 p-3", isLast && isStreaming && "border-blue-500/40 bg-blue-500/5")}>
      <div className="mb-2 flex items-start gap-2">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded border border-blue-500/20 bg-blue-500/10 text-blue-600">✧</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[11px] text-blue-600">{entry.event}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{entry.phaseKey}</span>
            {isLast && isStreaming && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-600">实时</span>}
          </div>
          <p className="mt-1 text-sm font-medium leading-snug">{explainParts(visibleParts, isFirst)}</p>
        </div>
      </div>

      <div className="mb-2 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {visibleParts.map((part, index) => {
            const mapped = componentMap[part.type];
            return (
              <span key={`${part.type}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5">
                <span className="truncate text-muted-foreground">{mapped.label}</span>
                <span className="font-mono text-[11px] text-foreground">{mapped.component}</span>
              </span>
            );
          })}
        </div>

        {fields.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">变化字段</span>
            {fields.map((field) => (
              <span key={field} className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] text-amber-700">
                {field}
              </span>
            ))}
          </div>
        )}
      </div>

      {unchangedCount > 0 && <div className="mb-1 text-[11px] text-muted-foreground/50">… {unchangedCount} unchanged</div>}

      <div className="rounded border bg-muted/20">
        <div className="flex items-center gap-1.5 border-b px-2 py-1.5 font-mono text-[11px] text-muted-foreground">✧ 原始 JSON 数据</div>
        <HighlightedJson data={visibleParts} />
      </div>
    </div>
  );
}

function changedPartIndexes(prev: EventLogPart[], next: EventLogPart[]) {
  const indexes = new Set<number>();
  const count = Math.max(prev.length, next.length);

  for (let index = 0; index < count; index += 1) {
    if (JSON.stringify(prev[index]) !== JSON.stringify(next[index])) {
      indexes.add(index);
    }
  }

  return indexes;
}

function explainParts(parts: EventLogPart[], isFirst: boolean) {
  if (parts.length === 0) {
    return "这个快照里没有可见 part 发生变化。";
  }

  const part = parts[0]!;

  if (isFirst) {
    return "第一个事件会创建 message 快照。渲染器会读取 parts，然后选择对应组件。";
  }

  if (part.type === "reasoning") {
    return part.state === "streaming"
      ? "reasoning 正在流式生成，所以折叠块应该保持可见，让用户知道模型还在分析。"
      : "reasoning 已经结束，UI 可以把它收拢，让最终回答更容易阅读。";
  }

  if (part.type === "tool-research") {
    return toolExplanation[part.state] ?? "tool part 会映射到 Tool，用来展示 input、output 和错误状态。";
  }

  const explanations: Record<EventLogPart["type"], string> = {
    text: "text part 会映射到 MessageResponse，用来展示普通用户消息或 assistant 回复。",
    file: "file part 会映射到 Attachments，文件信息不需要塞进 markdown 里展示。",
    plan: "plan part 会映射到 Plan。这里的 steps 是结构化状态，不是普通 markdown 文本。",
    queue: "queue part 会映射到 Queue。count 和 items 会驱动右侧的任务队列 UI。",
    reasoning: "",
    "tool-research": "",
  };

  return explanations[part.type];
}

function HighlightedJson({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[46rem] overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-xs leading-6">
      {JSON.stringify(data, null, 2)
        .split("\n")
        .map((line, index) => (
          <JsonLine key={index} line={line} />
        ))}
    </pre>
  );
}

function JsonLine({ line }: { line: string }) {
  const match = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);

  if (!match) {
    return <span className="block text-muted-foreground">{line}</span>;
  }

  const [, indent, key, value] = match;
  const keyClass: Record<string, string> = {
    type: "text-sky-500 font-semibold",
    state: "text-violet-500 font-semibold",
    text: "text-muted-foreground",
    outputSteps: "text-amber-500 font-semibold",
    input: "text-cyan-600",
    filename: "text-teal-600",
  };

  return (
    <span className="block">
      <span>{indent}</span>
      <span className={keyClass[key] ?? "text-purple-600"}>"{key}"</span>
      <span className="text-muted-foreground">: </span>
      <JsonValue value={value} />
    </span>
  );
}

function JsonValue({ value }: { value: string }) {
  if (value.startsWith('"')) {
    const raw = value.slice(1, -1);
    const stateClass: Record<string, string> = {
      streaming: "text-violet-500",
      "input-streaming": "text-violet-500",
      "input-available": "text-violet-500",
      "output-available": "text-violet-500",
      "output-error": "text-red-400",
      active: "text-blue-500 font-semibold",
      complete: "text-emerald-500",
      pending: "text-muted-foreground",
      reasoning: "text-sky-500",
      "tool-research": "text-sky-500",
    };

    return <span className={stateClass[raw] ?? "text-green-700"}>{value}</span>;
  }

  if (/^\d+$/.test(value)) {
    return <span className="font-semibold text-amber-600">{value}</span>;
  }

  return <span className="text-muted-foreground">{value}</span>;
}
