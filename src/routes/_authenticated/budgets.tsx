import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyBlock, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({ meta: [{ title: "Budgets — SBP" }, { name: "description", content: "Budgets in your Student Budget Planner." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader label="Workspace" title="Budgets" />
      <Card>
        <EmptyBlock icon="ri-tools-line" title="Coming in the next update" body="This section is being built." />
      </Card>
    </>
  );
}
