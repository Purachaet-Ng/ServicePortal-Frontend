import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** The search box. Debouncing happens in useListQuery, not here. */
export function SearchInput({ value, onChange, placeholder = "Search…", className }) {
  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

/**
 * One filter dropdown. ALL is the "any" option — useListQuery drops it from the
 * query rather than sending an empty param.
 */
export function FilterSelect({ value, onChange, options, allLabel = "All", className }) {
  return (
    <Select value={value ?? ALL} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full sm:w-[180px]", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The row that holds them, plus the reset that only appears once it would do something. */
export function FilterBar({ children, isFiltered, onClear, className }) {
  return (
    <div className={cn("flex flex-col gap-2 pb-4 sm:flex-row sm:items-center", className)}>
      {children}
      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={onClear} className="sm:ml-1">
          <X className="size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}

export default FilterBar;
