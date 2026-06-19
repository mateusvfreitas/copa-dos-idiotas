import { TeamFlag } from "@/components/TeamFlag";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PHASE_LABELS, PHASE_ORDER, formatKickoff, type Match, type Team } from "@/lib/phases";
import { initials } from "@/lib/scoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Jogos — Bolão Copa 2026" },
      { name: "description", content: "Calendário e resultados oficiais da Copa do Mundo 2026." },
    ],
  }),
  component: JogosPage,
});

type StartedPrediction = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  home_score: number;
  away_score: number;
  points_earned: number;
};

function JogosPage() {
  const { user, loading: authLoading } = useAuth();
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
  const now = Date.now();
  const startedMatches = data.matches.filter((m) => new Date(m.kickoff_at).getTime() <= now);
  const lockedCount = data.matches.length - startedMatches.length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl min-w-0">
      <h1 className="text-3xl sm:text-4xl font-black mb-6">Jogos</h1>
      <Tabs defaultValue="resultados">
        <TabsList className="mb-6 h-auto flex-wrap w-fit max-w-full">
          <TabsTrigger value="resultados" className="flex-1 sm:flex-none">Resultados</TabsTrigger>
          <TabsTrigger value="palpites" className="flex-1 sm:flex-none">Palpites dos idiotas</TabsTrigger>
        </TabsList>

        <TabsContent value="resultados">
          <ResultadosTab matches={data.matches} teamMap={teamMap} />
        </TabsContent>

        <TabsContent value="palpites" className="min-w-0 overflow-x-hidden">
          {authLoading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando…</div>
          ) : !user ? (
            <div className="rounded-xl border-2 border-border bg-card p-8 text-center max-w-md mx-auto">
              <p className="text-muted-foreground mb-4">Entre para ver os palpites da galera — só liberados após o apito inicial.</p>
              <Link to="/auth">
                <Button className="font-bold">Entrar para ver palpites</Button>
              </Link>
            </div>
          ) : (
            <PalpitesTab
              matches={data.matches}
              startedMatches={startedMatches}
              lockedCount={lockedCount}
              teamMap={teamMap}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultadosTab({ matches, teamMap }: { matches: Match[]; teamMap: Record<string, Team> }) {
  const grouped = PHASE_ORDER.map((p) => ({ phase: p, matches: matches.filter((m) => m.phase === p) }));
  return (
    <>
      {grouped.map(({ phase, matches: phaseMatches }) =>
        phaseMatches.length > 0 && (
          <section key={phase} className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary border-b-2 border-secondary pb-2">{PHASE_LABELS[phase]}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {phaseMatches.map((m) => (
                <MatchCard key={m.id} match={m} teamMap={teamMap} />
              ))}
            </div>
          </section>
        ),
      )}
    </>
  );
}

function PalpitesTab({
  matches,
  startedMatches,
  lockedCount,
  teamMap,
}: {
  matches: Match[];
  startedMatches: Match[];
  lockedCount: number;
  teamMap: Record<string, Team>;
}) {
  const [selectedId, setSelectedId] = useState<string>(() => startedMatches.at(-1)?.id ?? "");

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedId) ?? null,
    [matches, selectedId],
  );

  const { data: predictions, isLoading } = useQuery({
    queryKey: ["started-match-predictions", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_started_match_predictions",
        { p_match_id: selectedId },
      );
      if (error) throw error;
      return ((data ?? []) as unknown) as StartedPrediction[];
    },
  });

  const groupedStarted = PHASE_ORDER.map((p) => ({
    phase: p,
    matches: startedMatches.filter((m) => m.phase === p),
  })).filter((g) => g.matches.length > 0);

  if (startedMatches.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
        Nenhum jogo começou ainda. Palpites dos outros ficam bloqueados até o apito inicial.
        {lockedCount > 0 && <p className="mt-2 text-sm">{lockedCount} jogos ainda bloqueados.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 max-w-3xl">
      {lockedCount > 0 && (
        <p className="text-sm text-muted-foreground">{lockedCount} jogos ainda bloqueados — palpites liberados só após o apito inicial.</p>
      )}

      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Escolha um jogo" />
        </SelectTrigger>
          <SelectContent>
            {groupedStarted.map(({ phase, matches: phaseMatches }) => (
              <SelectGroup key={phase}>
                <SelectLabel>{PHASE_LABELS[phase]}</SelectLabel>
                {phaseMatches.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {matchSelectLabel(m, teamMap)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

      {selectedMatch && (
        <div className="rounded-xl border-2 border-border bg-card p-3 sm:p-4 shadow-sm overflow-hidden">
          <MatchCard match={selectedMatch} teamMap={teamMap} compact />
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Carregando palpites…</div>
      ) : (
        <div className="rounded-xl border-2 border-border bg-card overflow-hidden shadow overflow-x-auto">
          <table className="w-full min-w-[320px]">
            <thead className="bg-primary text-primary-foreground text-sm">
              <tr className="text-left">
                <th className="p-3">Participante</th>
                <th className="p-3 text-center">Palpite</th>
                <th className="p-3 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {(predictions ?? []).map((p) => (
                <tr key={p.user_id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name} />
                        <AvatarFallback className="text-xs">{initials(p.display_name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium">{p.display_name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center font-black tabular-nums">
                    {p.home_score} × {p.away_score}
                  </td>
                  <td className={cn("p-3 text-right font-bold tabular-nums", p.points_earned > 0 && "text-primary")}>
                    {p.points_earned}
                  </td>
                </tr>
              ))}
              {(!predictions || predictions.length === 0) && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-muted-foreground">
                    Ninguém palpitou neste jogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function matchSelectLabel(match: Match, teamMap: Record<string, Team>) {
  const home = match.home_team_id ? teamMap[match.home_team_id]?.name : match.home_label ?? "TBD";
  const away = match.away_team_id ? teamMap[match.away_team_id]?.name : match.away_label ?? "TBD";
  const hasResult = match.home_score !== null && match.away_score !== null;
  const score = hasResult ? ` (${match.home_score}×${match.away_score})` : "";
  return `#${match.match_number} · ${home} vs ${away}${score}`;
}

function MatchCard({
  match,
  teamMap,
  compact = false,
}: {
  match: Match;
  teamMap: Record<string, Team>;
  compact?: boolean;
}) {
  const home = match.home_team_id ? teamMap[match.home_team_id] : null;
  const away = match.away_team_id ? teamMap[match.away_team_id] : null;
  const hasResult = match.home_score !== null && match.away_score !== null;
  const flagSize = compact ? 22 : 28;
  return (
    <div className="rounded-lg border-2 border-border bg-card p-3 hover:border-primary transition overflow-hidden">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2 min-w-0">
        <span className="truncate">
          #{match.match_number}
          {match.group_letter ? ` · Grupo ${match.group_letter}` : ""}
        </span>
        <span className="shrink-0 text-[10px] sm:text-xs">{formatKickoff(match.kickoff_at)}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2">
        <div className="font-semibold min-w-0">
          {home ? (
            <span className="flex items-center justify-end gap-1 sm:gap-2 min-w-0">
              <span className="truncate text-xs sm:text-sm">{home.name}</span>
              <TeamFlag code={home.code} emoji={home.flag_emoji} size={flagSize} className="shrink-0" />
            </span>
          ) : (
            <span className="text-muted-foreground italic truncate block text-right text-xs sm:text-sm">{match.home_label ?? "TBD"}</span>
          )}
        </div>
        <div className="px-2 sm:px-3 py-1 rounded bg-accent text-accent-foreground font-black text-sm sm:text-base text-center shrink-0 tabular-nums">
          {hasResult ? `${match.home_score} × ${match.away_score}` : "vs"}
        </div>
        <div className="font-semibold min-w-0">
          {away ? (
            <span className="flex items-center justify-start gap-1 sm:gap-2 min-w-0">
              <TeamFlag code={away.code} emoji={away.flag_emoji} size={flagSize} className="shrink-0" />
              <span className="truncate text-xs sm:text-sm">{away.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground italic truncate block text-left text-xs sm:text-sm">{match.away_label ?? "TBD"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
