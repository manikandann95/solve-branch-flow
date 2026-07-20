import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LibraryBig, FolderGit2, Sparkles, ArrowRight } from "lucide-react";
import { CATEGORY_META, type Category } from "@/lib/tree-types";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext() as { user: User };
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: trees = [] } = useQuery({
    queryKey: ["trees", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("id,title,description,category,difficulty,updated_at,is_favorite")
        .eq("author_id", user.id)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const byCategory = (trees ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});
  const totalNodes = trees.length * 8; // heuristic estimate

  async function newTree() {
    const { data, error } = await supabase
      .from("trees")
      .insert({
        title: "Untitled tree",
        description: "",
        category: "windows-11" as Category,
        difficulty: "L1",
        author_id: user.id,
        tree_data: {
          nodes: [{ id: "n1", type: "tf", position: { x: 0, y: 0 }, data: { kind: "start", title: "Start here", description: "Describe the symptom or issue category." } }],
          edges: [],
        },
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["trees"] });
    nav({ to: "/tree/$id/build", params: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Hero */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Dashboard</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Welcome back, {user.email?.split("@")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build decision trees, browse templates, or resume a troubleshooting flow.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={newTree} className="gap-2"><Plus className="h-4 w-4" /> New tree</Button>
          <Link to="/templates"><Button variant="outline" className="gap-2"><LibraryBig className="h-4 w-4" /> Templates</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Total trees" value={trees.length} accent="from-primary to-info" />
        <StatCard label="Est. nodes" value={totalNodes} accent="from-action to-primary" />
        <StatCard label="Categories used" value={Object.keys(byCategory).length} accent="from-success to-info" />
      </div>

      {/* Categories */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Browse by category
      </h2>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
          <Link key={c} to="/templates" search={{ category: c }} className="group">
            <Card className="glass overflow-hidden p-0 transition hover:-translate-y-0.5 hover:glow-primary">
              <div className={`h-24 bg-gradient-to-br ${CATEGORY_META[c].color} opacity-90`} />
              <div className="p-4">
                <div className="text-sm font-semibold">{CATEGORY_META[c].label}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{byCategory[c] ?? 0} trees</span>
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent trees */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent trees</h2>
        <Link to="/trees" className="text-xs text-primary hover:underline">View all →</Link>
      </div>
      {trees.length === 0 ? (
        <Card className="glass flex flex-col items-center gap-3 p-10 text-center">
          <Sparkles className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">No trees yet. Start from a template or create your own.</p>
          <div className="flex gap-2">
            <Link to="/templates"><Button variant="outline">Browse templates</Button></Link>
            <Button onClick={newTree}>New tree</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trees.slice(0, 6).map((t) => (
            <Link key={t.id} to="/tree/$id/build" params={{ id: t.id }}>
              <Card className="glass group h-full p-4 transition hover:-translate-y-0.5 hover:glow-primary">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className={`rounded-full bg-gradient-to-r ${CATEGORY_META[t.category as Category]?.color ?? "from-primary to-info"} px-2 py-0.5 font-medium text-white`}>
                    {CATEGORY_META[t.category as Category]?.short ?? t.category}
                  </span>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{t.difficulty}</span>
                </div>
                <div className="line-clamp-1 font-semibold">{t.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description || "No description"}</div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Updated {new Date(t.updated_at).toLocaleDateString()}</span>
                  <FolderGit2 className="h-3 w-3" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="glass relative overflow-hidden p-5">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
