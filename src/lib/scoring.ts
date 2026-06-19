export const MATCH_BREAKDOWN = [
  { key: "exact_count" as const, label: "Placar exato", pts: 10 },
  { key: "winner_gd_count" as const, label: "Vencedor + saldo de gols", pts: 5 },
  { key: "winner_only_count" as const, label: "Só vencedor", pts: 3 },
  { key: "miss_count" as const, label: "Errou", pts: 0 },
];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Fixed ladder for the 4 friends — rank index 0–3. */
export const RANKING_TITLES = ["Idiota", "Burro", "Sem QI", "Autista"] as const;

export const RANKING_ROW_CLASS = [
  "bg-amber-100/80 dark:bg-amber-950/40",
  "bg-slate-100/80 dark:bg-slate-800/40",
  "bg-orange-100/60 dark:bg-orange-950/30",
  "bg-destructive/5",
] as const;

export function getRankingTitle(rankIndex: number): string | null {
  return RANKING_TITLES[rankIndex] ?? null;
}

export function rankingTitleClass(title: string | null) {
  if (!title) return "";
  if (title === RANKING_TITLES[0]) return "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40";
  if (title === RANKING_TITLES[1]) return "bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-400/40";
  if (title === RANKING_TITLES[2]) return "bg-orange-500/15 text-orange-900 dark:text-orange-200 border-orange-500/40";
  if (title === RANKING_TITLES[3]) return "bg-destructive/15 text-destructive border-destructive/30";
  return "";
}
