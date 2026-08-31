import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The placeholder every unbuilt page renders.
 *
 * It carries the handover: who owns this page (PLAN.md §10), which doc section
 * describes the flow, and which endpoints it needs — so whoever picks it up
 * does not have to re-read four documents to find their starting point.
 *
 * Delete this component`s usage as each page is built. When no page imports it
 * any more, the skeleton is finished.
 */
export function ComingSoon({ owner, docs, endpoints = [], note }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <Construction className="size-8 text-muted-foreground" strokeWidth={1.5} />

        <div className="space-y-1">
          <p className="font-medium">Not built yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {note ??
              "The route, the layout, and the API functions are in place. This page needs its query hooks and UI."}
          </p>
        </div>

        <dl className="grid w-full max-w-md gap-x-6 gap-y-2 text-left text-sm sm:grid-cols-[auto_1fr]">
          {owner && (
            <>
              <dt className="text-muted-foreground">Owner</dt>
              <dd className="font-medium">{owner}</dd>
            </>
          )}
          {docs && (
            <>
              <dt className="text-muted-foreground">Read first</dt>
              <dd className="font-medium">{docs}</dd>
            </>
          )}
          {endpoints.length > 0 && (
            <>
              <dt className="text-muted-foreground">Endpoints</dt>
              <dd className="space-y-1">
                {endpoints.map((endpoint) => (
                  <code
                    key={endpoint}
                    className="block rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                  >
                    {endpoint}
                  </code>
                ))}
              </dd>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

export default ComingSoon;
