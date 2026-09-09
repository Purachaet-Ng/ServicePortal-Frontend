
import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import PageHeader from "@/components/common/PageHeader";

import {
  FilterBar,
  SearchInput,
} from "@/components/common/FilterBar";

import DataTable from "@/components/common/DataTable";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import ConfirmDialog from "@/components/common/ConfirmDialog";

import DepartmentFormDialog from "@/features/departments/DepartmentFormDialog";

import {
  useDeleteDepartment,
  useDepartments,
} from "@/features/departments/useDepartments";

import { useDebounce } from "@/hooks/useDebounce";

/**
 * Every department on the platform.
 *
 * GET /api/departments returns the whole department table,
 * so search and pagination are handled on the client side,
 * following the same pattern as UsersPage.
 */

const PAGE_SIZE = 20;

export function DepartmentPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /**
   * Keep the department while the dialog is closing.
   * This prevents the edit dialog from changing back to
   * "New department" during the Radix closing animation.
   */
  const [formDialog, setFormDialog] = useState({
    open: false,
    department: undefined,
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    department: null,
  });

  const debouncedSearch = useDebounce(search);

  /**
   * Get departments
   */
  const {
    data: departments,
    isPending,
    isError,
    error,
    refetch,
  } = useDepartments();
  
  // console.log("DEPARTMENT:", departments)

  /**
   * Delete department mutation
   */
  const deleteMutation = useDeleteDepartment();

  /**
   * Search state
   */
  const isFiltered = Boolean(debouncedSearch);

  /**
   * Filter departments
   */
  const filtered = useMemo(() => {
    const needle = debouncedSearch
      .trim()
      .toLowerCase();

    if (!needle) {
      return departments ?? [];
    }

    return (departments ?? []).filter(
      (department) =>
        String(department.name)
          .toLowerCase()
          .includes(needle)
    );
  }, [departments, debouncedSearch]);

  /**
   * Client-side pagination
   */
  const currentPage = Math.min(
    page,
    Math.max(
      1,
      Math.ceil(
        filtered.length / PAGE_SIZE
      )
    )
  );

  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /**
   * Delete department
   */
  const confirmDelete = () => {
    const target = deleteDialog.department;

    if (!target) return;

    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(
          `${target.name} deleted`
        );

        setDeleteDialog((previous) => ({
          ...previous,
          open: false,
        }));
      },

      onError: (mutationError) => {
        /**
         * Department can be referenced by:
         *
         * - users
         * - request types
         * - inventory stocks
         * - inventory requests
         *
         * Backend may return 409 or 500 depending
         * on how the database error is handled.
         */
        toast.error(
          mutationError.status === 409 ||
            mutationError.status === 500
            ? "This department cannot be deleted while it is still being used."
            : mutationError.message
        );

        setDeleteDialog((previous) => ({
          ...previous,
          open: false,
        }));
      },
    });
  };

  /**
   * Table columns
   */
  const columns = useMemo(
    () => [
      
            {
              accessorKey: "id",
      
              header: "ID",
      
              cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                  #{row.original.id}
                </span>
              ),
            },
      {
        accessorKey: "name",

        header: "Department",

        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.original.name}
            </p>
          </div>
        ),
      },

      {
        id: "actions",

        header: "",

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
                className="w-48"
              >
                <DropdownMenuItem
                  onSelect={() =>
                    setFormDialog({
                      open: true,
                      department: target,
                    })
                  }
                >
                  Edit department
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    setDeleteDialog({
                      open: true,
                      department: target,
                    })
                  }
                >
                  Delete department
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  /**
   * New department button
   */
  const newDepartmentButton = (
    <Button
      onClick={() =>
        setFormDialog({
          open: true,
          department: undefined,
        })
      }
    >
      <Plus className="size-4" />
      New department
    </Button>
  );

  return (
    <>
      <PageHeader
        title="All departments"
        description="Create, edit, and manage departments used throughout the system."
      >
        {newDepartmentButton}
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
          placeholder="Search department..."
        />
      </FilterBar>

      {isPending ? (
        <LoadingRows
          rows={6}
          columns={3}
        />
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={refetch}
        />
      ) : rows.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={() => {
            setSearch("");
            setPage(1);
          }}
          title="No departments yet"
          description="Create a department to get started."
          action={newDepartmentButton}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          meta={{
            total: filtered.length,
            limit: PAGE_SIZE,
          }}
          page={currentPage}
          onPageChange={setPage}
        />
      )}

      <DepartmentFormDialog
        open={formDialog.open}
        onOpenChange={(open) =>
          setFormDialog((previous) => ({
            ...previous,
            open,
          }))
        }
        department={formDialog.department}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((previous) => ({
            ...previous,
            open,
          }))
        }
        title={`Delete ${
          deleteDialog.department?.name ??
          "this department"
        }?`}
        description="This removes the department from the system. If users, request types, inventory records, or other data still reference it, the database will refuse the deletion."
        confirmLabel="Delete department"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default DepartmentPage;
