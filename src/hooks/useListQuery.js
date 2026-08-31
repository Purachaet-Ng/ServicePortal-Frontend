import { useEffect, useMemo, useState } from "react";
import { ALL, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { useDebounce } from "./useDebounce";

/**
 * Search, filters, sort, and pagination for any list page. Returns a `query`
 * object you hand straight to the endpoint.
 *
 * @param defaultSort  the API sort string this list starts on, e.g. "created_at:desc"
 * @param filters      { name: initialValue }, normally ALL for every entry
 * @param transform    { name: (value) => value } applied on the way into the
 *                     query — Number for an id that Radix held as a string
 * @param paramNames   { name: "api_param_name" } when the control name and the
 *                     endpoint param differ, e.g. departmentId → department_id
 * @param searchParam  the param the search box writes to; "q" everywhere so far
 * @param extra        params merged in last, for a filter the page owns itself
 */
export function useListQuery({
  defaultSort,
  filters: initialFilters = {},
  transform = {},
  paramNames = {},
  searchParam = "q",
  extra,
} = {}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);

  const setFilter = (name, value) =>
    setFilters((previous) => ({ ...previous, [name]: value }));

  const clearFilters = () => {
    setSearch("");
    setFilters(initialFilters);
  };

  // Any change to WHAT is being asked for invalidates the page number — page 4
  // of the old result set is meaningless against the new one.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, sort]);

  /**
   * Tells "no tickets yet" apart from "no tickets match these filters". They
   * need different empty screens: one offers a create button, the other offers
   * a clear-filters button (WORKFLOW.md §A4).
   */
  const isFiltered =
    Boolean(debouncedSearch) ||
    Object.entries(filters).some(
      ([name, value]) => value !== initialFilters[name],
    );

  // Serialised, not the object: `extra` is a literal rebuilt every render, so
  // its identity is useless as a dep — but its CONTENT changes for real when a
  // session resolves and user?.id goes from undefined to a number.
  const extraKey = JSON.stringify(extra ?? null);

  const query = useMemo(() => {
    const next = { page, limit: DEFAULT_PAGE_SIZE, sort };

    if (debouncedSearch) next[searchParam] = debouncedSearch;

    // ALL is the Radix sentinel for "any" — it means the param is not sent at
    // all, not that it is sent empty.
    for (const [name, value] of Object.entries(filters)) {
      if (value === ALL || value === undefined || value === null) continue;
      const key = paramNames[name] ?? name;
      next[key] = transform[name] ? transform[name](value) : value;
    }

    return { ...next, ...extra };
    // paramNames and transform are object literals rebuilt by the caller each
    // render; including them would make this memo miss every time. `extra` is
    // tracked through extraKey instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, debouncedSearch, filters, searchParam, extraKey]);

  return {
    query,
    page,
    setPage,
    sort,
    setSort,
    search,
    setSearch,
    filters,
    setFilter,
    isFiltered,
    clearFilters,
  };
}
