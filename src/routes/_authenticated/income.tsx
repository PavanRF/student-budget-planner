import { createFileRoute } from "@tanstack/react-router";
import { TransactionsPage } from "@/components/transactions-page";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — SBP" }, { name: "description", content: "Track every rupee coming in." }] }),
  component: () => <TransactionsPage kind="income" />,
});
