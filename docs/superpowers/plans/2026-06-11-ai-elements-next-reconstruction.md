# AI Elements Next Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct a runnable Next.js + React + TypeScript project from the `dist` artifact and screenshot, preserving the `/demo/ai-elements` page behavior and visual structure.

**Architecture:** Use Next.js App Router with one page route and one mock API route. Keep demo data, stream simulation logic, and UI components split into focused files so the reconstructed project is maintainable rather than a direct minified-bundle clone.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest for lightweight behavior tests.

---

### File Structure

- Create `package.json`: scripts and dependencies for Next, React, Tailwind, TypeScript, Vitest.
- Create `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`: project configuration.
- Create `app/layout.tsx`, `app/globals.css`: app shell, fonts, Tailwind theme tokens.
- Create `app/demo/ai-elements/page.tsx`: route page rendering the demo client.
- Create `app/api/demo-chat/route.ts`: fake API endpoint returning deterministic events.
- Create `types/demo-chat.ts`: event, message, and part types.
- Create `lib/demo-chat/events.ts`: reconstructed demo event sequence.
- Create `lib/demo-chat/stream.ts`: pure helpers for message snapshots and streaming text.
- Create `components/ai-elements/demo-client.tsx`: state machine, controls, page layout.
- Create `components/ai-elements/message-renderer.tsx`: Message, Tool, Plan, Queue, Attachment, Reasoning UI.
- Create `components/ai-elements/event-panel.tsx`: right-side event log and JSON preview.
- Create `components/ai-elements/stick-scroll.tsx`: scroll container with bottom affordance.
- Create `test/stream.test.ts`: behavior tests for pure stream helpers.

### Tasks

- [ ] **Task 1: Add project scaffolding**
  - Create package/config/app shell files.
  - Expected result: project has a standard Next App Router skeleton.

- [ ] **Task 2: Add typed demo model and API**
  - Create shared types, static event data, and `POST /api/demo-chat`.
  - Expected result: API returns `{ events }` matching the UI state machine.

- [ ] **Task 3: Add pure stream helpers and tests**
  - Test merging message snapshots and streaming text truncation.
  - Expected result: pure behavior can be verified without a browser.

- [ ] **Task 4: Build AI Elements UI components**
  - Implement message parts, tool card, chain-of-thought steps, plan, queue, attachments, and code-style JSON panel.
  - Expected result: screenshot visual hierarchy is represented in source.

- [ ] **Task 5: Build client state machine**
  - Implement start, pause, resume, reset, speed selection, log snapshots, and scroll behavior.
  - Expected result: `/demo/ai-elements` reproduces the demo interaction.

- [ ] **Task 6: Verify**
  - Run static/type/test commands when dependencies are available.
  - If dependencies are missing, report the exact blocked command and reason.

