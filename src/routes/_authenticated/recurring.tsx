import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyBlock, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/recurring")({
  head: () => ({ meta: [{ title: "Recurring — SBP" }, { name: "description", content: "Recurring in your Student Budget Planner." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader label="Workspace" title="Recurring" />
      <Card>
        <EmptyBlock icon="ri-tools-line" title="Coming in the next update" body="This section is being built." />
      </Card>
    </>
  );
}
