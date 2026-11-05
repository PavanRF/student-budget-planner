import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Card,
  ConfirmDialog,
  EmptyBlock,
  Icon,
  Money,
  NativeSelect,
  PageHeader,
  QueryState,
  StatTile,
  useMoney,
} from "@/components/kit";
import { useDelete, useTable, useUpsert, type Expense, type Income } from "@/hooks/use-sbp";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, downloadFile, formatDate, iconFor, lastMonths, monthKey, monthLabel, money2, sum, toCSV, todayISO } from "@/lib/sbp";

type Kind = "income" | "expenses";
type Tx = { id: string; amount: number; label: string; description: string | null; transaction_date: string; is_recurring: boolean };

function normalize(kind: Kind, r: Income | Expense): Tx {
  return {
    id: r.id,
    amount: Number(r.amount),
    label: kind === "income" ? (r as Income).source : (r as Expense).category,
    description: r.description,
    transaction_date: r.transaction_date,
    is_recurring: r.is_recurring,
  };
}

export function TransactionDialog({ kind, open, onOpenChange, initial }: { kind: Kind; open: boolean; onOpenChange: (o: boolean) => void; initial?: Tx | null }) {
  const options = kind === "income" ? INCOME_SOURCES : EXPENSE_CATEGORIES;
  const upsert = useUpsert(kind, initial ? "Updated" : kind === "income" ? "Income added" : "Expense added");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState<string>(options[0].name);
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayISO());
  const [key, setKey] = useState<string | null>(null);
  const k = `${open}-${initial?.id ?? "new"}`;
  if (open && key !== k) {
    setKey(k);
    setAmount(initial ? String(initial.amount) : "");
    setLabel(initial?.label ?? options[0].name);
    setDesc(initial?.description ?? "");
    setDate(initial?.transaction_date ?? todayISO());
  }
  if (!open && key !== null) setKey(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!(amt > 0)) return;
    const base = { id: initial?.id, amount: amt, description: desc || null, transaction_date: date };
    const row = kind === "income" ? { ...base, source: label } : { ...base, category: label };
    upsert.mutate(row as never, { onSuccess: () => onOpenChange(false) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display font-medium">
            {initial ? "Edit" : "Add"} {kind === "income" ? "income" : "expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount</Label>
              <Input id="amt" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg tabular-nums" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dt">Date</Label>
              <Input id="dt" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{kind === "income" ? "Source" : "Category"}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {options.map((o) => (
                <button
                  type="button"
                  key={o.name}
                  onClick={() => setLabel(o.name)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-colors ${label === o.name ? "border-primary bg-primary-50 text-primary-800" : "hover:bg-muted"}`}
                >
                  <Icon name={o.icon} /> {o.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Note (optional)</Label>
            <Textarea id="desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} className="rounded-lg" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TransactionsPage({ kind }: { kind: Kind }) {
  const q = useTable(kind);
  const del = useDelete(kind);
  const fmt = useMoney();
  const isIncome = kind === "income";
  const options = isIncome ? INCOME_SOURCES : EXPENSE_CATEGORIES;
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Tx | null>(null);
  const [dialog, setDialog] = useState(false);
  const [toDelete, setToDelete] = useState<Tx | null>(null);

  const all = useMemo(() => (q.data ?? []).map((r) => normalize(kind, r as Income | Expense)), [q.data, kind]);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (t) =>
        (month === "all" || monthKey(t.transaction_date) === month) &&
        (filter === "all" || t.label === filter) &&
        (!s || t.label.toLowerCase().includes(s) || (t.description ?? "").toLowerCase().includes(s) || String(t.amount).includes(s)),
    );
  }, [all, search, month, filter]);
  const total = sum(filtered, (t) => t.amount);
  const largest = filtered.reduce<Tx | null>((m, t) => (!m || t.amount > m.amount ? t : m), null);
  const byLabel = new Map<string, number>();
  filtered.forEach((t) => byLabel.set(t.label, (byLabel.get(t.label) ?? 0) + t.amount));
  const top = [...byLabel.entries()].sort((a, b) => b[1] - a[1])[0];

  const exportCSV = () => {
    const csv = toCSV(
      ["Date", isIncome ? "Source" : "Category", "Description", "Amount", "Recurring"],
      filtered.map((t) => [t.transaction_date, t.label, t.description ?? "", money2(t.amount), t.is_recurring ? "yes" : "no"]),
    );
    downloadFile(`sbp-${kind}-${todayISO()}.csv`, csv);
  };
  const openNew = () => {
    setEditing(null);
    setDialog(true);
  };

  return (
    <>
      <PageHeader
        label="Workspace"
        title={isIncome ? "Income" : "Expenses"}
        sub={isIncome ? "Everything coming in — allowance, stipends, gigs." : "Where your money goes, by category."}
        actions={
          <>
            <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}><Icon name="ri-download-2-line" /> Export CSV</Button>
            <Button onClick={openNew}><Icon name="ri-add-line" /> Add {isIncome ? "Income" : "Expense"}</Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Filtered total" value={fmt(total)} tone={isIncome ? "primary" : undefined} />
        <StatTile label="Entries" value={filtered.length} />
        {isIncome ? (
          <>
            <StatTile label="Average entry" value={fmt(filtered.length ? total / filtered.length : 0)} />
            <StatTile label="All-time income" value={fmt(sum(all, (t) => t.amount))} />
          </>
        ) : (
          <>
            <StatTile label="Largest expense" value={largest ? fmt(largest.amount) : "—"} hint={largest?.label} />
            <StatTile label="Top category" value={top ? top[0] : "—"} hint={top ? fmt(top[1]) : undefined} />
          </>
        )}
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="ri-search-line" /></span>
            <Input placeholder={`Search ${isIncome ? "source" : "category"}, note, amount`} value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-lg pl-9" />
          </div>
          <NativeSelect value={month} onChange={setMonth} aria-label="Month">
            <option value="all">All months</option>
            {lastMonths(12).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </NativeSelect>
          <NativeSelect value={filter} onChange={setFilter} aria-label={isIncome ? "Source" : "Category"}>
            <option value="all">All {isIncome ? "sources" : "categories"}</option>
            {options.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
          </NativeSelect>
        </div>
        <QueryState
          q={q}
          rows={5}
          empty={{
            when: () => all.length === 0,
            node: (
              <EmptyBlock
                icon={isIncome ? "ri-wallet-3-line" : "ri-receipt-line"}
                title={isIncome ? "No income logged yet" : "No expenses logged yet"}
                body={isIncome ? "Add your allowance, scholarship or pay to see your month take shape." : "Log what you spend and SBP will show where it went."}
                action={<Button onClick={openNew}><Icon name="ri-add-line" /> Add {isIncome ? "income" : "expense"}</Button>}
              />
            ),
          }}
        >
          {() =>
            filtered.length === 0 ? (
              <EmptyBlock icon="ri-filter-off-line" title="Nothing matches these filters" action={<Button variant="outline" size="sm" onClick={() => { setSearch(""); setMonth("all"); setFilter("all"); }}>Clear filters</Button>} />
            ) : (
              <ul className="divide-y">
                {filtered.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 py-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isIncome ? "bg-primary-50 text-primary-700" : "bg-muted text-foreground/70"}`}>
                      <i className={iconFor(t.label)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {t.label}
                        {t.is_recurring && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">Recurring</span>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{t.description || "No note"} · {formatDate(t.transaction_date)}</div>
                    </div>
                    <Money value={isIncome ? t.amount : -t.amount} signed className={`text-sm font-semibold ${isIncome ? "text-primary" : ""}`} />
                    <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => { setEditing(t); setDialog(true); }}><Icon name="ri-pencil-line" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" aria-label="Delete" onClick={() => setToDelete(t)}><Icon name="ri-delete-bin-6-line" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      </Card>
      <TransactionDialog kind={kind} open={dialog} onOpenChange={setDialog} initial={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete this ${isIncome ? "income" : "expense"}?`}
        body={toDelete ? `${toDelete.label} · ${fmt(toDelete.amount)} on ${formatDate(toDelete.transaction_date)}` : undefined}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
}
