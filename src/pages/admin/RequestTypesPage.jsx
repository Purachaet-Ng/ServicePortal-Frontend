// import PageHeader from "@/components/common/PageHeader";
// import ComingSoon from "@/components/common/ComingSoon";
import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import DataTable from "@/components/common/DataTable";
import { FilterBar, SearchInput } from "@/components/common/FilterBar";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageRowLimit = 3;

const mockData = [
  {
    id: 1,
    name: "IT Support",
    description: "General hardware and software help",
    formSchema: [{ key: "device" }, { key: "urgency" }, { key: "details" }],
    defaultAssigneeId: 12,
  },
  {
    id: 2,
    name: "Access Request",
    description: "System or door access",
    formSchema: [{ key: "system" }, { key: "reason" }],
    defaultAssigneeId: null,
  },
  {
    id: 3,
    name: "Facilities",
    description: "Room, furniture, or building issues",
    formSchema: [{ key: "location" }, { key: "issue" }, { key: "photo" }],
    defaultAssigneeId: 8,
  },
  {
    id: 4,
    name: "HR Inquiry",
    description: null,
    formSchema: [{ key: "topic" }],
    defaultAssigneeId: null,
  },
  {
    id: 5,
    name: "Procurement",
    description: "Purchase or vendor requests",
    formSchema: [
      { key: "item" },
      { key: "quantity" },
      { key: "budget" },
      { key: "vendor" },
    ],
    defaultAssigneeId: 21,
  },
];

export function RequestTypesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const isFiltered = Boolean(search.trim());

  const filtered = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    if (!searchText) return mockData;
    return mockData.filter((key) =>
      [key.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchText)),
    );
  }, [search]);

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageRowLimit) || 1),
  );
  const rows = filtered.slice(
    (currentPage - 1) * pageRowLimit,
    currentPage * pageRowLimit,
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
              <DropdownMenuContent
                align="end"
                className="w-44"
              >
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );
  return (
    // <>
    //   <PageHeader
    //     title="Request types"
    //     description="Define the request types your department offers, and the form each one shows."
    //   />
    //   <ComingSoon
    //     owner="Person B"
    //     docs="PLAN.md 9 - a JSON textarea with a live DynamicForm preview is the intended shortcut"
    //     endpoints={["GET /api/departments/:deptId/request-types",
    //       "POST /api/departments/:deptId/request-types",
    //       "PATCH /api/request-types/:id",
    //       "DELETE /api/request-types/:id"]}
    //   />
    // </>

    <>
      <PageHeader title="Request types (Mock)">
        <Button>
          <Plus className="size-4" />
          New Request type
        </Button>
      </PageHeader>

      <FilterBar
        isFiltered={isFiltered}
        onClear={() => {
          setSearch("");
          setPage(1);
        }}
      >
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name Request type"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={rows}
        meta={{ total: filtered.length, limit: pageRowLimit }}
        page={currentPage}
        onPageChange={setPage}
      />
    </>
  );
}

export default RequestTypesPage;
