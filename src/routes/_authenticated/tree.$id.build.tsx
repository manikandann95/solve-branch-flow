import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, MarkerType,
  type Connection, type Edge, type Node, BackgroundVariant,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TFNode } from "@/components/tree/TFNode";
import { NODE_META, type NodeKind, type TFNodeData, type TreeData } from "@/lib/tree-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowLeft, Play, Save, Plus, Settings, Loader2, Trash2, Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/tree/$id/build")({
  component: BuildPage,
});

const nodeTypes = { tf: TFNode };

function BuildPage() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}

function Builder() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: tree, isLoading } = useQuery({
    queryKey: ["tree", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trees").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const initial: TreeData = (tree?.tree_data as unknown as TreeData) ?? { nodes: [], edges: [] };
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!tree) return;
    setTitle(tree.title);
    setNodes(initial.nodes as unknown as Node[]);
    setEdges((initial.edges ?? []).map((e) => ({
      ...e,
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
    })) as unknown as Edge[]);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree?.id]);

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => addEdge({ ...c, type: "smoothstep", animated: true, label: "next",
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" } }, eds));
    setDirty(true);
  }, [setEdges]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaving(true);
      const cleanNodes = nodes.map((n) => ({ id: n.id, type: "tf", position: n.position, data: n.data as unknown as TFNodeData }));
      const cleanEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label as string | undefined }));
      const { error } = await supabase.from("trees").update({
        title,
        tree_data: { nodes: cleanNodes, edges: cleanEdges } as never,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { setDirty(false); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["tree", id] }); qc.invalidateQueries({ queryKey: ["trees"] }); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSaving(false),
  });

  function addNode(kind: NodeKind) {
    const id = `n${Date.now()}`;
    const base = selected ? { x: selected.position.x + 60, y: selected.position.y + 200 } : { x: 100, y: 100 };
    const newNode: Node = { id, type: "tf", position: base, data: { kind, title: `New ${NODE_META[kind].label.toLowerCase()}` } as unknown as Record<string, unknown> };
    setNodes((ns) => [...ns, newNode]);
    if (selected) {
      setEdges((es) => [...es, { id: `${selected.id}-${id}`, source: selected.id, target: id, type: "smoothstep", animated: true, label: "next", markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" } } as Edge]);
    }
    setSelected(newNode);
    setDirty(true);
  }

  function updateSelected(patch: Partial<TFNodeData>) {
    if (!selected) return;
    setNodes((ns) => ns.map((n) => n.id === selected.id ? { ...n, data: { ...(n.data as object), ...patch } as unknown as Record<string, unknown> } : n));
    setSelected((s) => s ? { ...s, data: { ...(s.data as object), ...patch } as unknown as Record<string, unknown> } : s);
    setDirty(true);
  }

  function deleteSelected() {
    if (!selected) return;
    setNodes((ns) => ns.filter((n) => n.id !== selected.id));
    setEdges((es) => es.filter((e) => e.source !== selected.id && e.target !== selected.id));
    setSelected(null);
    setDirty(true);
  }

  function exportJson() {
    const data = { title, tree_data: { nodes, edges } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const nodeKinds = useMemo(() => Object.keys(NODE_META) as NodeKind[], []);

  if (isLoading || !tree) {
    return <div className="grid h-screen place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl">
        <Link to="/trees"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          className="max-w-md border-0 bg-transparent text-lg font-semibold focus-visible:ring-0"
        />
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-warning">Unsaved</span>}
          <Button variant="ghost" size="sm" onClick={exportJson} className="gap-1"><Download className="h-3.5 w-3.5" /> Export</Button>
          <Link to="/tree/$id/navigate" params={{ id }}><Button variant="outline" size="sm" className="gap-1"><Play className="h-3.5 w-3.5" /> Walkthrough</Button></Link>
          <Link to="/tree/$id/settings" params={{ id }}><Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button></Link>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saving || !dirty} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Add-node palette */}
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5 rounded-xl border border-border bg-card/70 p-2 backdrop-blur-xl">
          {nodeKinds.map((k) => (
            <Button key={k} variant="ghost" size="sm" onClick={() => addNode(k)}
              className="h-8 justify-start gap-2 px-2 text-xs">
              <span>{NODE_META[k].icon}</span>{NODE_META[k].label}
              <Plus className="ml-auto h-3 w-3 opacity-60" />
            </Button>
          ))}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(c) => { onNodesChange(c); setDirty(true); }}
          onEdgesChange={(c) => { onEdgesChange(c); setDirty(true); }}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelected(n)}
          onPaneClick={() => setSelected(null)}
          onEdgeDoubleClick={(_, e) => {
            const label = prompt("Edge label", (e.label as string) ?? "");
            if (label !== null) {
              setEdges((es) => es.map((x) => x.id === e.id ? { ...x, label } : x));
              setDirty(true);
            }
          }}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="oklch(1 0 0 / 0.08)" />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap position="bottom-right" pannable zoomable maskColor="oklch(0.19 0.04 264 / 0.7)" nodeColor="#3B82F6" />
        </ReactFlow>

        {/* Right editor */}
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            {selected && (() => {
              const d = selected.data as unknown as TFNodeData;
              return (
                <>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <span>{NODE_META[d.kind].icon}</span> Edit node
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div>
                      <Label>Type</Label>
                      <div className="mt-1 grid grid-cols-3 gap-1">
                        {nodeKinds.map((k) => (
                          <button key={k}
                            onClick={() => updateSelected({ kind: k })}
                            className={`rounded-md border px-2 py-1.5 text-xs transition ${d.kind === k ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-accent"}`}>
                            <div>{NODE_META[k].icon}</div>
                            <div className="mt-0.5 text-[10px]">{NODE_META[k].label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="t">Title</Label>
                      <Input id="t" value={d.title} onChange={(e) => updateSelected({ title: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="d">Description (Markdown supported)</Label>
                      <Textarea id="d" rows={8} value={d.description ?? ""} onChange={(e) => updateSelected({ description: e.target.value })}
                        placeholder="Use `code` for commands, ```powershell code blocks``` for scripts…" className="font-mono text-xs" />
                    </div>
                    <Button variant="destructive" onClick={deleteSelected} className="w-full gap-2">
                      <Trash2 className="h-4 w-4" /> Delete node
                    </Button>
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
