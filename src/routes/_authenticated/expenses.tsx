import { createFileRoute } from "@tanstack/react-router";
import { TransactionsPage } from "@/components/transactions-page";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — SBP" }, { name: "description", content: "See where your money goes by category." }] }),
  component: () => <TransactionsPage kind="expenses" />,
});
