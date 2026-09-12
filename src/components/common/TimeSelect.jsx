import { format, parse } from "date-fns";
import DatePicker from "react-datepicker";
import { Input } from "@/components/ui/input";

/**
 * The same react-datepicker time list CreateEventPage uses, but time-only and
 * on the quarter hour.
 *
 * <input type="time" step={900}> looked like it did this, but step only drives
 * the spinner arrows — the keyboard still types 14:07 and the browser still
 * accepts it. A list the user picks from is the only thing that actually
 * removes the other 45 minutes from reach.
 *
 * Value in and out is "HH:mm", which is what the booking forms already hold.
 */

const toDate = (time) => (time ? parse(time, "HH:mm", new Date()) : null);

export function TimeSelect({ id, value, onChange, onBlur, invalid, min, max }) {
  return (
    <DatePicker
      selected={toDate(value)}
      onChange={(date) => onChange(date ? format(date, "HH:mm") : "")}
      onBlur={onBlur}
      showTimeSelect
      showTimeSelectOnly
      timeIntervals={15}
      timeCaption="Time"
      timeFormat="HH:mm"
      dateFormat="HH:mm"
      // react-datepicker wants the pair or neither; the room day is bounded,
      // a car trip is not.
      minTime={min && max ? toDate(min) : undefined}
      maxTime={min && max ? toDate(max) : undefined}
      wrapperClassName="w-full"
      customInput={
        <Input id={id} className="tabular-nums" aria-invalid={invalid} />
      }
    />
  );
}

export default TimeSelect;
