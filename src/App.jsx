import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppRouter } from "@/routes";

function App() {
  // The router instance itself changes when the token appears or disappears —
  // see useAppRouter in routes/index.jsx.
  const router = useAppRouter();

  return (
    // This shadcn version does NOT bundle a TooltipProvider inside
    // SidebarProvider, and sidebar.jsx renders a <Tooltip> for every collapsed
    // nav item — without this the whole authenticated tree throws
    // "Tooltip must be used within TooltipProvider". It has to sit above the
    // router, not inside a layout, so any page can use a tooltip.
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </TooltipProvider>
  );
}

export default App;
