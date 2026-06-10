import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PHASE_LABELS, PHASE_ORDER, type Match, type Team } from "@/lib/phases";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Bolão Copa 2026" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const navigate = useNavigate();
  useEffect(() => { if (user && !isAdmin) {/* loading flicker */} }, [isAdmin, user]);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      const [m, t, br] = await Promise.all([
        supabase.from("matches").select("*").order("match_number"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("bonus_results").select("*").eq("id", 1).maybeSingle(),
      ]);
      return { matches: (m.data ?? []) as Match[], teams: (t.data ?? []) as Team[], bonusResults: br.data };
    },
  });

  const saveMatch = useMutation({
    mutationFn: async (m: any) => {
      const { error } = await supabase.from("matches").update({
        home_team_id: m.home_team_id || null,
        away_team_id: m.away_team_id || null,
        home_score: m.home_score === "" ? null : Number(m.home_score),
        away_score: m.away_score === "" ? null : Number(m.away_score),
        status: (m.home_score !== "" && m.away_score !== "") ? "finished" : "scheduled",
      }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Jogo atualizado"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [bonus, setBonus] = useState<any>({});
  useEffect(() => { if (data?.bonusResults) setBonus(data.bonusResults); }, [data?.bonusResults]);

  const saveBonus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bonus_results").update({ ...bonus, id: 1 }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Resultados bônus salvos"),
    onError: (e: any) => toast.error(e.message),
  });

  if (user && !isAdmin) {
    return <div className="container mx-auto py-12 text-center"><p className="text-destructive font-bold">Acesso restrito. Apenas o admin pode ver esta página.</p><Button className="mt-4" onClick={() => navigate({ to: "/" })}>Voltar</Button></div>;
  }
  if (!data) return <div className="container mx-auto py-12 text-center">Carregando…</div>;

  const grouped = PHASE_ORDER.map((p) => ({ phase: p, matches: data.matches.filter((m) => m.phase === p) }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-black mb-2">Painel Admin</h1>
      <p className="text-muted-foreground mb-6 text-sm">Edite times atribuídos, lance os placares oficiais e defina os vencedores dos bônus.</p>

      <details open className="mb-8">
        <summary className="cursor-pointer text-2xl font-bold text-primary py-2">Jogos & Resultados</summary>
        {grouped.map(({ phase, matches }) => matches.length > 0 && (
          <div key={phase} className="mt-4">
            <h3 className="font-bold text-lg mb-2">{PHASE_LABELS[phase]}</h3>
            <div className="space-y-2">
              {matches.map((m) => <AdminMatchRow key={m.id} m={m} teams={data.teams} onSave={saveMatch.mutate} />)}
            </div>
          </div>
        ))}
      </details>

      <details className="mb-8">
        <summary className="cursor-pointer text-2xl font-bold text-primary py-2">Resultados dos bônus</summary>
        <div className="mt-4 space-y-4 bg-card border-2 border-border rounded-xl p-5">
          <Field label="Artilheiro"><Input value={bonus.top_scorer ?? ""} onChange={(e) => setBonus({ ...bonus, top_scorer: e.target.value })} /></Field>
          <Field label="Melhor jogador"><Input value={bonus.best_player ?? ""} onChange={(e) => setBonus({ ...bonus, best_player: e.target.value })} /></Field>
          {[
            ["champion_team_id", "Campeão"], ["runner_up_team_id", "Vice"],
            ["third_team_id", "3º"], ["fourth_team_id", "4º"],
            ["revelation_team_id", "Revelação"],
            ["best_attack_group_team_id", "Melhor ataque (grupos)"],
            ["best_defense_group_team_id", "Melhor defesa (grupos)"],
          ].map(([k, l]) => (
            <Field key={k} label={l}>
              <Select value={bonus[k] ?? ""} onValueChange={(v) => setBonus({ ...bonus, [k]: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{data.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.flag_emoji} {t.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          ))}
          <Button onClick={() => saveBonus.mutate()} className="w-full font-bold">Salvar resultados bônus</Button>
        </div>
      </details>
    </div>
  );
}

function Field({ label, children }: any) { return <div><Label className="mb-1 block">{label}</Label>{children}</div>; }

function AdminMatchRow({ m, teams, onSave }: { m: Match; teams: Team[]; onSave: (m: any) => void }) {
  const [s, setS] = useState({
    id: m.id,
    home_team_id: m.home_team_id ?? "",
    away_team_id: m.away_team_id ?? "",
    home_score: m.home_score?.toString() ?? "",
    away_score: m.away_score?.toString() ?? "",
  });
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground w-12">#{m.match_number}</span>
      <Select value={s.home_team_id} onValueChange={(v) => setS({ ...s, home_team_id: v })}>
        <SelectTrigger className="w-44"><SelectValue placeholder={m.home_label ?? "Casa"} /></SelectTrigger>
        <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.flag_emoji} {t.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input className="w-14 text-center" type="number" value={s.home_score} onChange={(e) => setS({ ...s, home_score: e.target.value })} />
      <span>×</span>
      <Input className="w-14 text-center" type="number" value={s.away_score} onChange={(e) => setS({ ...s, away_score: e.target.value })} />
      <Select value={s.away_team_id} onValueChange={(v) => setS({ ...s, away_team_id: v })}>
        <SelectTrigger className="w-44"><SelectValue placeholder={m.away_label ?? "Visitante"} /></SelectTrigger>
        <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.flag_emoji} {t.name}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" variant="secondary" onClick={() => onSave(s)}>Salvar</Button>
    </div>
  );
}