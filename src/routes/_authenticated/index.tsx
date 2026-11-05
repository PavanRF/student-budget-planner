import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHead, EmptyBlock, ErrorBlock, Icon, LoadingBlock, MicroLabel, Money, ProgressBar, Ring, StatTile, useMoney } from "@/components/kit";
import { TransactionDialog } from "@/components/transactions-page";
import { useProfile, useTable } from "@/hooks/use-sbp";
import { EXPENSE_CATEGORIES, computePace, currentMonthKey, formatDate, greeting, iconFor, lastMonths, monthKey, monthLabel, monthStart, shiftMonth, sum } from "@/lib/sbp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SBP Student Budget Planner" },
      { name: "description", content: "Your month at a glance: income, spending pace, budgets and savings." },
      { property: "og:title", content: "Dashboard — SBP" },
      { property: "og:description", content: "Your month at a glance." },
    ],
  }),
  component: Dashboard,
});

const PIE_COLORS = ["var(--p-700)", "var(--a-500)", "var(--s-500)", "var(--p-400)", "var(--a-300)", "var(--f-500)", "var(--s-300)", "var(--p-200)"];

function Dashboard() {
  const profile = useProfile();
  const income = useTable("income");
  const expenses = useTable("expenses");
  const budgets = useTable("budgets");
  const goals = useTable("savings_goals");
  const fmt = useMoney();
  const [dlg, setDlg] = useState<"income" | "expenses" | null>(null);
  const mk = currentMonthKey();
  const prev = shiftMonth(mk, -1);

  const loading = [profile, income, expenses, budgets, goals].some((q) => q.isLoading);
  const failed = [profile, income, expenses, budgets, goals].find((q) => q.isError);

  const d = useMemo(() => {
    const inc = income.data ?? [];
    const exp = expenses.data ?? [];
    const mInc = inc.filter((r) => monthKey(r.transaction_date) === mk);
    const mExp = exp.filter((r) => monthKey(r.transaction_date) === mk);
    const pExp = exp.filter((r) => monthKey(r.transaction_date) === prev);
    const mBud = (budgets.data ?? []).filter((b) => b.month === monthStart(mk));
    const catSpend = (rows: typeof exp) => {
      const m = new Map<string, number>();
      rows.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount)));
      return m;
    };
    const cur = catSpend(mExp);
    const pr = catSpend(pExp);
    const incomeTotal = sum(mInc, (r) => r.amount);
    const expTotal = sum(mExp, (r) => r.amount);
    const limits = sum(mBud, (b) => b.limit_amount);
    const pace = computePace({
      monthKey: mk,
      today: new Date(),
      budgetLimitsTotal: limits,
      profileMonthlyBudget: Number(profile.data?.monthly_budget ?? 0),
      monthIncome: incomeTotal,
      spent: expTotal,
    });
    const six = lastMonths(6).reverse().map((m) => ({
      month: monthLabel(m, "short").split(" ")[0],
      Income: sum(inc.filter((r) => monthKey(r.transaction_date) === m), (r) => r.amount),
      Expenses: sum(exp.filter((r) => monthKey(r.transaction_date) === m), (r) => r.amount),
    }));
    const recent = [
      ...mInc.map((r) => ({ id: r.id, label: r.source, note: r.description, date: r.transaction_date, created: r.created_at, amt: Number(r.amount) })),
      ...mExp.map((r) => ({ id: r.id, label: r.category, note: r.description, date: r.transaction_date, created: r.created_at, amt: -Number(r.amount) })),
    ]
      .sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created))
      .slice(0, 6);
    const budgetRows = mBud
      .map((b) => ({ cat: b.category, limit: Number(b.limit_amount), spent: cur.get(b.category) ?? 0 }))
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit);
    const budgetSpent = sum(budgetRows, (r) => r.spent);
    return {
      incomeTotal,
      expTotal,
      catCount: cur.size,
      cur,
      pr,
      prevTotal: sum(pExp, (r) => r.amount),
      pace,
      six,
      recent,
      limits,
      budgetRows,
      budgetSpent,
      pie: [...cur.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
      hasAny: inc.length + exp.length > 0,
      hasBudgets: (budgets.data ?? []).length > 0,
    };
  }, [income.data, expenses.data, budgets.data, profile.data, mk, prev]);

  const activeGoals = (goals.data ?? []).filter((g) => Number(g.saved_amount) < Number(g.target_amount));
  const totalSaved = sum(goals.data ?? [], (g) => g.saved_amount);
  const name = profile.data?.full_name?.split(" ")[0];

  if (loading)
    return (
      <div className="space-y-6">
        <LoadingBlock rows={2} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <LoadingBlock key={i} rows={2} />)}</div>
        <LoadingBlock rows={4} />
      </div>
    );
  if (failed) return <ErrorBlock onRetry={() => [profile, income, expenses, budgets, goals].forEach((q) => q.refetch())} />;

  const net = d.incomeTotal - d.expTotal;
  const p = d.pace;
  const spentPct = p.plan > 0 ? (d.expTotal / p.plan) * 100 : 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <MicroLabel>{monthLabel(mk)}</MicroLabel>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
            {greeting()}{name ? `, ${name}` : ""}.
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDlg("income")}><Icon name="ri-add-line" /> Add Income</Button>
          <Button onClick={() => setDlg("expenses")}><Icon name="ri-add-line" /> Add Expense</Button>
        </div>
      </div>

      {!d.hasAny && (
        <Card className="border-primary-200 bg-primary-50">
          <MicroLabel>Getting started</MicroLabel>
          <h2 className="mt-1 font-display text-xl">Three small steps and your month comes into focus.</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { n: 1, t: "Log what's coming in", b: "Allowance, scholarship, pay.", a: <Button size="sm" onClick={() => setDlg("income")}>Add income</Button> },
              { n: 2, t: "Set a few limits", b: "Food, rent, travel — whatever matters.", a: <Button size="sm" variant="outline" asChild><Link to="/budgets">Set budgets</Link></Button> },
              { n: 3, t: "Automate the regulars", b: "Rent or allowance on the same day each month.", a: <Button size="sm" variant="outline" asChild><Link to="/recurring">Add recurring</Link></Button> },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border bg-card p-4">
                <div className="text-xs font-semibold text-primary">Step {s.n}</div>
                <div className="mt-1 font-medium">{s.t}</div>
                <p className="mb-3 text-sm text-muted-foreground">{s.b}</p>
                {s.a}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Monthly income" value={fmt(d.incomeTotal)} tone="primary" icon="ri-arrow-down-circle-line" />
        <StatTile label="Monthly expenses" value={fmt(d.expTotal)} hint={`${d.catCount} ${d.catCount === 1 ? "category" : "categories"}`} icon="ri-arrow-up-circle-line" />
        <StatTile label="Net remaining" value={fmt(net)} tone={net < 0 ? "accent" : "primary"} icon="ri-scales-3-line" />
        <StatTile label="Total savings" value={fmt(totalSaved)} hint={`${activeGoals.length} active ${activeGoals.length === 1 ? "goal" : "goals"}`} icon="ri-safe-2-line" />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <MicroLabel>Spending pace</MicroLabel>
            <h2 className="mt-1 font-display text-lg">
              Day {p.day} of {p.days} · {Math.round(p.elapsed * 100)}% of month elapsed
            </h2>
          </div>
          {p.plan > 0 && (
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold tabular-nums", p.status === "ahead" ? "bg-accent-100 text-accent-700" : p.status === "under" ? "bg-primary-100 text-primary-800" : "bg-secondary text-secondary-foreground")}>
              {p.status === "ahead" ? `${fmt(p.diff)} ahead of pace` : p.status === "under" ? `${fmt(-p.diff)} under pace` : "Right on pace"}
            </span>
          )}
        </div>
        {p.plan > 0 ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><MicroLabel>Should be at</MicroLabel><div className="mt-1 font-display text-2xl tabular-nums">{fmt(p.shouldBe)}</div></div>
              <div><MicroLabel>You're at</MicroLabel><div className={cn("mt-1 font-display text-2xl tabular-nums", p.status === "ahead" && "text-accent")}>{fmt(d.expTotal)}</div></div>
              <div><MicroLabel>Plan</MicroLabel><div className="mt-1 font-display text-2xl tabular-nums">{fmt(p.plan)}</div><div className="text-xs text-muted-foreground">from {p.planSource}</div></div>
            </div>
            <ProgressBar className="mt-5 h-3" pct={spentPct} over={d.expTotal > p.plan} pin={p.elapsed * 100} />
            <p className="mt-3 text-sm text-muted-foreground">
              {p.left >= 0
                ? `Leaves ${fmt(p.perDay)}/day for the remaining ${p.remainingDays} ${p.remainingDays === 1 ? "day" : "days"}.`
                : `Over by ${fmt(p.remainingDays > 0 ? -p.left / p.remainingDays : -p.left)}${p.remainingDays > 0 ? "/day" : ""} across the rest of the month.`}
            </p>
          </>
        ) : (
          <EmptyBlock icon="ri-speed-line" title="No plan to pace against yet" body="Add income, set category limits, or a monthly target in Settings." action={<Button size="sm" asChild><Link to="/budgets">Set a budget</Link></Button>} />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHead label="Last 6 months" title="Income vs. expenses" />
          {d.six.some((m) => m.Income || m.Expenses) ? (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={d.six} barGap={4}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="Income" fill="var(--p-600)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="var(--a-400)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyBlock icon="ri-bar-chart-2-line" title="No history yet" body="Bars appear as you log income and expenses." />
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHead label="This month" title="Where it went" />
          {d.pie.length ? (
            <div className="flex items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={d.pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none">
                      {d.pie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1.5 text-sm">
                {d.pie.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round((s.value / d.expTotal) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyBlock icon="ri-pie-chart-line" title="Nothing spent yet this month" />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHead label="Budgets" title="Budget utilisation" right={<Link to="/budgets" className="text-sm text-primary hover:underline">Manage</Link>} />
          {d.budgetRows.length ? (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span><Money value={d.budgetSpent} className="font-semibold" /> <span className="text-muted-foreground">of {fmt(d.limits)}</span></span>
                <span className="tabular-nums font-semibold">{Math.round((d.budgetSpent / d.limits) * 100)}%</span>
              </div>
              <ProgressBar className="mt-2" pct={(d.budgetSpent / d.limits) * 100} over={d.budgetSpent > d.limits} />
              <ul className="mt-5 space-y-3">
                {d.budgetRows.slice(0, 4).map((r) => (
                  <li key={r.cat}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <Icon name={iconFor(r.cat)} className="text-foreground/60" />
                      <span className="flex-1">{r.cat}</span>
                      <span className="tabular-nums text-muted-foreground">{fmt(r.spent)} / {fmt(r.limit)}</span>
                    </div>
                    <ProgressBar pct={(r.spent / r.limit) * 100} over={r.spent > r.limit} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyBlock icon="ri-pie-chart-2-line" title="No limits for this month" action={<Button size="sm" asChild><Link to="/budgets">Add a limit</Link></Button>} />
          )}
        </Card>
        <Card>
          <CardHead label="Savings" title="Goals in progress" right={<Link to="/savings" className="text-sm text-primary hover:underline">All goals</Link>} />
          {(goals.data ?? []).length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {(goals.data ?? []).slice(0, 6).map((g) => (
                <Link key={g.id} to="/savings" className="flex flex-col items-center gap-2 rounded-lg p-2 text-center hover:bg-muted">
                  <Ring pct={(Number(g.saved_amount) / Number(g.target_amount)) * 100} />
                  <div className="text-sm font-medium">{g.name}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{fmt(Number(g.saved_amount))} / {fmt(Number(g.target_amount))}</div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock icon="ri-safe-2-line" title="No savings goals yet" action={<Button size="sm" asChild><Link to="/savings">Create a goal</Link></Button>} />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHead label="This month" title="Recent transactions" />
          {d.recent.length ? (
            <ul className="divide-y">
              {d.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", r.amt > 0 ? "bg-primary-50 text-primary-700" : "bg-muted text-foreground/70")}>
                    <i className={iconFor(r.label)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.note || "No note"} · {formatDate(r.date)}</div>
                  </div>
                  <Money value={r.amt} signed className={cn("text-sm font-semibold", r.amt > 0 && "text-primary")} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock icon="ri-exchange-line" title="No transactions this month" action={<Button size="sm" onClick={() => setDlg("expenses")}>Add expense</Button>} />
          )}
        </Card>
        <Card>
          <CardHead
            label={`vs ${monthLabel(prev)}`}
            title="Month over month"
            right={
              d.prevTotal > 0 ? (
                <DeltaBadge cur={d.expTotal} prev={d.prevTotal} />
              ) : undefined
            }
          />
          <p className="mb-4 text-sm text-muted-foreground">
            {d.prevTotal > 0
              ? `You've spent ${fmt(d.expTotal)} so far, against ${fmt(d.prevTotal)} all of last month.`
              : "No spending recorded last month to compare against."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <div key={c.name} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <Icon name={c.icon} className="text-foreground/60" />
                <span className="flex-1 truncate">{c.name}</span>
                <DeltaBadge cur={d.cur.get(c.name) ?? 0} prev={d.pr.get(c.name) ?? 0} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <TransactionDialog kind={dlg ?? "income"} open={!!dlg} onOpenChange={(o) => !o && setDlg(null)} />
    </>
  );
}

function DeltaBadge({ cur, prev }: { cur: number; prev: number }) {
  if (!cur && !prev) return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">None</span>;
  if (!prev) return <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">New</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct > 0;
  return (
    <span className={cn("flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", up ? "bg-accent-100 text-accent-700" : "bg-primary-100 text-primary-800")}>
      <i className={up ? "ri-arrow-up-line" : "ri-arrow-down-line"} />
      {Math.abs(pct)}%
    </span>
  );
}
