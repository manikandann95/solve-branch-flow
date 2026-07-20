import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { CATEGORY_META } from "@/lib/tree-types";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tree/$id/settings")({
  component: Settings,
});

function Settings() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: tree } = useQuery({
    queryKey: ["tree", id],
    queryFn: async () => (await supabase.from("trees").select("*").eq("id", id).single()).data,
  });
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("windows-11");
  const [difficulty, setDifficulty] = useState("L1");

  useEffect(() => {
    if (!tree) return;
    setTitle(tree.title); setDesc(tree.description ?? "");
    setCategory(tree.category); setDifficulty(tree.difficulty);
  }, [tree]);

  async function save() {
    const { error } = await supabase.from("trees").update({ title, description: desc, category, difficulty }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries();
  }
  async function del() {
    if (!confirm("Move to trash?")) return;
    await supabase.from("trees").update({ is_deleted: true }).eq("id", id);
    toast.success("Moved to trash");
    nav({ to: "/trees" });
  }
  function copyLink() {
    navigator.clipboard.writeText(window.location.origin + `/tree/${id}/navigate`);
    toast.success("Walkthrough link copied");
  }

  if (!tree) return <div className="grid h-screen place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link to="/tree/$id/build" params={{ id }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to builder
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Tree settings</h1>

      <Card className="glass space-y-4 p-6">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="L1">L1</SelectItem>
                <SelectItem value="L2">L2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save}>Save changes</Button>
          <Button variant="outline" onClick={copyLink} className="gap-1"><Copy className="h-3 w-3" /> Copy share link</Button>
        </div>
      </Card>

      <Card className="glass mt-6 border-destructive/40 p-6">
        <div className="mb-3 font-semibold text-destructive">Danger zone</div>
        <Button variant="destructive" onClick={del} className="gap-2"><Trash2 className="h-4 w-4" /> Move to trash</Button>
      </Card>
    </div>
  );
}
