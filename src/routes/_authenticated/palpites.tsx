import { TeamFlag } from "@/components/TeamFlag";
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-black mb-2">Meus palpites</h1>
      <p className="text-muted-foreground mb-6 text-sm">Preencha o placar de cada jogo. Você pode editar até o início da partida.</p>
      {grouped.map(({ phase, matches }) => matches.length > 0 && (
        <section key={phase} className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-primary border-b-2 border-secondary pb-1">{PHASE_LABELS[phase]}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {matches.map((m) => <PalpiteRow key={m.id} match={m} teamMap={teamMap} pred={predMap[m.id]} onSave={save.mutate} />)}
          </div>
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
  const canSave = !locked && h !== "" && a !== "" && (h !== (pred?.home_score?.toString() ?? "") || a !== (pred?.away_score?.toString() ?? ""));
  return (
    <div className="rounded-lg border-2 border-border bg-card p-3">
      <div className="text-xs text-muted-foreground mb-2 flex justify-between">
        <span>#{match.match_number}{match.group_letter ? ` · Grupo ${match.group_letter}` : ""}</span>
        <span>{formatKickoff(match.kickoff_at)} {locked && "🔒"}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right text-sm font-semibold truncate">
          {home ? <span className="inline-flex items-center gap-2">{home.name} <TeamFlag code={home.code} emoji={home.flag_emoji} size={24} /></span> : <span className="italic text-muted-foreground">{match.home_label ?? "TBD"}</span>}
        </div>
        <Input type="number" min={0} max={20} value={h} onChange={(e) => setH(e.target.value)} disabled={locked || !home} className="w-14 text-center font-bold" />
        <span className="text-muted-foreground">×</span>
        <Input type="number" min={0} max={20} value={a} onChange={(e) => setA(e.target.value)} disabled={locked || !away} className="w-14 text-center font-bold" />
        <div className="flex-1 text-sm font-semibold truncate">
          {away ? <span className="inline-flex items-center gap-2"><TeamFlag code={away.code} emoji={away.flag_emoji} size={24} /> {away.name}</span> : <span className="italic text-muted-foreground">{match.away_label ?? "TBD"}</span>}
        </div>
      </div>
      {canSave && (
        <Button size="sm" className="mt-2 w-full" onClick={() => onSave({ match_id: match.id, home_score: Number(h), away_score: Number(a) })}>Salvar palpite</Button>
      )}
    </div>
  );
}