import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { TEMPLATES } from "@/lib/templates";
import { CATEGORY_META, type Category } from "@/lib/tree-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, LibraryBig } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const searchSchema = z.object({ category: z.string().optional() });

export const Route = createFileRoute("/_authenticated/templates")({
  validateSearch: searchSchema,
  component: TemplatesPage,
});

function TemplatesPage() {
  const { user } = Route.useRouteContext() as { user: User };
  const { category } = Route.useSearch();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(category ?? "all");

  const filtered = TEMPLATES.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    if (q && !`${t.title} ${t.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function useTemplate(slug: string) {
    const tpl = TEMPLATES.find((t) => t.slug === slug);
    if (!tpl) return;
    const { data, error } = await supabase.from("trees").insert({
      title: tpl.title, description: tpl.description,
      category: tpl.category, difficulty: tpl.difficulty,
      author_id: user.id,
      tree_data: tpl.tree as never,
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Template cloned to your workspace");
    nav({ to: "/tree/$id/build", params: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/20 text-primary">
          <LibraryBig className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Library</h1>
          <p className="text-sm text-muted-foreground">
            {TEMPLATES.length} pre-built decision trees for real-world IT issues
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.slug} className="glass flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className={`rounded-full bg-gradient-to-r ${CATEGORY_META[t.category as Category].color} px-2 py-0.5 font-medium text-white`}>
                {CATEGORY_META[t.category as Category].short}
              </span>
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{t.difficulty}</span>
            </div>
            <div className="line-clamp-2 font-semibold">{t.title}</div>
            <div className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{t.description}</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{t.tree.nodes.length} nodes</span>
              <Button size="sm" onClick={() => useTemplate(t.slug)}>Use template</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
