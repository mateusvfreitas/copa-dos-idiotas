import { TeamFlag } from "@/components/TeamFlag";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Team } from "@/lib/phases";

export const Route = createFileRoute("/_authenticated/bonus")({
  head: () => ({ meta: [{ title: "Palpites bônus — Bolão Copa 2026" }] }),
  component: BonusPage,
});

const TEAM_FIELDS = [
  ["champion_team_id", "Campeão (25 pts)"],
  ["runner_up_team_id", "Vice-campeão (15 pts)"],
  ["third_team_id", "3º lugar (10 pts)"],
  ["fourth_team_id", "4º lugar (5 pts)"],
  ["revelation_team_id", "Seleção revelação (15 pts)"],
  ["best_attack_group_team_id", "Melhor ataque na fase de grupos (10 pts)"],
  ["best_defense_group_team_id", "Melhor defesa na fase de grupos (10 pts)"],
] as const;

function BonusPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bonus", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [t, b] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("bonus_predictions").select("*").eq("user_id", user!.id).maybeSingle(),
      ]);
      return { teams: (t.data ?? []) as Team[], bonus: b.data };
    },
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data?.bonus) setForm(data.bonus); }, [data?.bonus]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, user_id: user!.id };
      const { error } = await supabase.from("bonus_predictions").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bônus salvos!"); qc.invalidateQueries({ queryKey: ["bonus", user?.id] }); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  if (isLoading || !data) return <div className="container mx-auto py-12 text-center">Carregando…</div>;
  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-black mb-2">Palpites bônus</h1>
      <p className="text-muted-foreground mb-6 text-sm">Editáveis até o início do torneio (11 de junho de 2026).</p>
      <div className="space-y-5 bg-card border-2 border-border rounded-xl p-6 shadow">
        <div>
          <Label>Artilheiro do torneio (20 pts)</Label>
          <Input value={form.top_scorer ?? ""} onChange={(e) => setF("top_scorer", e.target.value)} placeholder="Ex: Vinicius Junior" />
        </div>
        <div>
          <Label>Maior assistente do torneio — mais assistências (15 pts)</Label>
          <Input value={form.top_assists ?? ""} onChange={(e) => setF("top_assists", e.target.value)} placeholder="Ex: Kevin De Bruyne" />
        </div>
        {TEAM_FIELDS.map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Select value={form[k] ?? ""} onValueChange={(v) => setF(k, v)}>
              <SelectTrigger><SelectValue placeholder="Escolha uma seleção" /></SelectTrigger>
              <SelectContent>
                {data.teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="inline-flex items-center gap-2">
                      <TeamFlag code={t.code} emoji={t.flag_emoji} size={20} /> {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg" className="w-full font-bold">
          {save.isPending ? "Salvando…" : "Salvar palpites bônus"}
        </Button>
      </div>
    </div>
  );
}