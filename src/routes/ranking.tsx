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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl min-w-0">
      <h1 className="text-3xl sm:text-4xl font-black mb-2">Ranking</h1>
      <p className="text-sm text-muted-foreground mb-6">Toque em um participante para ver o detalhe dos palpites.</p>
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden shadow overflow-x-auto">
        <table className="w-full min-w-[280px]">
          <thead className="bg-primary text-primary-foreground">
            <tr className="text-left text-sm">
              <th className="p-3 w-12">#</th>
              <th className="p-3">Participante</th>
              <th className="p-3 text-right hidden sm:table-cell">Jogos</th>
              <th className="p-3 text-right hidden sm:table-cell">Bônus</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 w-10" aria-label="Expandir" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isMe = user?.id === r.user_id;
              const isOpen = expanded === r.user_id;
              const title = getRankingTitle(i);
              const rowClass = i < RANKING_TITLES.length ? RANKING_ROW_CLASS[i] : "";
              return (
                <Fragment key={r.user_id}>
                  <tr
                    className={cn(
                      "border-t border-border cursor-pointer hover:bg-muted/40 transition-colors",
                      rowClass,
                      isMe && "ring-2 ring-inset ring-primary/50 bg-primary/5",
                      i === 0 && !isMe && "font-bold",
                    )}
                    onClick={() => setExpanded(isOpen ? null : r.user_id)}
                  >
                    <td className="p-3 tabular-nums">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={r.avatar_url ?? undefined} alt={r.display_name} />
                          <AvatarFallback className="text-xs font-bold">{initials(r.display_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="truncate font-medium block">
                            {r.display_name}
                            {isMe && <span className="text-xs text-muted-foreground ml-1">(você)</span>}
                          </span>
                          {title && (
                            <span
                              className={cn(
                                "inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                                rankingTitleClass(title),
                              )}
                            >
                              {title}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right hidden sm:table-cell">{r.match_points}</td>
                    <td className="p-3 text-right hidden sm:table-cell">{r.bonus_points}</td>
                    <td className="p-3 text-right text-lg font-black text-primary">{r.total_points}</td>
                    <td className="p-3 text-muted-foreground">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={6} className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          {MATCH_BREAKDOWN.map(({ key, label, pts }) => (
                            <div key={key} className="rounded-lg border border-border bg-card px-3 py-2">
                              <div className="text-muted-foreground text-xs">{label}</div>
                              <div className="font-black text-lg">{Number(r[key] ?? 0)}</div>
                              {pts > 0 && <div className="text-xs text-muted-foreground">{pts} pts cada</div>}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 sm:hidden">
                          {r.match_points} pts jogos · {r.bonus_points} pts bônus
                        </p>
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
      </div>
    </div>
  );
}
