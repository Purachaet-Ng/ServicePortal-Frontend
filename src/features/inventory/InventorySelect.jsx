import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__inventory_empty__";

export function InventorySelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  id,
  className,
  disabled,
  ariaLabel,
}) {
  const selectedValue =
    value === "" || value == null ? EMPTY_VALUE : String(value);

  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) =>
        onChange(nextValue === EMPTY_VALUE ? "" : nextValue)
      }
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn("mt-1 h-10 w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_VALUE}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default InventorySelect;
