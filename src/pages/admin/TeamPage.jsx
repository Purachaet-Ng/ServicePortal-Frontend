import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { getDepartment } from "@/api/departments.api";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, SearchInput } from "@/components/common/FilterBar";
import { ListEmptyState } from "@/components/common/EmptyState";
import LoadingRows from "@/components/common/LoadingRows";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/features/users/useUsers";
import { ROLE_META } from "@/lib/constants";
import { formatDate, fullName, initials } from "@/lib/format";

const EMPTY_USERS = [];
const PAGE_SIZE = 20;

const COLUMNS = [
  {
    accessorKey: "firstname",
    header: "Team member",
    cell: ({ row }) => (
      <div className="flex min-w-48 items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials(row.original)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{fullName(row.original)}</span>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <a
        href={`mailto:${row.original.email}`}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <Mail className="size-3.5" />
        {row.original.email}
      </a>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone || "—"}</span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = ROLE_META[row.original.role];
      return (
        <Badge variant="secondary" className={role?.className}>
          {role?.label || row.original.role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
];

export function TeamPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const {
    data: users = EMPTY_USERS,
    isPending: isUsersPending,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers,
    isFetching,
  } = useUsers();

  const departmentId = user?.departmentId;
  const { data: department } = useQuery({
    queryKey: ["departments", departmentId],
    queryFn: () => getDepartment(departmentId),
    enabled: departmentId != null,
    select: (response) => response?.department ?? response,
    staleTime: 5 * 60_000,
  });

  const keyword = search.trim().toLowerCase();
  const departmentUsers = users.filter((member) => {
    return member.departmentId === departmentId;
  });
  const filteredUsers = departmentUsers.filter((member) => {
    if (!keyword) return true;

    const memberName = fullName(member).toLowerCase();
    const memberEmail = member.email.toLowerCase();
    return memberName.includes(keyword) || memberEmail.includes(keyword);
  });

  const isFiltered = search.trim() !== "";
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const visibleUsers = filteredUsers.slice(startIndex, endIndex);
  const pagination = { total: filteredUsers.length, limit: PAGE_SIZE };
  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };
  const departmentName = department?.name;
  const pageTitle = departmentName ? `My team: ${departmentName}` : "My team";
  const pageDescription = `Signed in as ${fullName(user)}.`;

  function renderTeamMember() {
    if (isUsersError) {
      return <ErrorState error={usersError} onRetry={refetchUsers} />;
    }

    if (isUsersPending) {
      return <LoadingRows rows={6} columns={5} />;
    }

    if (filteredUsers.length === 0) {
      return (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          title="No department users"
          description="No users belong to this department."
        />
      );
    }

    return (
      <div
        data-pending={isFetching || undefined}
        className="data-[pending]:opacity-60 transition-opacity"
      >
        <DataTable
          columns={COLUMNS}
          data={visibleUsers}
          meta={pagination}
          page={page}
          onPageChange={setPage}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader title={pageTitle} description={pageDescription} />

      <FilterBar isFiltered={isFiltered} onClear={clearFilters}>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name or email…"
        />
      </FilterBar>

      {renderTeamMember()}
    </>
  );
}

export default TeamPage;
