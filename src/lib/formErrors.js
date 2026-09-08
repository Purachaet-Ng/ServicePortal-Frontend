/**
 * Put a server error where the user will actually see it.
 *
 * There are three kinds and they need three different homes, which is the whole
 * reason this exists rather than being inlined per form:
 *
 *   1. FIELD errors — `errors: [{ field, message }]` from validate.js. These go
 *      onto the inputs (WORKFLOW.md §A3); a toast would leave the user hunting
 *      for which box is wrong.
 *   2. A CONFLICT — 409, whose message already names the room and hours or the
 *      vehicle and days. It belongs in a visible banner, not on a field: no
 *      single input is wrong, the combination is.
 *   3. Anything else — the form's `root`.
 *
 * The trap this closes: the existing dialogs do
 *
 *     if (error.errors?.length) { for (const d of error.errors) if (d.field) …; return; }
 *
 * and that `return` fires whether or not anything matched. A room conflict
 * carries `details: [{ bookingId, startTime, endTime }]` — populated, but with
 * NO `field` key — so it satisfies `errors?.length`, matches nothing in the
 * loop, and returns having displayed absolutely nothing. The user clicks
 * "Request" on a taken slot and the page just sits there.
 *
 * So conflicts are checked FIRST, before the field loop is ever reached.
 *
 * ponytail: RoomFormDialog and CarFormDialog still hand-roll their own version.
 * They never hit the trap because their 409 (a unique-constraint violation) is
 * genuinely about one field, so this is not a live bug there — but they should
 * adopt this the next time either is touched.
 */

/** The codes the backend uses for "someone else has it". */
const CONFLICT_CODES = new Set(["ROOM_UNAVAILABLE", "CAR_UNAVAILABLE"]);

export const isConflict = (error) =>
  error?.status === 409 || CONFLICT_CODES.has(error?.code);

/**
 * @param error      the flattened error from api/client.js
 * @param setError   react-hook-form's setError
 * @param setConflict called with the conflict sentence, or null to clear it
 * @param fields     field names this form actually renders, so a server error
 *                   naming something not on screen falls through to the banner
 *                   instead of being set on an input nobody can see
 */
export function applyServerError(error, { setError, setConflict, fields = [] }) {
  if (isConflict(error)) {
    // The server's sentence is better than anything written here: it names the
    // resource and the exact hours or days that block this request.
    setConflict(error.message);
    return;
  }

  const known = new Set(fields);
  const placed = (error.errors ?? []).filter((detail) => known.has(detail.field));

  if (placed.length) {
    for (const detail of placed) {
      setError(detail.field, { type: "server", message: detail.message });
    }
    return;
  }

  setError("root", { type: "server", message: error.message });
}
