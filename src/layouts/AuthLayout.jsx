import { DoorOpen, Package, Ticket } from "lucide-react";
import { Outlet } from "react-router-dom";

/**
 * Login and register shell: a split screen. Left is an ink context panel, right
 * is the form.
 *
 * The panel carries `dark` as a literal class, not just in dark mode. It is a
 * fixed ink slab in BOTH themes, and scoping the dark palette to it is what
 * lets everything inside stay on the normal tokens — bg-primary, text-signal-text,
 * border-border — instead of hardcoding a second set of colors that never invert.
 *
 * The rail is STATIC on purpose. The reference design showed live counts, but
 * every one of those numbers is behind auth — nothing on this screen is signed
 * in, so it says what the portal does rather than inventing figures.
 */

const RAIL = [
  { icon: Ticket, label: "Service tickets", tone: "bg-primary/20 text-primary" },
  { icon: DoorOpen, label: "Room and car bookings", tone: "bg-muted text-muted-foreground" },
  { icon: Package, label: "Inventory requests", tone: "bg-signal/20 text-signal-text" },
];

export function AuthLayout() {
  return (
    <div className="flex min-h-svh w-full flex-col lg:flex-row">
      <div className="dark flex flex-col justify-between gap-10 bg-background px-7 py-8 text-foreground lg:flex-[1.05] lg:px-14 lg:py-14">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-white/95 p-1">
              <img src="/2.svg" alt="" className="size-full scale-115" />
            </div>
            <img src="/logo-wordmark-white.svg" alt="Service Center" className="h-4 w-auto" />
          </div>

          <h2 className="mt-10 max-w-md text-2xl font-semibold leading-tight tracking-tight lg:mt-16 lg:text-3xl lg:leading-[1.28]">
            Everything your day runs on, in one place.
          </h2>
        </div>

        <div className="hidden overflow-hidden rounded-xl border lg:block">
          {RAIL.map(({ icon: Icon, label, tone }, index) => (
            <div
              key={label}
              className={`flex items-center gap-3.5 bg-card/40 px-4 py-3.5 ${index > 0 ? "border-t" : ""}`}
            >
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="size-4" />
              </div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <p className="hidden border-t pt-5 text-xs text-muted-foreground lg:block">
          Access is provisioned by your department admin. Trouble signing in?
          Contact IT support.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-card px-6 py-10">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
