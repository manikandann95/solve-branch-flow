import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GitBranch, Sparkles, Workflow, ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [nav]);

  if (checking) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-action/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/20 text-primary">
            <GitBranch className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">TroubleshootFlow</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" /> For L1 & L2 IT support engineers
        </div>
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          Diagnose faster with
          <span className="block bg-gradient-to-r from-primary via-info to-action bg-clip-text text-transparent">
            visual decision trees
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Build, share, and walk through interactive troubleshooting flows for Windows 11,
          Azure Entra ID, Windows Server, and Active Directory — all in one enterprise-grade workspace.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">Browse templates</Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            { icon: Workflow, title: "Visual builder", desc: "Drag-and-drop canvas with pannable/zoomable flow, animated connections, and a minimap." },
            { icon: Sparkles, title: "35+ templates", desc: "Real-world diagnostic flows across Windows, Entra, Server, and AD — ready to use." },
            { icon: ShieldCheck, title: "Guided walkthrough", desc: "Step-by-step mode for engineers actively resolving tickets, with breadcrumb trail." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 text-left">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
