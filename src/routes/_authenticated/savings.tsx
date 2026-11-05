import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyBlock, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/savings")({
  head: () => ({ meta: [{ title: "Savings Goals — SBP" }, { name: "description", content: "Savings Goals in your Student Budget Planner." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader label="Workspace" title="Savings Goals" />
      <Card>
        <EmptyBlock icon="ri-tools-line" title="Coming in the next update" body="This section is being built." />
      </Card>
    </>
  );
}
