import type { DemoMessage, DemoPart, PlanPart, QueuePart, StepStatus, ToolResearchPart } from "@/types/demo-chat";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function MessageRenderer({ message }: { message: DemoMessage }) {
  const hasTool = message.parts.some((part) => part.type === "tool-research");

  return (
    <article className={cx("flex w-full", message.role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "min-w-0 space-y-6 text-[15px] leading-relaxed",
          message.role === "user"
            ? "max-w-[56%] rounded-2xl bg-muted px-6 py-4 text-right text-lg"
            : hasTool
              ? "w-full"
              : "max-w-[72%]",
        )}
      >
        {message.parts.map((part, index) => (
          <PartRenderer key={`${part.type}-${index}`} part={part} />
        ))}
      </div>
    </article>
  );
}

function PartRenderer({ part }: { part: DemoPart }) {
  switch (part.type) {
    case "text":
      return <p className="whitespace-pre-wrap text-[16px] leading-8">{part.text}</p>;
    case "reasoning":
      return <ReasoningPart part={part} />;
    case "file":
      return (
        <div className="inline-flex max-w-full items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-sm">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-lg">□</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{part.filename}</span>
            <span className="text-xs text-muted-foreground">{part.mediaType}</span>
          </span>
        </div>
      );
    case "tool-research":
      return <ToolResearch part={part} />;
    case "plan":
      return <PlanCard part={part} />;
    case "queue":
      return <QueueCard part={part} />;
  }
}

function ReasoningPart({ part }: { part: Extract<DemoPart, { type: "reasoning" }> }) {
  return (
    <section className="rounded-xl border bg-muted/25 p-4 text-muted-foreground">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className={cx("size-2 rounded-full bg-blue-500", part.state === "streaming" && "animate-subtle-pulse")} />
        Reasoning
        <span className="ml-auto text-xs">{part.state === "streaming" ? "streaming" : "done"}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7">{part.text}</p>
    </section>
  );
}

const toolStateLabel: Record<ToolResearchPart["state"], string> = {
  "input-streaming": "Preparing input",
  "input-available": "Running",
  "output-available": "Completed",
  "output-error": "Error",
};

function ToolResearch({ part }: { part: ToolResearchPart }) {
  const isError = part.state === "output-error";

  return (
    <section className="w-[92%] max-w-full rounded-xl border bg-background p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <header className="mb-7 flex items-center gap-3">
        <span className="text-2xl text-muted-foreground">⌘</span>
        <h3 className="text-xl font-semibold">research</h3>
        <span
          className={cx(
            "rounded-full px-3 py-1 text-sm font-medium",
            isError ? "bg-red-50 text-red-700" : "bg-muted text-foreground",
          )}
        >
          {part.state === "output-available" ? "✓ " : ""}
          {toolStateLabel[part.state]}
        </span>
        <span className="ml-auto text-2xl text-muted-foreground">⌄</span>
      </header>

      {part.input && (
        <section className="mb-7 space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Parameters</h4>
          <CodeBox data={part.input} />
        </section>
      )}

      {part.output && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-lg text-muted-foreground">
            <span>⚙</span>
            <span>Research steps</span>
            <span className="ml-auto text-xl">⌃</span>
          </div>
          <div className="space-y-4">
            {part.output.steps.map((step, index) => (
              <StepRow key={step.label} label={step.label} description={step.description} status={step.status} last={index === part.output!.steps.length - 1} />
            ))}
          </div>
        </section>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {part.errorText ?? "Tool failed"}
        </div>
      )}
    </section>
  );
}

function StepRow({
  label,
  description,
  status,
  last,
}: {
  label: string;
  description?: string;
  status: StepStatus;
  last?: boolean;
}) {
  return (
    <div className={cx("grid grid-cols-[24px_1fr] gap-3 text-muted-foreground", status === "active" && "text-foreground")}>
      <div className="relative flex justify-center">
        <span className="mt-2 text-lg leading-none">·</span>
        {!last && <span className="absolute top-9 h-9 w-px bg-border" />}
      </div>
      <div className="space-y-2">
        <p className="text-[16px]">{label}</p>
        {description && <p className="border-l pl-5 text-sm leading-6">{description}</p>}
      </div>
    </div>
  );
}

function PlanCard({ part }: { part: PlanPart }) {
  return (
    <section className="w-[28rem] max-w-full rounded-xl border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{part.title}</h3>
          {part.description && <p className="mt-1 text-sm text-muted-foreground">{part.description}</p>}
        </div>
        <span className="text-muted-foreground">⇅</span>
      </header>
      <div className="space-y-3">
        {part.steps.map((step, index) => (
          <StepRow key={step.title} label={step.title} status={step.status} last={index === part.steps.length - 1} />
        ))}
      </div>
    </section>
  );
}

function QueueCard({ part }: { part: QueuePart }) {
  return (
    <section className="w-[28rem] max-w-full rounded-xl border bg-background px-4 py-3 shadow-sm">
      <header className="mb-3 flex items-center gap-2 font-medium">
        <span>⌄</span>
        <span>☑</span>
        <span>
          {part.count} {part.label}
        </span>
      </header>
      <ul className="max-h-40 space-y-1 overflow-auto pr-2">
        {part.items.map((item) => (
          <li key={item.title} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
            <div className="flex items-center gap-3">
              <span className={cx("size-2.5 rounded-full border", item.status === "completed" && "bg-muted-foreground/20")} />
              <span className={cx("truncate", item.status === "completed" ? "text-muted-foreground/60 line-through" : "text-muted-foreground")}>
                {item.title}
              </span>
            </div>
            {item.description && (
              <p className={cx("ml-6 text-xs", item.status === "completed" ? "text-muted-foreground/40 line-through" : "text-muted-foreground")}>
                {item.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CodeBox({ data }: { data: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-background p-5 text-[15px] leading-8 text-[#1d3c72]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
