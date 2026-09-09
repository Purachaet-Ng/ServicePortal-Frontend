import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FORM_FIELD_TYPES } from "@/lib/constants";
import { hasOptions } from "@/validators/requestType.validator";

/**
 * One row of the form_schema builder. Presentational: every value lives in the
 * parent's react-hook-form state under `formSchema.${index}`.
 *
 * `order` is not an input — it is the row's position, so the arrows are the
 * only way to change it and the two can never disagree.
 */

/** The stored values are snake_case; nobody should have to read them that way. */
const TYPE_LABELS = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  multiselect: "Multiple choice",
  checkbox: "Checkbox",
  user_picker: "Person",
};

export function SchemaFieldRow({
  index,
  register,
  control,
  type,
  error,
  onLabelBlur,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
  canRemove,
}) {
  const path = `formSchema.${index}`;
  const id = (part) => `field-${index}-${part}`;
  const position = index + 1;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          Field {position}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label={`Move field ${position} up`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label={`Move field ${position} down`}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canRemove}
            onClick={onRemove}
            aria-label={`Remove field ${position}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={id("label")}>Label *</Label>
          <Input
            id={id("label")}
            placeholder="Position title"
            aria-invalid={!!error?.label}
            {...register(`${path}.label`, { onBlur: onLabelBlur })}
          />
          {error?.label ? (
            <p className="text-xs text-destructive">{error.label.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              What the requester reads above the input.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={id("key")}>Key *</Label>
          <Input
            id={id("key")}
            placeholder="position_title"
            className="font-mono text-sm"
            aria-invalid={!!error?.key}
            {...register(`${path}.key`)}
          />
          {error?.key ? (
            <p className="text-xs text-destructive">{error.key.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The name this answer is stored under. Filled in from the label.
            </p>
          )}
        </div>

        {/* Type and Required share one line rather than two grid cells: Radix
            renders a hidden native <select> after the trigger, so the cell ends
            9px below the control and nothing bottom-aligned to it lines up. */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={id("type")}>Type *</Label>
          <div className="flex items-center gap-6">
            {/* One grid column wide (the grid is 2 cols with a 1rem gap), so the
                select lines up under the Label input above it. */}
            <div className="min-w-0 flex-1 sm:max-w-[calc(50%-0.5rem)]">
              <Controller
                name={`${path}.type`}
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id={id("type")}
                      className="w-full"
                      aria-invalid={!!error?.type}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_FIELD_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {TYPE_LABELS[value] ?? value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Controller
                name={`${path}.required`}
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id={id("required")}
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor={id("required")} className="font-normal">
                Required
              </Label>
            </div>
          </div>
          {error?.type && (
            <p className="text-xs text-destructive">{error.type.message}</p>
          )}
        </div>
      </div>

      {hasOptions(type) && (
        <div className="space-y-2">
          <Label htmlFor={id("options")}>Options *</Label>
          <Textarea
            id={id("options")}
            rows={4}
            className="resize-none"
            placeholder={"Engineering\nSales\nMarketing"}
            aria-invalid={!!error?.options}
            {...register(`${path}.options`)}
          />
          {error?.options ? (
            <p className="text-xs text-destructive">{error.options.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              One per line, in the order they should appear.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SchemaFieldRow;
