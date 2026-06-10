import { TeamFlag } from "@/components/TeamFlag";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PHASE_LABELS, PHASE_ORDER, formatKickoff, type Match, type Team } from "@/lib/phases";

export const Route = createFileRoute("/jogos")({
  head: () => ({ meta: [{ title: "Jogos — Bolão Copa 2026" }, { name: "description", content: "Calendário e resultados oficiais da Copa do Mundo 2026." }] }),
  component: JogosPage,
});

function JogosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["matches-public"],
    queryFn: async () => {
      const [m, t] = await Promise.all([
        supabase.from("matches").select("*").order("match_number"),
        supabase.from("teams").select("*"),
      ]);
      return { matches: (m.data ?? []) as Match[], teams: (t.data ?? []) as Team[] };
    },
  });
  if (isLoading || !data) return <div className="container mx-auto py-12 text-center">Carregando…</div>;
  const teamMap = Object.fromEntries(data.teams.map((t) => [t.id, t]));
  const grouped = PHASE_ORDER.map((p) => ({ phase: p, matches: data.matches.filter((m) => m.phase === p) }));
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-black mb-6">Jogos & Resultados</h1>
      {grouped.map(({ phase, matches }) => matches.length > 0 && (
        <section key={phase} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-primary border-b-2 border-secondary pb-2">{PHASE_LABELS[phase]}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.map((m) => <MatchCard key={m.id} match={m} teamMap={teamMap} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchCard({ match, teamMap }: { match: Match; teamMap: Record<string, Team> }) {
  const home = match.home_team_id ? teamMap[match.home_team_id] : null;
  const away = match.away_team_id ? teamMap[match.away_team_id] : null;
  const hasResult = match.home_score !== null && match.away_score !== null;
  return (
    <div className="rounded-lg border-2 border-border bg-card p-3 hover:border-primary transition">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>#{match.match_number}{match.group_letter ? ` · Grupo ${match.group_letter}` : ""}</span>
        <span>{formatKickoff(match.kickoff_at)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 font-semibold min-w-0">
          {home ? (
            <span className="flex items-center justify-end gap-2">
              <span className="truncate">{home.name}</span>
              <TeamFlag code={home.code} emoji={home.flag_emoji} size={28} className="shrink-0" />
            </span>
          ) : (
            <span className="text-muted-foreground italic truncate block text-right">{match.home_label ?? "TBD"}</span>
          )}
        </div>
        <div className="px-3 py-1 rounded bg-accent text-accent-foreground font-black min-w-[60px] text-center shrink-0">
          {hasResult ? `${match.home_score} × ${match.away_score}` : "vs"}
        </div>
        <div className="flex-1 font-semibold min-w-0">
          {away ? (
            <span className="flex items-center justify-start gap-2">
              <TeamFlag code={away.code} emoji={away.flag_emoji} size={28} className="shrink-0" />
              <span className="truncate">{away.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground italic truncate block text-left">{match.away_label ?? "TBD"}</span>
          )}
        </div>
      </div>
    </div>
  );
}