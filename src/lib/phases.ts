export const PHASE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  r32: "16-avos de Final",
  r16: "Oitavas de Final",
  qf: "Quartas de Final",
  sf: "Semifinal",
  third_place: "Disputa de 3º lugar",
  final: "Final",
};

export const PHASE_ORDER = ["group", "r32", "r16", "qf", "sf", "third_place", "final"];

export function formatKickoff(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type Team = {
  id: string;
  code: string;
  name: string;
  flag_emoji: string;
  group_letter: string | null;
};

export type Match = {
  id: string;
  phase: string;
  group_letter: string | null;
  match_number: number;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_label: string | null;
  away_label: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
};