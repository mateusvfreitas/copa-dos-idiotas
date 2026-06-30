export const PHASE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "16-avos de Final",
  round_of_16: "Oitavas de Final",
  quarter_final: "Quartas de Final",
  semi_final: "Semifinal",
  third_place: "Disputa de 3º lugar",
  final: "Final",
};

export const PHASE_ORDER = ["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

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

export function formatKickoff(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMatchDayKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatMatchDay(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function groupMatchesByDay(matches: Match[]) {
  const map = new Map<string, Match[]>();
  for (const match of matches) {
    const key = getMatchDayKey(match.kickoff_at);
    const group = map.get(key);
    if (group) group.push(match);
    else map.set(key, [match]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayMatches]) => ({ dayKey, matches: dayMatches }));
}

export function getDefaultOpenDayKey(matches: Match[]): string | null {
  if (matches.length === 0) return null;
  const groups = groupMatchesByDay(matches);
  const today = getMatchDayKey(new Date().toISOString());
  if (groups.some((g) => g.dayKey === today)) return today;
  const future = groups.find((g) => g.dayKey > today);
  return future?.dayKey ?? null;
}
