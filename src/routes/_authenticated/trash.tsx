import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, RotateCcw } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/trash")({
  component: Trash,
});

function Trash() {
  const { user } = Route.useRouteContext() as { user: User };
  const qc = useQueryClient();
  const { data: trees = [] } = useQuery({
    queryKey: ["trees-trash", user.id],
    queryFn: async () => (await supabase.from("trees").select("*").eq("author_id", user.id).eq("is_deleted", true)).data ?? [],
  });
  async function restore(id: string) {
    await supabase.from("trees").update({ is_deleted: false }).eq("id", id);
    toast.success("Restored");
    qc.invalidateQueries();
  }
  async function purge(id: string) {
    await supabase.from("trees").delete().eq("id", id);
    toast.success("Deleted permanently");
    qc.invalidateQueries();
  }
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Trash</h1>
      {trees.length === 0 ? (
        <Card className="glass p-10 text-center text-sm text-muted-foreground">Trash is empty.</Card>
      ) : trees.map((t) => (
        <Card key={t.id} className="glass mb-2 flex items-center justify-between p-3">
          <div>
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-muted-foreground">{t.category}</div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => restore(t.id)}><RotateCcw className="mr-1 h-3 w-3" /> Restore</Button>
            <Button size="sm" variant="ghost" onClick={() => purge(t.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
          </div>
        </Card>
      ))}
      <Link to="/trees" className="text-xs text-primary hover:underline">← Back to My Trees</Link>
    </div>
  );
}
