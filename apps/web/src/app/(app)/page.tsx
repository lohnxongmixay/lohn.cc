import { OrgPanel } from "./org-panel";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <OrgPanel />
    </main>
  );
}
