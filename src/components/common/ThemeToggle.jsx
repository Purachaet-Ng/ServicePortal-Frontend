import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Light, dark, or whatever the machine is set to.
 *
 * Radio items rather than a plain toggle, because the three states are
 * exclusive and one of them is "follow the system" — a two-state button can
 * flip the colours but cannot say that the choice is deferred, so once a user
 * has clicked it they can never get back to following the OS.
 *
 * The value is `theme`, the RAW choice, not `resolvedTheme`. Reading the
 * resolved value here would show "Light" as selected while the user is actually
 * on System during the day, and silently change what their next OS switch does.
 */
const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Ghost icon button, matching NotificationBell so the two read as a
            pair in the top bar rather than as two unrelated controls. */}
        <Button variant="ghost" size="icon" aria-label="Switch theme">
          {/* The icon is chosen by CSS, not by JS. useTheme() returns undefined
              on the first render, so an icon picked in JavaScript renders the
              wrong one and then swaps — visibly, on every load. These two are
              correct from the first paint, because the .dark class is already
              on <html> by then (index.html). */}
          <Sun className="size-5 dark:hidden" />
          <Moon className="hidden size-5 dark:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="size-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
