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

export const MEDAL_ROW_CLASS = [
  "bg-amber-100/80 dark:bg-amber-950/40",
  "bg-slate-100/80 dark:bg-slate-800/40",
  "bg-orange-100/60 dark:bg-orange-950/30",
] as const;

export const MEDAL_EMOJI = ["🥇", "🥈", "🥉"] as const;
