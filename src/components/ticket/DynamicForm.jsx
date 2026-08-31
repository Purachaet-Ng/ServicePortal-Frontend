import {
  CheckboxField,
  DateField,
  MultiSelect,
  NumberField,
  SelectField,
  TextArea,
  TextField,
  UserPicker,
} from "@/components/common/fields";

/**
 * Renders a request type`s form_schema as real inputs. WORKFLOW.md §A3.
 *
 * This is the payoff for the whole schema design: pick "Recruit employee" and
 * the form shows different fields than "Hardware issue", with zero hardcoded
 * forms and zero new backend code per request type.
 *
 * One component, a switch on field.type, and nothing else.
 *
 * @param schema   the request type`s formSchema array
 * @param control  react-hook-form control from the parent form
 * @param users    optional, for user_picker fields (GET /users/assignable)
 */
export function DynamicForm({ schema, control, users }) {
  if (!schema?.length) return null;

  return (
    <div className="space-y-5">
      {[...schema]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((field) => {
          // Dynamic values are nested under custom_fields so they submit as one
          // object and never collide with a fixed column name like "title".
          const name = `custom_fields.${field.key}`;
          // `key` is passed explicitly on each element, never spread — React
          // warns (loudly) when a key arrives as part of a spread object.
          const props = { name, field, control };

          switch (field.type) {
            case "text":
              return <TextField key={field.key} {...props} />;
            case "textarea":
              return <TextArea key={field.key} {...props} />;
            case "number":
              return <NumberField key={field.key} {...props} />;
            case "date":
              return <DateField key={field.key} {...props} />;
            case "select":
              return <SelectField key={field.key} {...props} />;
            case "multiselect":
              return <MultiSelect key={field.key} {...props} />;
            case "checkbox":
              return <CheckboxField key={field.key} {...props} />;
            case "user_picker":
              return <UserPicker key={field.key} {...props} users={users} />;
            default:
              // An admin can type any string into form_schema. An unknown type
              // must render nothing — it must NOT take the page down.
              return null;
          }
        })}
    </div>
  );
}

export default DynamicForm;
