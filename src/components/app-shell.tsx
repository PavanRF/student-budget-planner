import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/hooks/use-sbp";
import { ConfirmDialog, Icon } from "@/components/kit";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { currentMonthKey, dueRules, initials, monthLabel, ruleDate } from "@/lib/sbp";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: "ri-dashboard-3-line" },
  { to: "/income", label: "Income", icon: "ri-arrow-down-circle-line" },
  { to: "/expenses", label: "Expenses", icon: "ri-arrow-up-circle-line" },
  { to: "/recurring", label: "Recurring", icon: "ri-repeat-2-line" },
  { to: "/budgets", label: "Budgets", icon: "ri-pie-chart-2-line" },
  { to: "/savings", label: "Savings Goals", icon: "ri-safe-2-line" },
  { to: "/statement", label: "Statement", icon: "ri-file-list-3-line" },
  { to: "/assistant", label: "AI Coach", icon: "ri-sparkling-2-line" },
  { to: "/settings", label: "Settings", icon: "ri-settings-3-line" },
] as const;

function useRecurringEngine() {
  const qc = useQueryClient();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const { data: rules, error } = await supabase.from("recurring_rules").select("*").eq("is_active", true);
      if (error || !rules) return;
      const today = new Date();
      const due = dueRules(rules, today);
      let logged = 0;
      for (const r of due) {
        const date = ruleDate(r.day_of_month, today);
        // claim the rule for this month first so concurrent tabs don't double-log
        const { data: claimed } = await supabase
          .from("recurring_rules")
          .update({ last_logged_date: date })
          .eq("id", r.id)
          .or(`last_logged_date.is.null,last_logged_date.lt.${currentMonthKey()}-01`)
          .select("id");
        if (!claimed?.length) continue;
        const res =
          r.type === "income"
            ? await supabase.from("income").insert({ amount: r.amount, source: r.category_or_source, description: r.description, transaction_date: date, is_recurring: true })
            : await supabase.from("expenses").insert({ amount: r.amount, category: r.category_or_source, description: r.description, transaction_date: date, is_recurring: true });
        if (!res.error) logged++;
      }
      if (logged) {
        qc.invalidateQueries();
        toast.success(`Logged ${logged} recurring ${logged === 1 ? "entry" : "entries"} for this month`);
      }
    })();
  }, [qc]);
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useSession();
  const { data: profile } = useProfile();
  const [confirm, setConfirm] = useState(false);
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/login", replace: true });
  };
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <i className="ri-wallet-3-line" />
        </span>
        <div>
          <div className="font-display text-lg leading-none">SBP</div>
          <div className="text-xs text-sidebar-foreground/60">Student Budget Planner</div>
        </div>
      </div>
      <div className="px-5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/50">Workspace</div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((n) => {
          const active = n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon name={n.icon} /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {initials(profile?.full_name, user?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.full_name || "Student"}</div>
            <div className="truncate text-xs text-sidebar-foreground/60">{user?.email}</div>
          </div>
          <button onClick={() => setConfirm(true)} aria-label="Sign out" className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar hover:text-sidebar-foreground">
            <Icon name="ri-logout-box-r-line" />
          </button>
        </div>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Sign out?" body="You can sign back in anytime." confirmLabel="Sign out" onConfirm={signOut} />
    </div>
  );
}

export function AppShell() {
  useRecurringEngine();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const { data: user } = useSession();
  const { data: profile } = useProfile();
  const section = NAV.find((n) => (n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to)))?.label ?? "SBP";
  return (
    <div className="min-h-screen bg-background">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-[264px] lg:block">
        <SidebarBody />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[264px] border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-[264px] print:pl-0">
        <header className="no-print sticky top-0 z-30 border-b bg-background/75 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-5">
            <button className="rounded-md p-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Icon name="ri-menu-line" />
            </button>
            <div className="font-medium">{section}</div>
            <div className="text-sm text-muted-foreground">· {monthLabel(currentMonthKey())}</div>
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" /> Live data
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials(profile?.full_name, user?.email)}
              </span>
            </div>
          </div>
        </header>
        <main className="print-full mx-auto max-w-[1240px] space-y-6 px-5 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
