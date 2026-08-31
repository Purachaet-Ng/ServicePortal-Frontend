import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useMe } from "@/features/auth/useAuthQueries";

/**
 * The signed-in shell: sidebar + top bar + the routed page.
 *
 * The sidebar is an off-canvas drawer on small screens and permanent from md:
 * up — that is shadcn`s SidebarProvider doing the work, not a media query here.
 *
 * useMe() runs from the layout so it fires once for the whole authenticated
 * tree, not per page. It refreshes a possibly stale persisted role
 * (WORKFLOW.md §A1); the page renders immediately from the persisted user
 * either way, so there is no loading flash.
 */
export function AppLayout() {
  useMe();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
