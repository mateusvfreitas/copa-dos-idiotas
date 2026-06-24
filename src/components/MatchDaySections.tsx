import { useMemo, useState, type ReactNode } from "react";
import {
  formatMatchDay,
  getDefaultOpenDayKey,
  groupMatchesByDay,
  type Match,
} from "@/lib/phases";
import { cn } from "@/lib/utils";

type MatchDaySectionsProps = {
  matches: Match[];
  renderMatch: (match: Match) => ReactNode;
  layout: "grid" | "stack";
  className?: string;
};

function DaySection({
  dayKey,
  matches,
  defaultOpen,
  layout,
  renderMatch,
}: {
  dayKey: string;
  matches: Match[];
  defaultOpen: boolean;
  layout: "grid" | "stack";
  renderMatch: (match: Match) => ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="mb-2 rounded-lg border border-border/60 bg-card/20"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer px-3 py-2 font-semibold text-sm">
        {formatMatchDay(dayKey)}
        <span className="ml-2 text-xs font-normal text-muted-foreground">({matches.length})</span>
      </summary>
      {open && (
        <div
          className={cn(
            "px-3 pb-3 min-w-0 overflow-x-hidden",
            layout === "grid" ? "grid md:grid-cols-2 gap-3" : "space-y-2",
          )}
        >
          {matches.map((m) => renderMatch(m))}
        </div>
      )}
    </details>
  );
}

export function MatchDaySections({ matches, renderMatch, layout, className }: MatchDaySectionsProps) {
  const groups = useMemo(() => groupMatchesByDay(matches), [matches]);
  const defaultOpenDayKey = useMemo(() => getDefaultOpenDayKey(matches), [matches]);

  return (
    <div className={cn("min-w-0", className)}>
      {groups.map(({ dayKey, matches: dayMatches }) => (
        <DaySection
          key={dayKey}
          dayKey={dayKey}
          matches={dayMatches}
          defaultOpen={dayKey === defaultOpenDayKey}
          layout={layout}
          renderMatch={renderMatch}
        />
      ))}
    </div>
  );
}
