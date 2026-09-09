import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { getDepartments } from "@/api/departments.api";
import DataTable from "@/components/common/DataTable";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import {
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/common/FilterBar";
import LoadingRows from "@/components/common/LoadingRows";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRequestTypes } from "@/features/requestTypes/useRequestType";
import { useAuth } from "@/hooks/useAuth";
import { ALL, ROLES } from "@/lib/constants";

const pageRowLimit = 20;

export function RequestTypesPage() {
  const { departmentId: myDepartmentId, role } = useAuth();
  const isSystemAdmin = role === ROLES.ADMIN_SYSTEM;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    isSystemAdmin
      ? ALL
      : myDepartmentId != null
        ? String(myDepartmentId)
        : "",
  );

  useEffect(() => {
    if (isSystemAdmin) {
      setSelectedDepartmentId((current) => (current === "" ? ALL : current));
      return;
    }
    if (myDepartmentId == null) return;
    setSelectedDepartmentId((current) =>
      !current || current === ALL ? String(myDepartmentId) : current,
    );
  }, [isSystemAdmin, myDepartmentId]);

  const departmentsQuery = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => getDepartments(),
    staleTime: 10 * 60_000,
  });

  const departments = useMemo(() => {
    const raw = departmentsQuery.data;
    return raw?.departments ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  }, [departmentsQuery.data]);

  const departmentOptions = useMemo(
    () =>
      departments.map((department) => ({
        value: department.id,
        label: department.name,
      })),
    [departments],
  );

  const departmentName = (id) => {
    if (id == null) return null;
    return (
      departments.find((department) => department.id === id)?.name ?? `#${id}`
    );
  };

  const viewingAll = isSystemAdmin && selectedDepartmentId === ALL;

  const {
    data: requestTypes = [],
    isPending: requestTypesPending,
    isError,
    error,
    refetch,
  } = useRequestTypes(selectedDepartmentId || null, {
    departments: viewingAll ? departments : [],
    enabled: viewingAll
      ? departments.length > 0
      : Boolean(selectedDepartmentId && selectedDepartmentId !== ALL),
  });

  const isPending =
    requestTypesPending || (viewingAll && departmentsQuery.isPending);

  const isFiltered =
    Boolean(search.trim()) ||
    (isSystemAdmin && selectedDepartmentId !== ALL) ||
    (!isSystemAdmin &&
      myDepartmentId != null &&
      selectedDepartmentId !== String(myDepartmentId));

  const clearFilters = () => {
    setSearch("");
    setSelectedDepartmentId(
      isSystemAdmin
        ? ALL
        : myDepartmentId != null
          ? String(myDepartmentId)
          : "",
    );
    setPage(1);
  };

  const filtered = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    if (!searchText) return requestTypes;
    return requestTypes.filter((item) =>
      [item.name, departmentName(item.departmentId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchText)),
    );
  }, [search, requestTypes, departments]);

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageRowLimit) || 1),
  );
  const rows = filtered.slice(
    (currentPage - 1) * pageRowLimit,
    currentPage * pageRowLimit,
  );

  const canCreate =
    selectedDepartmentId &&
    selectedDepartmentId !== ALL &&
    selectedDepartmentId !== "";

  const newRequestTypeButton = (
    <Button disabled={!canCreate}>
      <Plus className="size-4" />
      New Request type
    </Button>
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Request type name",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              #{row.original.id}
              {row.original.description ? ` · ${row.original.description}` : ""}
            </p>
          </div>
        ),
      },
      ...(viewingAll
        ? [
            {
              id: "department",
              header: "Department",
              cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                  {departmentName(row.original.departmentId) ?? "—"}
                </span>
              ),
            },
          ]
        : []),
      {
        id: "fields",
        header: "Fields",
        cell: ({ row }) => {
          const count = row.original.formSchema?.length ?? 0;
          return (
            <span className="tabular-nums text-sm text-muted-foreground">
              {count} {count === 1 ? "field" : "fields"}
            </span>
          );
        },
      },
      {
        accessorKey: "defaultAssigneeId",
        header: "Default assignee",
        cell: ({ row }) =>
          row.original.defaultAssigneeId != null ? (
            <span className="text-sm">
              User-{row.original.defaultAssigneeId}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const target = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${target.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [viewingAll, departments],
  );

  return (
    <>
      <PageHeader
        title="Request types"
      >
        {newRequestTypeButton}
      </PageHeader>

      <FilterBar isFiltered={isFiltered} onClear={clearFilters}>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search request type name…"
        />
        {isSystemAdmin && (
          <FilterSelect
            value={selectedDepartmentId}
            onChange={(value) => {
              setSelectedDepartmentId(value);
              setSearch("");
              setPage(1);
            }}
            options={departmentOptions}
            allLabel="All departments"
            className="sm:w-50"
          />
        )}
      </FilterBar>

      {!isSystemAdmin && !selectedDepartmentId ? (
        <ListEmptyState
          isFiltered={false}
          title="No department assigned"
          description="Your account needs a department before request types can be managed here."
        />
      ) : isPending ? (
        <LoadingRows rows={6} columns={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          action={canCreate ? newRequestTypeButton : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          meta={{ total: filtered.length, limit: pageRowLimit }}
          page={currentPage}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

export default RequestTypesPage;
