import type { DemoEvent, ToolStep } from "@/types/demo-chat";

const researchSteps: ToolStep[] = [
  {
    label: "Initialize tool",
    description: "创建 tool call 请求，进入 input-streaming 状态",
    status: "complete",
  },
  {
    label: "Receive input",
    description: "参数接收完成，切换为 input-available（Running）状态",
    status: "complete",
  },
  {
    label: "Execute and return",
    description: "执行完成，进入 output-available 状态",
    status: "complete",
  },
];

export const demoEvents: DemoEvent[] = [
  {
    type: "append-message",
    message: {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "帮我分析一下 Agent Chat UI 应该怎么设计" }],
    },
  },
  {
    type: "append-message",
    message: {
      id: "assistant-1",
      role: "assistant",
      parts: [
        {
          type: "reasoning",
          state: "streaming",
          text: "我先把 Agent Chat 拆成消息、推理、工具调用、附件和计划几个可组合的 part，再设计每个 part 的可视状态。",
        },
      ],
    },
  },
  {
    type: "replace-message",
    message: {
      id: "assistant-1",
      role: "assistant",
      parts: [
        {
          type: "reasoning",
          state: "done",
          text: "我先把 Agent Chat 拆成消息、推理、工具调用、附件和计划几个可组合的 part，再设计每个 part 的可视状态。",
        },
        {
          type: "text",
          text: "一个稳定的 Agent Chat UI 不应该只渲染 markdown。它需要把结构化 message parts 映射成明确组件，让状态变化本身可读。",
        },
      ],
    },
  },
  {
    type: "append-message",
    message: {
      id: "assistant-file",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "先放一个附件示例：文件 part 独立渲染，避免把文件元信息混在回复正文里。",
        },
        {
          type: "file",
          id: "file-1",
          filename: "agent-chat-ui-notes.pdf",
          mediaType: "application/pdf",
          url: "#",
        },
      ],
    },
  },
  {
    type: "append-message",
    message: {
      id: "assistant-tool",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "展示 Tool Call 的各种状态",
        },
        {
          type: "tool-research",
          state: "input-streaming",
          input: { topic: "Tool states overview" },
        },
      ],
    },
  },
  {
    type: "replace-message",
    message: {
      id: "assistant-tool",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "展示 Tool Call 的各种状态",
        },
        {
          type: "tool-research",
          state: "input-available",
          input: { topic: "Tool states overview", depth: "quick" },
        },
      ],
    },
  },
  {
    type: "replace-message",
    message: {
      id: "assistant-tool",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Tool Call 有 6 种状态，下面用一个 research tool 来演示完整流程：",
        },
        {
          type: "tool-research",
          state: "output-available",
          input: { topic: "Tool states overview", depth: "quick" },
          output: {
            summary: "Tool Call 状态流转：input-streaming → input-available → output-available（或 output-error）",
            steps: researchSteps,
          },
        },
      ],
    },
  },
  {
    type: "append-message",
    message: {
      id: "assistant-plan",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Plan part 适合展示模型后续会做什么；每个 step 都是结构化状态，而不是一段普通文本。",
        },
        {
          type: "plan",
          title: "Agent Chat UI 设计计划",
          description: "把长回复拆成可解释的阶段和组件。",
          isStreaming: true,
          steps: [
            { title: "定义 message part schema", status: "complete" },
            { title: "设计每个 part 的组件映射", status: "active" },
            { title: "把事件流可视化", status: "pending" },
          ],
        },
      ],
    },
  },
  {
    type: "append-message",
    message: {
      id: "assistant-queue",
      role: "assistant",
      parts: [
        {
          type: "queue",
          label: "tasks",
          count: 3,
          items: [
            { title: "MessageResponse", description: "展示普通文本回复", status: "completed" },
            { title: "Tool", description: "展示 input、output 和错误状态", status: "completed" },
            { title: "ChainOfThought", description: "展示可折叠的执行步骤", status: "pending" },
          ],
        },
      ],
    },
  },
  {
    type: "append-message",
    message: {
      id: "assistant-final",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "最终建议：把 Agent Chat 当成事件驱动 UI，而不是聊天气泡列表。消息负责承载 role，parts 决定渲染组件，事件流负责解释状态变化。",
        },
      ],
    },
  },
];
