import { TeamFlag } from "@/components/TeamFlag";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock } from "lucide-react";
import type { Team } from "@/lib/phases";

export const Route = createFileRoute("/_authenticated/bonus")({
  head: () => ({ meta: [{ title: "Palpites bônus — Bolão Copa 2026" }] }),
  component: BonusPage,
});

const TEAM_FIELDS: [string, string][] = [
  ["champion_team_id", "Campeão (25 pts)"],
  ["runner_up_team_id", "Vice-campeão (15 pts)"],
  ["third_team_id", "3º lugar (10 pts)"],
  ["fourth_team_id", "4º lugar (5 pts)"],
  ["revelation_team_id", "Seleção revelação (15 pts)"],
  ["best_attack_group_team_id", "Melhor ataque na fase de grupos (10 pts)"],
  ["best_defense_group_team_id", "Melhor defesa na fase de grupos (10 pts)"],
];

function BonusPage() {
  const { user } = useAuth();
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
  const [form, setForm] = useState<Record<string, any>>({});
  useEffect(() => { if (data?.bonus) setForm(data.bonus); }, [data?.bonus]);

  if (isLoading || !data) return <div className="container mx-auto py-12 text-center">Carregando…</div>;

  const teamMap = new Map(data.teams.map((t) => [t.id, t]));

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-black mb-2">Palpites bônus</h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Lock className="h-4 w-4" />
        <span>Edições encerradas. Aqui estão os palpites que você enviou.</span>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm">
          O prazo para envio e alteração dos palpites bônus foi encerrado.
          Confira abaixo suas respostas registradas.
        </p>
      </div>

      <div className="space-y-5 bg-card border-2 border-border rounded-xl p-6 shadow opacity-80">
        <ReadOnlyField label="Artilheiro do torneio (20 pts)" value={form.top_scorer} />
        <ReadOnlyField label="Maior assistente do torneio — mais assistências (15 pts)" value={form.top_assists} />
        {TEAM_FIELDS.map(([k, label]) => {
          const team = teamMap.get(form[k] ?? "");
          return (
            <div key={k}>
              <Label className="mb-1 block text-muted-foreground">{label}</Label>
              {team ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <TeamFlag code={team.code} emoji={team.flag_emoji} size={20} />
                  <span>{team.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  <span className="italic">Não selecionado</span>
                </div>
              )}
            </div>
          );
        })}
        <Button disabled size="lg" className="w-full font-bold cursor-not-allowed">
          Edição bloqueada
        </Button>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <Label className="mb-1 block text-muted-foreground">{label}</Label>
      <Input value={value ?? ""} readOnly className="bg-muted cursor-not-allowed" />
    </div>
  );
}
