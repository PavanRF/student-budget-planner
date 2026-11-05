import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyBlock, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/statement")({
  head: () => ({ meta: [{ title: "Statement — SBP" }, { name: "description", content: "Statement in your Student Budget Planner." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader label="Workspace" title="Statement" />
      <Card>
        <EmptyBlock icon="ri-tools-line" title="Coming in the next update" body="This section is being built." />
      </Card>
    </>
  );
}
