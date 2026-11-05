import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type TableName =
  | "income"
  | "expenses"
  | "budgets"
  | "savings_goals"
  | "savings_contributions"
  | "recurring_rules"
  | "ai_insights";
export type Row<T extends TableName | "profiles"> = Tables[T]["Row"];
export type Insert<T extends TableName> = Tables[T]["Insert"];

export type Income = Row<"income">;
export type Expense = Row<"expenses">;
export type Budget = Row<"budgets">;
export type Goal = Row<"savings_goals">;
export type Contribution = Row<"savings_contributions">;
export type RecurringRule = Row<"recurring_rules">;
export type Insight = Row<"ai_insights">;
export type Profile = Row<"profiles">;

const orderBy: Record<TableName, string> = {
  income: "transaction_date",
  expenses: "transaction_date",
  budgets: "month",
  savings_goals: "created_at",
  savings_contributions: "contributed_on",
  recurring_rules: "created_at",
  ai_insights: "created_at",
};

export function useTable<T extends TableName>(table: T) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order(orderBy[table], { ascending: false })
        .order("created_at", { ascending: false })
        .range(0, 9999);
      if (error) throw error;
      return (data ?? []) as unknown as Row<T>[];
    },
  });
}

export function useSession() {
  return useQuery({
    queryKey: ["session-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 60_000,
  });
}

export function useProfile() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      if (data) return data;
      const full_name =
        (user.user_metadata?.['full_name'] as string) || (user.user_metadata?.['name'] as string) || user.email?.split("@")[0] || "";
      const { data: created, error: e2 } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name, currency: "INR" })
        .select("*")
        .single();
      if (e2) throw e2;
      qc.setQueryData(["profile"], created);
      return created;
    },
  });
}

export function useCurrency() {
  return useProfile().data?.currency ?? "INR";
}

export function useUpsert<T extends TableName>(table: T, label = "Saved") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Insert<T> & { id?: string }) => {
      const { id, ...rest } = row as Record<string, unknown>;
      if (id) {
        const { error } = await supabase.from(table).update(rest as never).eq("id" as never, id as never);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(rest as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      if (table === "savings_contributions") qc.invalidateQueries({ queryKey: ["savings_goals"] });
      toast.success(label);
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't save"),
  });
}

export function useDelete<T extends TableName>(table: T, label = "Deleted") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id" as never, id as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      if (table === "savings_contributions") qc.invalidateQueries({ queryKey: ["savings_goals"] });
      toast.success(label);
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't delete"),
  });
}
