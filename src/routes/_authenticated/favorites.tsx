import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CATEGORY_META, type Category } from "@/lib/tree-types";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: Favorites,
});

function Favorites() {
  const { user } = Route.useRouteContext() as { user: User };
  const { data: trees = [] } = useQuery({
    queryKey: ["favorites", user.id],
    queryFn: async () => (await supabase.from("trees").select("*").eq("author_id", user.id).eq("is_favorite", true).eq("is_deleted", false)).data ?? [],
  });
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Favorites</h1>
      {trees.length === 0 ? (
        <Card className="glass p-10 text-center text-sm text-muted-foreground">No favorites yet. Star trees from My Trees.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trees.map((t) => (
            <Link key={t.id} to="/tree/$id/build" params={{ id: t.id }}>
              <Card className="glass p-4 transition hover:-translate-y-0.5 hover:glow-primary">
                <div className="mb-2 text-xs">
                  <span className={`rounded-full bg-gradient-to-r ${CATEGORY_META[t.category as Category]?.color} px-2 py-0.5 font-medium text-white`}>
                    {CATEGORY_META[t.category as Category]?.short}
                  </span>
                </div>
                <div className="font-semibold">{t.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
