import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  MATCH_BREAKDOWN,
  RANKING_ROW_CLASS,
  RANKING_TITLES,
  getRankingTitle,
  initials,
  rankingTitleClass,
} from "@/lib/scoring";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — Bolão Copa 2026" },
      { name: "description", content: "Classificação dos participantes do bolão da Copa 2026." },
    ],
  }),
  component: RankingPage,
});

type RankingRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  match_points: number;
  bonus_points: number;
  total_points: number;
  exact_count: number;
  winner_gd_count: number;
  winner_only_count: number;
  miss_count: number;
};

function BreakdownPanel({ row }: { row: RankingRow }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 sm:gap-3">
        {MATCH_BREAKDOWN.map(({ key, label, pts }) => (
          <div key={key} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg font-black">{Number(row[key] ?? 0)}</div>
            {pts > 0 && <div className="text-xs text-muted-foreground">{pts} pts cada</div>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground sm:hidden">
        {row.match_points} pts jogos · {row.bonus_points} pts bônus
      </p>
    </>
  );
}

function ParticipantInfo({
  row,
  rankIndex,
  isMe,
}: {
  row: RankingRow;
  rankIndex: number;
  isMe: boolean;
}) {
  const title = getRankingTitle(rankIndex);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <Avatar className="h-8 w-8 shrink-0 sm:h-9 sm:w-9">
        <AvatarImage src={row.avatar_url ?? undefined} alt={row.display_name} />
        <AvatarFallback className="text-xs font-bold">{initials(row.display_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium sm:text-base">
          {row.display_name}
          {isMe && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}
        </span>
        {title && (
          <span
            className={cn(
              "mt-0.5 inline-block max-w-full truncate rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:mt-1 sm:px-2 sm:text-[10px]",
              rankingTitleClass(title),
            )}
          >
            {title}
          </span>
        )}
      </div>
    </div>
  );
}

function rowStyles(rankIndex: number, isMe: boolean) {
  return cn(
    rankIndex < RANKING_TITLES.length ? RANKING_ROW_CLASS[rankIndex] : "",
    isMe && "ring-2 ring-inset ring-primary/50 bg-primary/5",
    rankIndex === 0 && !isMe && "font-bold",
  );
}

function MobileRankingList({
  rows,
  userId,
  expanded,
  onToggle,
}: {
  rows: RankingRow[];
  userId: string | undefined;
  expanded: string | null;
  onToggle: (userId: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="p-6 text-center text-muted-foreground">Ninguém marcou pontos ainda.</p>;
  }

  return (
    <div className="divide-y divide-border sm:hidden">
      {rows.map((row, i) => {
        const isMe = userId === row.user_id;
        const isOpen = expanded === row.user_id;

        return (
          <div key={row.user_id} className={rowStyles(i, isMe)}>
            <button
              type="button"
              className="flex w-full items-center gap-2 p-3 text-left"
              onClick={() => onToggle(row.user_id)}
            >
              <span className="w-6 shrink-0 tabular-nums text-sm">{i + 1}</span>
              <ParticipantInfo row={row} rankIndex={i} isMe={isMe} />
              <span className="shrink-0 text-base font-black text-primary tabular-nums">{row.total_points}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="border-t border-border bg-muted/30 px-3 pb-3 pt-2">
                <BreakdownPanel row={row} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DesktopRankingTable({
  rows,
  userId,
  expanded,
  onToggle,
}: {
  rows: RankingRow[];
  userId: string | undefined;
  expanded: string | null;
  onToggle: (userId: string) => void;
}) {
  return (
    <table className="hidden w-full sm:table">
      <thead className="bg-primary text-primary-foreground">
        <tr className="text-left text-sm">
          <th className="w-12 p-3">#</th>
          <th className="p-3">Participante</th>
          <th className="w-20 p-3 text-right">Jogos</th>
          <th className="w-20 p-3 text-right">Bônus</th>
          <th className="w-20 p-3 text-right">Total</th>
          <th className="w-10 p-3" aria-label="Expandir" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isMe = userId === row.user_id;
          const isOpen = expanded === row.user_id;

          return (
            <Fragment key={row.user_id}>
              <tr
                className={cn(
                  "cursor-pointer border-t border-border transition-colors hover:bg-muted/40",
                  rowStyles(i, isMe),
                )}
                onClick={() => onToggle(row.user_id)}
              >
                <td className="p-3 tabular-nums">{i + 1}</td>
                <td className="max-w-0 p-3">
                  <ParticipantInfo row={row} rankIndex={i} isMe={isMe} />
                </td>
                <td className="p-3 text-right tabular-nums">{row.match_points}</td>
                <td className="p-3 text-right tabular-nums">{row.bonus_points}</td>
                <td className="p-3 text-right text-lg font-black text-primary tabular-nums">{row.total_points}</td>
                <td className="p-3 text-muted-foreground">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </td>
              </tr>
              {isOpen && (
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={6} className="p-4">
                    <BreakdownPanel row={row} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="p-6 text-center text-muted-foreground">
              Ninguém marcou pontos ainda.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function RankingPage() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rankings");
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
  });

  if (isLoading) return <div className="container mx-auto py-12 text-center">Carregando…</div>;

  const rows = data ?? [];
  const toggleExpanded = (userId: string) => {
    setExpanded((current) => (current === userId ? null : userId));
  };

  return (
    <div className="container mx-auto min-w-0 px-4 py-8 max-w-3xl">
      <h1 className="mb-2 text-3xl font-black sm:text-4xl">Ranking</h1>
      <p className="mb-6 text-sm text-muted-foreground">Toque em um participante para ver o detalhe dos palpites.</p>
      <div className="overflow-hidden rounded-xl border-2 border-border bg-card shadow">
        <div className="bg-primary px-3 py-2 text-xs font-medium text-primary-foreground sm:hidden">
          <div className="grid grid-cols-[1.5rem_1fr_auto_1rem] items-center gap-2">
            <span>#</span>
            <span>Participante</span>
            <span className="text-right">Total</span>
            <span />
          </div>
        </div>
        <MobileRankingList rows={rows} userId={user?.id} expanded={expanded} onToggle={toggleExpanded} />
        <DesktopRankingTable rows={rows} userId={user?.id} expanded={expanded} onToggle={toggleExpanded} />
      </div>
    </div>
  );
}
