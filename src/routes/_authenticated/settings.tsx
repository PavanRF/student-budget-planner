import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyBlock, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SBP" }, { name: "description", content: "Settings in your Student Budget Planner." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader label="Workspace" title="Settings" />
      <Card>
        <EmptyBlock icon="ri-tools-line" title="Coming in the next update" body="This section is being built." />
      </Card>
    </>
  );
}
