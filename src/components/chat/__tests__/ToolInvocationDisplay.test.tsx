import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationDisplay } from "../ToolInvocationDisplay";

vi.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className} />
  ),
}));

afterEach(() => {
  cleanup();
});

// --- str_replace_editor: create ---

test("shows 'Created filename' for completed create command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/components/Button.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Created Button.jsx")).toBeDefined();
});

test("shows 'Creating filename' for in-progress create command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/components/Button.jsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
  expect(screen.getByTestId("spinner")).toBeDefined();
});

// --- str_replace_editor: str_replace ---

test("shows 'Edited filename' for completed str_replace command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Edited App.jsx")).toBeDefined();
});

test("shows 'Editing filename' for in-progress str_replace command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/App.jsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

// --- str_replace_editor: insert ---

test("shows 'Edited filename' for completed insert command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/utils/helpers.ts" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Edited helpers.ts")).toBeDefined();
});

// --- str_replace_editor: view ---

test("shows 'Viewed filename' for completed view command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "view", path: "/App.jsx" },
        state: "result",
        result: "file contents",
      }}
    />
  );

  expect(screen.getByText("Viewed App.jsx")).toBeDefined();
});

// --- str_replace_editor: undo_edit ---

test("shows 'Reverted filename' for completed undo_edit command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "undo_edit", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Reverted App.jsx")).toBeDefined();
});

// --- file_manager: rename ---

test("shows 'Renamed old → new' for completed rename command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "file_manager",
        args: {
          command: "rename",
          path: "/old/Header.jsx",
          new_path: "/components/Header.jsx",
        },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Renamed Header.jsx → Header.jsx")).toBeDefined();
});

test("shows 'Renaming old → new' for in-progress rename command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "file_manager",
        args: {
          command: "rename",
          path: "/old/Header.jsx",
          new_path: "/components/NavBar.jsx",
        },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Renaming Header.jsx → NavBar.jsx")).toBeDefined();
});

// --- file_manager: delete ---

test("shows 'Deleted filename' for completed delete command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "delete", path: "/temp/old-file.tsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Deleted old-file.tsx")).toBeDefined();
});

// --- Completed state shows green dot ---

test("shows green dot for completed tool invocation", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).not.toBeNull();
});

test("shows spinner for in-progress tool invocation", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByTestId("spinner")).toBeDefined();
});

// --- Fallback ---

test("falls back to tool name for unknown tool", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "some_unknown_tool",
        args: {},
        state: "result",
        result: "done",
      }}
    />
  );

  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

// --- Missing args ---

test("handles missing args gracefully", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: {} as Record<string, unknown>,
        state: "result",
        result: "Success",
      }}
    />
  );

  // Falls back to tool name when no command/path
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});
