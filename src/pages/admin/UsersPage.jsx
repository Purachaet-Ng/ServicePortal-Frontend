import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { getDepartments } from "@/api/departments.api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/common/PageHeader";
import { FilterBar, FilterSelect, SearchInput } from "@/components/common/FilterBar";
import DataTable from "@/components/common/DataTable";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import StatusChip from "@/components/common/StatusChip";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import UserFormDialog from "@/features/users/UserFormDialog";
import { useDeleteUser, useUpdateUserRole, useUsers } from "@/features/users/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate, fullName } from "@/lib/format";
import { ALL, ROLE_META, ROLE_OPTIONS } from "@/lib/constants";

/**
 * Every account on the platform — ADMIN_SYSTEM only, gated in routes/index.jsx.
 *
 * WHY THIS PAGE DOES NOT USE useListQuery, unlike every other list:
 * GET /api/users takes no page, limit, sort, or filter params and returns the
 * whole table in one response. useListQuery exists to build server params, so
 * pointing it at an endpoint that ignores them would render controls that look
 * like they filter the query and do not.
 *
 * So the search and role filter below run over rows the server ALREADY sent.
 * That is not the client-side filtering the README forbids — that rule is about
 * never using the UI to hide rows a user should not have received. Here the
 * endpoint is admin-only and deliberately returns everything; narrowing what is
 * displayed is presentation, not access control. The moment GET /users learns
 * `q` and `page`, this page should move to useListQuery like the rest.
 */

/** Client-side paging over the full list, so the table is not 200 rows long. */
const PAGE_SIZE = 20;

export function UsersPage() {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(ALL);
  const [page, setPage] = useState(1);
  /**
   * Both dialogs keep their subject AFTER they are told to close, because Radix
   * animates the exit. Clearing the user on close re-renders the still-visible
   * dialog with no subject, and the edit form visibly flips to "New user" on
   * its way out. `open` is the flag; `user` is remembered until the next open
   * replaces it.
   */
  const [formDialog, setFormDialog] = useState({ open: false, user: undefined });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  const debouncedSearch = useDebounce(search);

  const { data: users, isPending, isError, error, refetch } = useUsers();

  /**
   * Department names, so the table shows "HR" rather than a bare foreign key.
   * GET /api/departments is not mounted yet — retry:false keeps that from
   * costing three round trips, and the column falls back to the id.
   */
  const departmentsQuery = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => getDepartments(),
    retry: false,
    staleTime: 10 * 60_000,
  });

  const departments = useMemo(() => {
    const raw = departmentsQuery.data;
    return raw?.departments ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  }, [departmentsQuery.data]);

  const departmentName = (id) => {
    if (id == null) return null;
    return departments.find((department) => department.id === id)?.name ?? `#${id}`;
  };

  const updateRoleMutation = useUpdateUserRole();
  const deleteMutation = useDeleteUser();

  const isFiltered = Boolean(debouncedSearch) || role !== ALL;

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    return (users ?? []).filter((candidate) => {
      if (role !== ALL && candidate.role !== role) return false;
      if (!needle) return true;
      return [fullName(candidate), candidate.email, candidate.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [users, debouncedSearch, role]);

  // Page 4 of the old result set is meaningless against a new one.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changeRole = (target, nextRole) => {
    if (nextRole === target.role) return;
    updateRoleMutation.mutate(
      { id: target.id, role: nextRole },
      {
        onSuccess: () =>
          toast.success(`${fullName(target)} is now ${ROLE_META[nextRole].label}`),
        onError: (mutationError) => toast.error(mutationError.message),
      },
    );
  };

  const confirmDelete = () => {
    const target = deleteDialog.user;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${fullName(target)} deleted`);
        setDeleteDialog((previous) => ({ ...previous, open: false }));
      },
      onError: (mutationError) => {
        // The row is referenced by a ticket, a booking, or a comment and the
        // foreign key refused. That is the database protecting history, so say
        // so — "Something went wrong" would send the admin looking for a bug.
        toast.error(
          mutationError.status === 500 || mutationError.status === 409
            ? "This account cannot be deleted while its tickets, bookings, or comments still exist."
            : mutationError.message,
        );
        setDeleteDialog((previous) => ({ ...previous, open: false }));
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "firstname",
        header: "Name",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {fullName(row.original)}
              {row.original.id === currentUser?.id && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  you
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <StatusChip kind="role" value={row.original.role} />,
      },
      {
        accessorKey: "departmentId",
        header: "Department",
        cell: ({ row }) => {
          const name = departmentName(row.original.departmentId);
          return name ? (
            <span className="text-sm">{name}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          );
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {row.original.phone || "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const target = row.original;
          // Demoting yourself out of ADMIN_SYSTEM logs you out of this very
          // page, and deleting yourself is worse. The backend does not stop
          // either, so the UI declines to offer them.
          const isSelf = target.id === currentUser?.id;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${fullName(target)}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setFormDialog({ open: true, user: target })}>
                  Edit details
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Role
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={target.role}
                  onValueChange={(value) => changeRole(target, value)}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      disabled={isSelf}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSelf}
                  onSelect={() => setDeleteDialog({ open: true, user: target })}
                >
                  Delete account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    // departments arrives after the first render and changes the Department
    // column`s output; currentUser decides which actions are offered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments, currentUser?.id],
  );

  const newUserButton = (
    <Button onClick={() => setFormDialog({ open: true, user: undefined })}>
      <Plus className="size-4" />
      New user
    </Button>
  );

  return (
    <>
      <PageHeader
        title="All users"
        description="Assign roles, move people between departments, remove accounts."
      >
        {newUserButton}
      </PageHeader>

      <FilterBar
        isFiltered={isFiltered}
        onClear={() => {
          setSearch("");
          setRole(ALL);
        }}
      >
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name, email, or phone…"
        />
        <FilterSelect
          value={role}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
          options={ROLE_OPTIONS}
          allLabel="All roles"
        />
      </FilterBar>

      {isPending ? (
        <LoadingRows rows={6} columns={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={() => {
            setSearch("");
            setRole(ALL);
          }}
          title="No users yet"
          description="Nobody has registered, and no accounts have been created here."
          action={newUserButton}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          meta={{ total: filtered.length, limit: PAGE_SIZE }}
          page={currentPage}
          onPageChange={setPage}
        />
      )}

      <UserFormDialog
        open={formDialog.open}
        onOpenChange={(open) =>
          setFormDialog((previous) => ({ ...previous, open }))
        }
        user={formDialog.user}
        departments={departments}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((previous) => ({ ...previous, open }))
        }
        title={`Delete ${fullName(deleteDialog.user)}?`}
        description="This removes the account for good — there is no deactivated state to restore from. If they have raised a ticket or booked a room, the database will refuse and nothing will change."
        confirmLabel="Delete account"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default UsersPage;
