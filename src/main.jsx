import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import App from "./App.jsx";
import { queryClient } from "@/lib/queryClient";
import "./index.css";

/**
 * ThemeProvider sits above <App />, and that placement is the point rather than
 * a habit: App.jsx renders <Toaster />, and components/ui/sonner.jsx calls
 * useTheme() — a provider mounted inside a layout would leave that call reading
 * a default forever, which is the state this app shipped in until now.
 *
 * attribute="class" because the dark variant in index.css is
 * `&:is(.dark *)`, a class selector, not [data-theme].
 *
 * disableTransitionOnChange suppresses every CSS transition for the instant the
 * class flips. Without it, switching drags thirty elements through intermediate
 * colours at once, which reads as the page breaking rather than as a theme
 * change. The first paint is handled by the script in index.html — see the
 * comment there before removing either.
 */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <App />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
