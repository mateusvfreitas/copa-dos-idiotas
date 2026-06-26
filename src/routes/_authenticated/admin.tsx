import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { MatchDaySections } from "@/components/MatchDaySections";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { TeamFlag } from "@/components/TeamFlag";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PHASE_LABELS, PHASE_ORDER, type Match, type Team } from "@/lib/phases";
import { initials } from "@/lib/scoring";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

type BonusPrediction = {
  user_id: string;
  top_scorer: string | null;
  top_assists: string | null;
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  third_team_id: string | null;
  fourth_team_id: string | null;
  revelation_team_id: string | null;
  best_attack_group_team_id: string | null;
  best_defense_group_team_id: string | null;
};

type BonusPredictionRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  prediction: BonusPrediction | null;
};

const BONUS_PREDICTION_COLUMNS: { key: keyof BonusPrediction; label: string; type: "text" | "team" }[] = [
  { key: "top_scorer", label: "Artilheiro", type: "text" },
  { key: "top_assists", label: "Assist.", type: "text" },
  { key: "champion_team_id", label: "Campeão", type: "team" },
  { key: "runner_up_team_id", label: "Vice", type: "team" },
  { key: "third_team_id", label: "3º", type: "team" },
  { key: "fourth_team_id", label: "4º", type: "team" },
  { key: "revelation_team_id", label: "Revelação", type: "team" },
  { key: "best_attack_group_team_id", label: "Ataque", type: "team" },
  { key: "best_defense_group_team_id", label: "Defesa", type: "team" },
];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Bolão Copa 2026" }] }),
  component: AdminPage,
});

const scoreInputClass =
  "h-9 w-11 shrink-0 px-0 py-0 text-center text-base font-black tabular-nums leading-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none sm:h-10 sm:w-12 sm:text-lg sm:leading-10 md:text-lg";

function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      const [m, t, br, bp] = await Promise.all([
        supabase.from("matches").select("*").order("match_number"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("bonus_results").select("*").eq("id", 1).maybeSingle(),
        supabase.rpc("get_admin_bonus_predictions"),
      ]);
      if (bp.error) throw bp.error;
      const bonusPredictionRows: BonusPredictionRow[] = (bp.data ?? []).map((row) => ({
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        prediction: row.has_prediction
          ? {
              user_id: row.user_id,
              top_scorer: row.top_scorer,
              top_assists: row.top_assists,
              champion_team_id: row.champion_team_id,
              runner_up_team_id: row.runner_up_team_id,
              third_team_id: row.third_team_id,
              fourth_team_id: row.fourth_team_id,
              revelation_team_id: row.revelation_team_id,
              best_attack_group_team_id: row.best_attack_group_team_id,
              best_defense_group_team_id: row.best_defense_group_team_id,
            }
          : null,
      }));
      return {
        matches: (m.data ?? []) as Match[],
        teams: (t.data ?? []) as Team[],
        bonusResults: br.data,
        bonusPredictionRows,
      };
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

  const grouped = useMemo(
    () =>
      data
        ? PHASE_ORDER.map((p) => ({ phase: p, matches: data.matches.filter((m) => m.phase === p) }))
        : [],
    [data],
  );

  if (adminLoading || isLoading || !data) {
    return <div className="container mx-auto py-12 text-center">Carregando…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-destructive font-bold">Acesso restrito. Apenas o admin pode ver esta página.</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/" })}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl min-w-0 overflow-x-hidden">
      <h1 className="text-4xl font-black mb-2">Painel Admin</h1>
      <p className="text-muted-foreground mb-6 text-sm">Lance os placares oficiais e defina os vencedores dos bônus.</p>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-primary mb-4">Jogos & Resultados</h2>
        {grouped.map(({ phase, matches }) =>
          matches.length > 0 && (
            <PhaseSection
              key={phase}
              phase={phase}
              matches={matches}
              teams={data.teams}
              onSave={saveMatch.mutate}
              defaultOpen={phase === "group"}
            />
          ),
        )}
      </section>

      <LazyDetails summary="Palpites bônus dos participantes" className="mb-8">
        <BonusPredictionsTable rows={data.bonusPredictionRows} teams={data.teams} />
      </LazyDetails>

      <LazyDetails summary="Resultados dos bônus" className="mb-8">
        <div className="mt-4 space-y-4 bg-card border-2 border-border rounded-xl p-5">
          <Field label="Artilheiro"><Input value={bonus.top_scorer ?? ""} onChange={(e) => setBonus({ ...bonus, top_scorer: e.target.value })} /></Field>
          <Field label="Maior assistente"><Input value={bonus.top_assists ?? ""} onChange={(e) => setBonus({ ...bonus, top_assists: e.target.value })} /></Field>
          {[
            ["champion_team_id", "Campeão"], ["runner_up_team_id", "Vice"],
            ["third_team_id", "3º"], ["fourth_team_id", "4º"],
            ["revelation_team_id", "Revelação"],
            ["best_attack_group_team_id", "Melhor ataque (grupos)"],
            ["best_defense_group_team_id", "Melhor defesa (grupos)"],
          ].map(([k, l]) => (
            <Field key={k} label={l}>
              <TeamPicker
                teams={data.teams}
                value={bonus[k] ?? ""}
                onChange={(v) => setBonus({ ...bonus, [k]: v })}
                placeholder="—"
                className="w-full"
              />
            </Field>
          ))}
          <Button onClick={() => saveBonus.mutate()} className="w-full font-bold">Salvar resultados bônus</Button>
        </div>
      </LazyDetails>
    </div>
  );
}

function BonusPredictionsTable({ rows, teams }: { rows: BonusPredictionRow[]; teams: Team[] }) {
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const submitted = rows.filter((r) => r.prediction !== null).length;

  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-xl border-2 border-border bg-card p-6 text-center text-muted-foreground">
        Nenhum participante cadastrado.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        {submitted} de {rows.length} participante{rows.length === 1 ? "" : "s"} enviou palpites bônus.
      </p>

      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <BonusPredictionCard key={row.user_id} row={row} teamMap={teamMap} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border-2 border-border bg-card shadow sm:block">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-primary text-primary-foreground">
            <tr className="text-left">
              <th className="sticky left-0 z-10 bg-primary p-3 min-w-[10rem]">Participante</th>
              {BONUS_PREDICTION_COLUMNS.map((col) => (
                <th key={col.key} className="p-3 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user_id} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-card p-3">
                  <ParticipantCell displayName={row.display_name} avatarUrl={row.avatar_url} />
                </td>
                {row.prediction ? (
                  BONUS_PREDICTION_COLUMNS.map((col) => (
                    <td key={col.key} className="max-w-[9rem] p-3">
                      {col.type === "text" ? (
                        <TextCell value={row.prediction![col.key] as string | null} />
                      ) : (
                        <TeamCell teamId={row.prediction![col.key] as string | null} teamMap={teamMap} />
                      )}
                    </td>
                  ))
                ) : (
                  <td colSpan={BONUS_PREDICTION_COLUMNS.length} className="p-3 text-muted-foreground italic">
                    Sem palpite
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BonusPredictionCard({
  row,
  teamMap,
}: {
  row: BonusPredictionRow;
  teamMap: Map<string, Team>;
}) {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-4 shadow-sm">
      <ParticipantCell displayName={row.display_name} avatarUrl={row.avatar_url} className="mb-3" />
      {!row.prediction ? (
        <p className="text-sm text-muted-foreground italic">Sem palpite</p>
      ) : (
        <dl className="grid gap-2 text-sm">
          {BONUS_PREDICTION_COLUMNS.map((col) => (
            <div key={col.key} className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2">
              <dt className="text-muted-foreground">{col.label}</dt>
              <dd className="min-w-0">
                {col.type === "text" ? (
                  <TextCell value={row.prediction![col.key] as string | null} />
                ) : (
                  <TeamCell teamId={row.prediction![col.key] as string | null} teamMap={teamMap} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ParticipantCell({
  displayName,
  avatarUrl,
  className,
}: {
  displayName: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
        <AvatarFallback className="text-xs">{initials(displayName)}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{displayName}</span>
    </div>
  );
}

function TextCell({ value }: { value: string | null }) {
  if (!value?.trim()) {
    return <span className="text-muted-foreground italic">—</span>;
  }
  return <span className="truncate">{value}</span>;
}

function TeamCell({ teamId, teamMap }: { teamId: string | null; teamMap: Map<string, Team> }) {
  if (!teamId) {
    return <span className="text-muted-foreground italic">—</span>;
  }
  const team = teamMap.get(teamId);
  if (!team) {
    return <span className="text-muted-foreground italic">—</span>;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <TeamFlag code={team.code} emoji={team.flag_emoji} size={16} className="shrink-0" />
      <span className="truncate">{team.name}</span>
    </span>
  );
}

function LazyDetails({
  summary,
  children,
  className,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={className}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-2xl font-bold text-primary py-2">{summary}</summary>
      {open ? children : null}
    </details>
  );
}

function PhaseSection({
  phase,
  matches,
  teams,
  onSave,
  defaultOpen = false,
}: {
  phase: string;
  matches: Match[];
  teams: Team[];
  onSave: (m: any) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="mb-3 rounded-lg border border-border bg-card/40"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer px-4 py-3 font-bold text-lg">
        {PHASE_LABELS[phase]}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({matches.length})</span>
      </summary>
      {open && (
        <div className="px-4 pb-4 min-w-0 overflow-x-hidden">
          <MatchDaySections
            matches={matches}
            layout="stack"
            renderMatch={(m) => <AdminMatchRow key={m.id} m={m} teams={teams} onSave={onSave} />}
          />
        </div>
      )}
    </details>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function TeamDisplay({
  team,
  fallback,
  side,
}: {
  team: Team | null;
  fallback?: string | null;
  side: "home" | "away";
}) {
  if (team) {
    if (side === "home") {
      return (
        <div className="flex items-center justify-end gap-1.5 min-w-0">
          <span className="truncate text-right text-xs font-semibold sm:text-sm">{team.name}</span>
          <TeamFlag code={team.code} emoji={team.flag_emoji} size={20} className="shrink-0" />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-start gap-1.5 min-w-0">
        <TeamFlag code={team.code} emoji={team.flag_emoji} size={20} className="shrink-0" />
        <span className="truncate text-xs font-semibold sm:text-sm">{team.name}</span>
      </div>
    );
  }

  const label = fallback ?? "TBD";
  if (side === "home") {
    return (
      <div className="flex items-center justify-end gap-2 min-w-0 text-muted-foreground italic">
        <span className="truncate text-right">{label}</span>
        <TeamFlag emoji="🏳️" size={20} className="shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-start gap-2 min-w-0 text-muted-foreground italic">
      <TeamFlag emoji="🏳️" size={20} className="shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function TeamSlot({
  team,
  fallback,
  teams,
  value,
  onChange,
  side,
  editable,
}: {
  team: Team | null;
  fallback?: string | null;
  teams: Team[];
  value: string;
  onChange: (value: string) => void;
  side: "home" | "away";
  editable: boolean;
}) {
  if (!editable) {
    return <TeamDisplay team={team} fallback={fallback} side={side} />;
  }

  return (
    <div className="min-w-0">
      <TeamPicker
        teams={teams}
        value={value}
        onChange={onChange}
        placeholder={fallback ?? "Atribuir time"}
      />
    </div>
  );
}

const TeamPicker = memo(function TeamPicker({
  teams,
  value,
  onChange,
  placeholder,
  className,
}: {
  teams: Team[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = teams.find((t) => t.id === value);
  const label = selected?.name ?? placeholder ?? "Selecione";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full min-w-0 justify-between gap-1 bg-card px-2 font-normal sm:min-w-[9rem]",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            <TeamFlag
              code={selected?.code}
              emoji={selected?.flag_emoji}
              size={18}
              className="shrink-0"
            />
            <span className="truncate text-xs sm:text-sm">{label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar time…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
            {teams.map((t) => (
              <CommandItem
                key={t.id}
                value={`${t.name} ${t.code ?? ""}`}
                className="flex items-center gap-2"
                onSelect={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4 shrink-0", value === t.id ? "opacity-100" : "opacity-0")} />
                <TeamFlag code={t.code} emoji={t.flag_emoji} size={20} className="shrink-0" />
                <span className="truncate">{t.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

const AdminMatchRow = memo(function AdminMatchRow({
  m,
  teams,
  onSave,
}: {
  m: Match;
  teams: Team[];
  onSave: (m: any) => void;
}) {
  const homeTeam = m.home_team_id ? teams.find((t) => t.id === m.home_team_id) ?? null : null;
  const awayTeam = m.away_team_id ? teams.find((t) => t.id === m.away_team_id) ?? null : null;
  const [s, setS] = useState({
    id: m.id,
    home_team_id: m.home_team_id ?? "",
    away_team_id: m.away_team_id ?? "",
    home_score: m.home_score?.toString() ?? "",
    away_score: m.away_score?.toString() ?? "",
  });
  const teamsEditable = m.phase !== "group";

  useEffect(() => {
    setS({
      id: m.id,
      home_team_id: m.home_team_id ?? "",
      away_team_id: m.away_team_id ?? "",
      home_score: m.home_score?.toString() ?? "",
      away_score: m.away_score?.toString() ?? "",
    });
  }, [m.id, m.home_team_id, m.away_team_id, m.home_score, m.away_score]);

  const matchLabel = `#${m.match_number}${m.group_letter ? ` · ${m.group_letter}` : ""}`;
  const scoreInputs = (
    <>
      <Input
        className={scoreInputClass}
        type="number"
        value={s.home_score}
        onChange={(e) => setS((prev) => ({ ...prev, home_score: e.target.value }))}
      />
      <span className="text-muted-foreground font-bold select-none">×</span>
      <Input
        className={scoreInputClass}
        type="number"
        value={s.away_score}
        onChange={(e) => setS((prev) => ({ ...prev, away_score: e.target.value }))}
      />
    </>
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-0 sm:hidden">
        <span className="text-xs text-muted-foreground tabular-nums">{matchLabel}</span>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => onSave(s)}>
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1 gap-y-2 sm:grid-cols-[4rem_minmax(0,1fr)_7.5rem_minmax(0,1fr)_4.75rem] sm:gap-x-3">
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">{matchLabel}</span>
        <div className="min-w-0">
          <TeamSlot
            side="home"
            team={homeTeam}
            fallback={m.home_label}
            teams={teams}
            value={s.home_team_id}
            onChange={(v) => setS((prev) => ({ ...prev, home_team_id: v }))}
            editable={teamsEditable}
          />
        </div>
        <div className="flex shrink-0 items-center justify-center gap-0.5 px-0.5">{scoreInputs}</div>
        <div className="min-w-0">
          <TeamSlot
            side="away"
            team={awayTeam}
            fallback={m.away_label}
            teams={teams}
            value={s.away_team_id}
            onChange={(v) => setS((prev) => ({ ...prev, away_team_id: v }))}
            editable={teamsEditable}
          />
        </div>
        <Button size="sm" variant="secondary" className="hidden w-full sm:block" onClick={() => onSave(s)}>
          Salvar
        </Button>
      </div>
    </div>
  );
});
