import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatMoney } from "@/lib/sbp";
import { useCurrency } from "@/hooks/use-sbp";

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center", className)}>
      <i className={name} />
    </span>
  );
}

export function MicroLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/60", className)}>{children}</div>;
}

export function Money({ value, className, signed }: { value: number; className?: string; signed?: boolean }) {
  const c = useCurrency();
  const s = signed && value > 0 ? "+" : signed && value < 0 ? "−" : "";
  return <span className={cn("tabular-nums", className)}>{s}{formatMoney(signed ? Math.abs(value) : value, c)}</span>;
}

export function useMoney() {
  const c = useCurrency();
  return (v: number) => formatMoney(v, c);
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border bg-card p-5 shadow-card", className)}>{children}</section>;
}

export function CardHead({ label, title, right }: { label?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        {label && <MicroLabel>{label}</MicroLabel>}
        <h2 className="mt-1 font-display text-lg font-medium">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ label, title, sub, actions }: { label: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <MicroLabel>{label}</MicroLabel>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "primary" | "accent" | undefined; icon?: string | undefined }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <MicroLabel>{label}</MicroLabel>
        {icon && <Icon name={icon} className="text-foreground/40" />}
      </div>
      <div className={cn("mt-2 font-display text-2xl tabular-nums", tone === "primary" && "text-primary", tone === "accent" && "text-accent")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function LoadingBlock({ rows = 3, className }: { rows?: number | undefined; className?: string | undefined }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function ErrorBlock({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-accent/40 bg-accent-50 p-6 text-center">
      <Icon name="ri-error-warning-line" className="text-accent" />
      <p className="text-sm text-foreground/80">{message ?? "We couldn't load this right now."}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <Icon name="ri-refresh-line" /> Retry
      </Button>
    </div>
  );
}

export function EmptyBlock({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <i className={icon} />
      </span>
      <p className="mt-1 font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Handles the three states for any query-like object. */
export function QueryState<T>({
  q,
  rows,
  empty,
  children,
}: {
  q: { isLoading: boolean; isError: boolean; refetch: () => unknown; data?: T };
  rows?: number;
  empty?: { when: (d: T) => boolean; node: ReactNode };
  children: (d: T) => ReactNode;
}) {
  if (q.isLoading) return <LoadingBlock rows={rows} />;
  if (q.isError || q.data === undefined) return <ErrorBlock onRetry={() => q.refetch()} />;
  if (empty && empty.when(q.data)) return <>{empty.node}</>;
  return <>{children(q.data)}</>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body?: string | undefined;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {body && <AlertDialogDescription>{body}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProgressBar({ pct, over, pin, className }: { pct: number; over?: boolean; pin?: number; className?: string }) {
  return (
    <div className={cn("relative h-2 w-full rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", over ? "bg-accent" : "bg-primary")}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
      {pin !== undefined && (
        <div className="absolute -top-1 h-4 w-[2px] rounded bg-foreground" style={{ left: `calc(${Math.min(Math.max(pin, 0), 100)}% - 1px)` }} />
      )}
    </div>
  );
}

export function Ring({ pct, size = 72, label }: { pct: number; size?: number; label?: ReactNode }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (p / 100) * c}
          className="fill-none stroke-primary transition-all"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">{label ?? `${Math.round(p)}%`}</div>
    </div>
  );
}

export function NativeSelect({ value, onChange, children, className, ...rest }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string; "aria-label"?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...rest}
    >
      {children}
    </select>
  );
}
