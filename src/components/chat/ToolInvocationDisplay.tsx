import { Loader2 } from "lucide-react";

interface ToolInvocationDisplayProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, unknown>;
    state: string;
    result?: unknown;
  };
}

function getFilename(path: unknown): string {
  if (typeof path !== "string") return "";
  return path.split("/").pop() || path;
}

function getToolMessage(
  toolName: string,
  args: Record<string, unknown>,
  completed: boolean
): string {
  const filename = getFilename(args.path);
  const command = args.command as string | undefined;

  if (toolName === "str_replace_editor" && filename) {
    switch (command) {
      case "create":
        return completed ? `Created ${filename}` : `Creating ${filename}`;
      case "str_replace":
        return completed ? `Edited ${filename}` : `Editing ${filename}`;
      case "insert":
        return completed ? `Edited ${filename}` : `Editing ${filename}`;
      case "view":
        return completed ? `Viewed ${filename}` : `Viewing ${filename}`;
      case "undo_edit":
        return completed ? `Reverted ${filename}` : `Reverting ${filename}`;
    }
  }

  if (toolName === "file_manager" && filename) {
    const newFilename = getFilename(args.new_path);
    switch (command) {
      case "rename":
        return completed
          ? `Renamed ${filename} → ${newFilename}`
          : `Renaming ${filename} → ${newFilename}`;
      case "delete":
        return completed ? `Deleted ${filename}` : `Deleting ${filename}`;
    }
  }

  return toolName;
}

export function ToolInvocationDisplay({
  toolInvocation,
}: ToolInvocationDisplayProps) {
  const { toolName, args, state, result } = toolInvocation;
  const completed = state === "result" && result != null;
  const message = getToolMessage(toolName, args ?? {}, completed);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {completed ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
