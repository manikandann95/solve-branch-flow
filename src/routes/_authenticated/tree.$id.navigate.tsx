import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NODE_META, type TFNode, type TFNodeData, type TreeData } from "@/lib/tree-types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, ChevronRight, Home } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tree/$id/navigate")({
  component: NavigatePage,
});

function NavigatePage() {
  const { id } = Route.useParams();
  const { data: tree } = useQuery({
    queryKey: ["tree", id],
    queryFn: async () => (await supabase.from("trees").select("*").eq("id", id).single()).data,
  });

  const treeData = (tree?.tree_data as unknown as TreeData) ?? { nodes: [], edges: [] };

  // Find start node
  const startId = useMemo(() => {
    const s = treeData.nodes.find((n) => (n.data as TFNodeData).kind === "start");
    return s?.id ?? treeData.nodes[0]?.id;
  }, [treeData]);

  const [path, setPath] = useState<string[]>([]);
  const currentId = path[path.length - 1] ?? startId;
  const current = treeData.nodes.find((n) => n.id === currentId);
  const outgoing = treeData.edges.filter((e) => e.source === currentId);

  const depth = path.length;
  const isTerminal = current && ((current.data as TFNodeData).kind === "resolution" || (current.data as TFNodeData).kind === "escalation");

  function choose(target: string) {
    setPath((p) => [...p, target]);
  }
  function reset() { setPath([]); }
  function goTo(idx: number) { setPath((p) => p.slice(0, idx)); }

  if (!tree) return <div className="grid h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!current) return <div className="grid h-screen place-items-center text-muted-foreground">Empty tree.</div>;

  const d = current.data as TFNodeData;
  const meta = NODE_META[d.kind];

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 flex h-14 items-center gap-3 border-b border-border bg-background/60 px-4 backdrop-blur-xl">
        <Link to="/tree/$id/build" params={{ id }}>
          <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back to editor</Button>
        </Link>
        <div className="ml-2 truncate text-sm font-semibold">{tree.title}</div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Step {depth + 1} · Depth {depth}
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1"><RotateCcw className="h-3 w-3" /> Start over</Button>
      </div>

      {/* Breadcrumb */}
      <div className="relative z-10 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/40 px-4 py-2 text-xs">
        <button onClick={reset} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent">
          <Home className="h-3 w-3" /> Start
        </button>
        {path.map((pid, i) => {
          const n = treeData.nodes.find((x) => x.id === pid);
          if (!n) return null;
          return (
            <div key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <button onClick={() => goTo(i + 1)} className="max-w-32 truncate rounded px-2 py-1 hover:bg-accent">
                {(n.data as TFNodeData).title}
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentId}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-2xl"
          >
            <Card className={`glass overflow-hidden border-2 p-8 ${meta.border}`}>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-3xl">{meta.icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {meta.label}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{d.title}</h2>
              {d.description && (
                <div className="prose prose-invert mt-4 max-w-none text-sm text-muted-foreground [&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:mt-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/60 [&_pre]:p-4 [&_pre]:text-xs">
                  <ReactMarkdown>{d.description}</ReactMarkdown>
                </div>
              )}

              {isTerminal ? (
                <div className="mt-8 space-y-3">
                  <div className={`rounded-lg border p-4 ${meta.border} ${meta.color}`}>
                    <div className="font-semibold">
                      {d.kind === "resolution" ? "✅ Issue resolved" : "🔺 Escalation required"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Path taken: {path.length} step{path.length === 1 ? "" : "s"}.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" /> Start over</Button>
                    <Link to="/dashboard" className="flex-1"><Button variant="outline" className="w-full">Back to dashboard</Button></Link>
                  </div>
                </div>
              ) : outgoing.length === 0 ? (
                <div className="mt-8 text-sm text-muted-foreground">
                  No further branches. <button onClick={reset} className="text-primary hover:underline">Start over</button>.
                </div>
              ) : (
                <div className="mt-8 grid gap-2">
                  {outgoing.map((e) => {
                    const target = treeData.nodes.find((n) => n.id === e.target);
                    return (
                      <button
                        key={e.id}
                        onClick={() => choose(e.target)}
                        className="group flex items-center justify-between rounded-lg border border-border bg-card/50 p-4 text-left transition hover:border-primary hover:bg-primary/10"
                      >
                        <div>
                          {e.label && <div className="text-xs uppercase tracking-wider text-primary">{e.label}</div>}
                          <div className="mt-0.5 text-sm font-medium">{target ? (target.data as TFNodeData).title : "…"}</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
