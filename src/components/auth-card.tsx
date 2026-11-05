import type { ReactNode } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";

export function AuthShell({ title, sub, children, footer }: { title: string; sub?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <i className="ri-wallet-3-line" />
          </span>
          <div>
            <div className="font-display text-lg leading-none">SBP</div>
            <div className="text-xs text-muted-foreground">Student Budget Planner</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <h1 className="font-display text-2xl">{title}</h1>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

export function SocialButtons() {
  const go = async (p: "google" | "lovable") => {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Sign-in failed");
  };
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" onClick={() => go("google")}>
        <span className="flex h-4 w-4 items-center justify-center"><i className="ri-google-fill" /></span>
        Continue with Google
      </Button>
      <button type="button" className="lovable-auth-button w-full" onClick={() => go("lovable")}>
        Continue with Lovable
      </button>
      <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
