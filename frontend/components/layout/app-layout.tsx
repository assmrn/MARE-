import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CopilotWidget } from "@/components/copilot/copilot-widget";

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
            <Outlet />
          </div>
        </main>
      </div>
      <CopilotWidget />
    </div>
  );
}
