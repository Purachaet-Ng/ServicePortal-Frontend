import * as Icons from "lucide-react";
import { Layers, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_NAV_ITEMS, NAV_ITEMS, ROLE_META } from "@/lib/constants";
import { fullName, initials } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";

/**
 * Nav is rendered from NAV_ITEMS / ADMIN_NAV_ITEMS in lib/constants, filtered
 * by usePermission(). Adding a page means adding one entry there, not editing
 * this file.
 *
 * The filtering is COSMETIC. ProtectedRoute gates the route and the backend
 * returns 403 regardless — hiding an item just spares the user a wall of
 * permission errors.
 */
function NavIcon({ name, ...props }) {
  const Icon = Icons[name] ?? Icons.Circle;
  return <Icon {...props} />;
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { can } = usePermission();

  const adminItems = ADMIN_NAV_ITEMS.filter(
    (item) => !item.action || can(item.action),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <Layers className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">OpsPortal</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Internal Operations
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink to={item.to} end={item.end}>
                      {({ isActive }) => (
                        <>
                          <NavIcon name={item.icon} />
                          <span
                            className={isActive ? "font-medium" : undefined}
                          >
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink to={item.to}>
                        <NavIcon name={item.icon} />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-md">
                    <AvatarFallback className="rounded-md text-xs">
                      {initials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {fullName(user)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {ROLE_META[user?.role]?.label ?? "—"}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <NavLink to="/profile">My profile</NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
