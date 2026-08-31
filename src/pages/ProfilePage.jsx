import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { formatDate, fullName } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

/**
 * Reads entirely from the auth store, which AppLayout refreshes through
 * GET /auth/me — so this page needs no query of its own.
 */
export function ProfilePage() {
  const { user } = useAuth();

  const rows = [
    { label: "Name", value: fullName(user) },
    { label: "Email", value: user?.email ?? "—" },
    { label: "Phone", value: user?.phone ?? "—" },
    {
      label: "Role",
      value: <StatusChip kind="role" value={user?.role} />,
    },
    {
      label: "Department",
      value: user?.department?.name ?? user?.departmentId ?? "Not assigned",
    },
    { label: "Member since", value: formatDate(user?.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your account details. Roles and departments are changed by an administrator."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Editing your own details is not in scope for Phase 1 — there is no
            PATCH /api/users/me in API.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-[160px_1fr]">
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </>
  );
}

export default ProfilePage;
