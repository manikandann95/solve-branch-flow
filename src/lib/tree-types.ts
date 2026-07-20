// Node data types for tree_data JSONB
export type NodeKind = "start" | "question" | "action" | "info" | "resolution" | "escalation";
export type Category = "windows-11" | "azure-entra" | "windows-server" | "active-directory";
export type Difficulty = "L1" | "L2";

export interface TFNodeData {
  kind: NodeKind;
  title: string;
  description?: string;
  category?: Category;
  difficulty?: Difficulty;
  links?: { label: string; url: string }[];
  [key: string]: unknown;
}

export interface TFNode {
  id: string;
  type: "tf";
  position: { x: number; y: number };
  data: TFNodeData;
}

export interface TFEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface TreeData {
  nodes: TFNode[];
  edges: TFEdge[];
}

export const CATEGORY_META: Record<Category, { label: string; color: string; short: string }> = {
  "windows-11": { label: "Windows 11", color: "from-sky-500 to-blue-600", short: "Win11" },
  "azure-entra": { label: "Azure Entra ID", color: "from-cyan-500 to-teal-600", short: "Entra" },
  "windows-server": { label: "Windows Server", color: "from-violet-500 to-purple-600", short: "Server" },
  "active-directory": { label: "Active Directory", color: "from-amber-500 to-orange-600", short: "AD" },
};

export const NODE_META: Record<NodeKind, { label: string; icon: string; color: string; border: string }> = {
  start:       { label: "Start",       icon: "🚀", color: "bg-primary/15",   border: "border-primary/60" },
  question:    { label: "Question",    icon: "❓", color: "bg-secondary",    border: "border-border" },
  action:      { label: "Action",      icon: "⚙️", color: "bg-action/15",    border: "border-action/60" },
  info:        { label: "Info",        icon: "ℹ️", color: "bg-info/15",      border: "border-info/60" },
  resolution:  { label: "Resolution",  icon: "✅", color: "bg-success/15",   border: "border-success/60" },
  escalation:  { label: "Escalation",  icon: "🔺", color: "bg-destructive/15", border: "border-destructive/60" },
};
