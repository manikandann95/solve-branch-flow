import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { NODE_META, type TFNodeData } from "@/lib/tree-types";
import ReactMarkdown from "react-markdown";

function TFNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as TFNodeData;
  const meta = NODE_META[d.kind];
  const isTerminal = d.kind === "resolution" || d.kind === "escalation";
  const isStart = d.kind === "start";

  return (
    <div
      className={cn(
        "group relative w-72 rounded-xl border-2 p-3 backdrop-blur-md transition-all duration-200",
        meta.color,
        meta.border,
        "shadow-lg shadow-black/30",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]",
        "hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5",
      )}
    >
      {!isStart && (
        <Handle type="target" position={Position.Top} className="!bg-primary" />
      )}
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg leading-none">{meta.icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {meta.label}
        </span>
      </div>
      <div className="text-sm font-semibold leading-snug">{d.title}</div>
      {d.description && (
        <div className="mt-1.5 max-h-28 overflow-hidden text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[10px] [&_pre]:mt-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/50 [&_pre]:p-2 [&_pre]:text-[10px]">
          <ReactMarkdown>{d.description}</ReactMarkdown>
        </div>
      )}
      {!isTerminal && (
        <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      )}
    </div>
  );
}

export const TFNode = memo(TFNodeComponent);
