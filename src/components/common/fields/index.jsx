import { Controller } from "react-hook-form";
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
import { cn } from "@/lib/utils";

/**
 * The field primitives DynamicForm switches over. Each one is a controlled
 * react-hook-form input that renders its own label, help text, and error.
 *
 * They all take the same props — { name, field, control } — so DynamicForm can
 * pick one by type without knowing anything else about it. `field` is the entry
 * from form_schema: { key, label, type, required, help, options, validation }.
 */

function FieldShell({ id, field, error, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {field.help && !error && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
      {error && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}

export function TextField({ name, field, control, type = "text" }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf, fieldState }) => (
        <FieldShell id={name} field={field} error={fieldState.error}>
          <Input
            id={name}
            type={type}
            placeholder={field.placeholder}
            aria-invalid={!!fieldState.error}
            {...rhf}
            value={rhf.value ?? ""}
          />
        </FieldShell>
      )}
    />
  );
}

export function NumberField(props) {
  return <TextField {...props} type="number" />;
}

export function DateField(props) {
  return <TextField {...props} type="date" />;
}

export function TextArea({ name, field, control }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf, fieldState }) => (
        <FieldShell id={name} field={field} error={fieldState.error}>
          <Textarea
            id={name}
            rows={4}
            placeholder={field.placeholder}
            aria-invalid={!!fieldState.error}
            {...rhf}
            value={rhf.value ?? ""}
          />
        </FieldShell>
      )}
    />
  );
}

export function SelectField({ name, field, control, options }) {
  const items = options ?? (field.options ?? []).map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf, fieldState }) => (
        <FieldShell id={name} field={field} error={fieldState.error}>
          <Select
            value={rhf.value != null ? String(rhf.value) : ""}
            onValueChange={rhf.onChange}
          >
            <SelectTrigger id={name} aria-invalid={!!fieldState.error} className="w-full">
              <SelectValue placeholder={field.placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={String(item.value)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
      )}
    />
  );
}

/**
 * Checkboxes rather than a combobox — a request type rarely has more than a
 * handful of options, and this needs no extra dependency.
 */
export function MultiSelect({ name, field, control }) {
  const options = field.options ?? [];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf, fieldState }) => {
        const selected = Array.isArray(rhf.value) ? rhf.value : [];
        const toggle = (option) =>
          rhf.onChange(
            selected.includes(option)
              ? selected.filter((value) => value !== option)
              : [...selected, option],
          );

        return (
          <FieldShell id={name} field={field} error={fieldState.error}>
            <div className="space-y-2 rounded-md border p-3">
              {options.length === 0 && (
                <p className="text-xs text-muted-foreground">No options defined.</p>
              )}
              {options.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`${name}-${option}`}
                    checked={selected.includes(option)}
                    onCheckedChange={() => toggle(option)}
                  />
                  <Label htmlFor={`${name}-${option}`} className="font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </FieldShell>
        );
      }}
    />
  );
}

export function CheckboxField({ name, field, control }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf, fieldState }) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id={name}
              checked={!!rhf.value}
              onCheckedChange={rhf.onChange}
            />
            <Label htmlFor={name} className={cn("font-normal")}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
          </div>
          {field.help && !fieldState.error && (
            <p className="text-xs text-muted-foreground">{field.help}</p>
          )}
          {fieldState.error && (
            <p className="text-xs text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}

/**
 * Picks a person. `users` is passed down by DynamicForm from
 * GET /users/assignable — the endpoint that decides who is eligible, so the
 * rule lives on the server (PLAN.md §2).
 *
 * With no user list loaded it renders a disabled select saying so, rather than
 * an empty dropdown that looks broken.
 */
export function UserPicker({ name, field, control, users }) {
  if (!users?.length) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{field.label}</Label>
        <Select disabled>
          <SelectTrigger id={name} className="w-full">
            <SelectValue placeholder="No users available" />
          </SelectTrigger>
        </Select>
        <p className="text-xs text-muted-foreground">
          Needs GET /users/assignable — not implemented yet.
        </p>
      </div>
    );
  }

  return (
    <SelectField
      name={name}
      field={field}
      control={control}
      options={users.map((user) => ({
        value: user.id,
        label: [user.firstname, user.lastname].filter(Boolean).join(" "),
      }))}
    />
  );
}
