import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Play, Star } from "lucide-react";
import { CATEGORY_META, type Category } from "@/lib/tree-types";
import { toast } from "sonner";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/trees")({
  component: TreesList,
});

function TreesList() {
  const { user } = Route.useRouteContext() as { user: User };
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const { data: trees = [] } = useQuery({
    queryKey: ["trees", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .eq("author_id", user.id)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = trees.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    if (q && !`${t.title} ${t.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function trash(id: string) {
    const { error } = await supabase.from("trees").update({ is_deleted: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Moved to trash");
    qc.invalidateQueries({ queryKey: ["trees"] });
  }
  async function favorite(id: string, val: boolean) {
    await supabase.from("trees").update({ is_favorite: val }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["trees"] });
  }
  async function newTree() {
    const { data, error } = await supabase
      .from("trees").insert({
        title: "Untitled tree", description: "", category: "windows-11",
        difficulty: "L1", author_id: user.id,
        tree_data: { nodes: [{ id: "n1", type: "tf", position: { x: 0, y: 0 }, data: { kind: "start", title: "Start here" } }], edges: [] },
      }).select("id").single();
    if (error) return toast.error(error.message);
    nav({ to: "/tree/$id/build", params: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Trees</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {trees.length} trees</p>
        </div>
        <Button onClick={newTree} className="gap-2"><Plus className="h-4 w-4" /> New tree</Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search trees…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card/40 p-1">
          {[["all", "All"], ...Object.entries(CATEGORY_META).map(([k, v]) => [k, v.short])].map(([k, l]) => (
            <button key={k} onClick={() => setCat(k as string)}
              className={`rounded-md px-3 py-1 text-xs transition ${cat === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass p-10 text-center text-sm text-muted-foreground">
          {trees.length === 0 ? "No trees yet — create one or clone a template." : "No matches."}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="glass p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className={`rounded-full bg-gradient-to-r ${CATEGORY_META[t.category as Category]?.color} px-2 py-0.5 font-medium text-white`}>
                  {CATEGORY_META[t.category as Category]?.short}
                </span>
                <button onClick={() => favorite(t.id, !t.is_favorite)}>
                  <Star className={`h-4 w-4 ${t.is_favorite ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                </button>
              </div>
              <Link to="/tree/$id/build" params={{ id: t.id }}>
                <div className="line-clamp-1 font-semibold hover:text-primary">{t.title}</div>
              </Link>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description || "No description"}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{new Date(t.updated_at).toLocaleDateString()}</span>
                <div className="flex gap-1">
                  <Link to="/tree/$id/navigate" params={{ id: t.id }}>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"><Play className="h-3 w-3" /> Walk</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => trash(t.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
