import { TeamFlag } from "@/components/TeamFlag";
import { MatchDaySections } from "@/components/MatchDaySections";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PHASE_LABELS, PHASE_ORDER, formatKickoff, type Match, type Team } from "@/lib/phases";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/palpites")({
  head: () => ({ meta: [{ title: "Meus palpites — Bolão Copa 2026" }] }),
  component: PalpitesPage,
});

function PalpitesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["palpites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [m, t, p] = await Promise.all([
        supabase.from("matches").select("*").order("match_number"),
        supabase.from("teams").select("*"),
        supabase.from("predictions").select("*").eq("user_id", user!.id),
      ]);
      return { matches: (m.data ?? []) as Match[], teams: (t.data ?? []) as Team[], preds: p.data ?? [] };
    },
  });
  const save = useMutation({
    mutationFn: async (p: { match_id: string; home_score: number; away_score: number }) => {
      const { error } = await supabase.from("predictions").upsert({ ...p, user_id: user!.id }, { onConflict: "user_id,match_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Palpite salvo!"); qc.invalidateQueries({ queryKey: ["palpites", user?.id] }); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
  if (isLoading || !data) return <div className="container mx-auto py-12 text-center">Carregando…</div>;
  const teamMap = Object.fromEntries(data.teams.map((t) => [t.id, t]));
  const predMap = Object.fromEntries(data.preds.map((p: any) => [p.match_id, p]));
  const grouped = PHASE_ORDER.map((p) => ({ phase: p, matches: data.matches.filter((m) => m.phase === p) }));
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-w-0 overflow-x-hidden">
      <h1 className="text-3xl sm:text-4xl font-black mb-2">Meus palpites</h1>
      <p className="text-muted-foreground mb-6 text-sm">Preencha o placar de cada jogo. Você pode editar até o início da partida.</p>
      {grouped.map(({ phase, matches }) => matches.length > 0 && (
        <section key={phase} className="mb-10 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 text-primary border-b-2 border-secondary pb-1">{PHASE_LABELS[phase]}</h2>
          <MatchDaySections
            matches={matches}
            layout="grid"
            renderMatch={(m) => (
              <PalpiteRow key={m.id} match={m} teamMap={teamMap} pred={predMap[m.id]} onSave={save.mutate} />
            )}
          />
        </section>
      ))}
    </div>
  );
}

function PalpiteRow({ match, teamMap, pred, onSave }: any) {
  const [h, setH] = useState<string>(pred?.home_score?.toString() ?? "");
  const [a, setA] = useState<string>(pred?.away_score?.toString() ?? "");
  useEffect(() => {
    setH(pred?.home_score?.toString() ?? "");
    setA(pred?.away_score?.toString() ?? "");
  }, [pred]);
  const home = match.home_team_id ? teamMap[match.home_team_id] : null;
  const away = match.away_team_id ? teamMap[match.away_team_id] : null;
  const locked = new Date(match.kickoff_at) <= new Date();
  const canSave =
    !locked &&
    h !== "" &&
    a !== "" &&
    (h !== (pred?.home_score?.toString() ?? "") || a !== (pred?.away_score?.toString() ?? ""));

  return (
    <div className="rounded-xl border-2 border-border bg-card p-3 sm:p-4 overflow-hidden min-w-0">
      <div className="text-xs text-muted-foreground mb-3 flex justify-between gap-2">
        <span className="truncate font-medium">
          #{match.match_number}
          {match.group_letter ? ` · Grupo ${match.group_letter}` : ""}
        </span>
        <span className="shrink-0 tabular-nums">
          {formatKickoff(match.kickoff_at)}
          {locked && " 🔒"}
        </span>
      </div>

      <div className="divide-y divide-border/60">
        <TeamScoreRow
          team={home}
          fallback={match.home_label}
          value={h}
          onChange={setH}
          disabled={locked || !home}
          ariaLabel="Gols mandante"
        />
        <TeamScoreRow
          team={away}
          fallback={match.away_label}
          value={a}
          onChange={setA}
          disabled={locked || !away}
          ariaLabel="Gols visitante"
        />
      </div>

      {canSave && (
        <Button
          size="sm"
          className="mt-3 w-full font-bold"
          onClick={() => onSave({ match_id: match.id, home_score: Number(h), away_score: Number(a) })}
        >
          Salvar palpite
        </Button>
      )}
    </div>
  );
}

function TeamScoreRow({
  team,
  fallback,
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  team: Team | null;
  fallback?: string | null;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 py-2 first:pt-0 last:pb-0 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {team ? (
          <>
            <TeamFlag code={team.code} emoji={team.flag_emoji} size={22} className="shrink-0" />
            <span className="truncate font-semibold text-sm leading-tight">{team.name}</span>
          </>
        ) : (
          <>
            <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
              ?
            </span>
            <span className="truncate text-sm italic text-muted-foreground">{fallback ?? "TBD"}</span>
          </>
        )}
      </div>
      <Input
        type="number"
        min={0}
        max={20}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="h-9 w-11 shrink-0 px-0 py-0 text-center text-base font-black tabular-nums leading-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none sm:h-10 sm:w-12 sm:text-lg sm:leading-10 md:text-lg"
      />
    </div>
  );
}