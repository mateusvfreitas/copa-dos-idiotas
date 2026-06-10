import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Bolão Copa 2026" }, { name: "description", content: "Classificação dos participantes do bolão da Copa 2026." }] }),
  component: RankingPage,
});

function RankingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const { data } = await supabase.from("rankings").select("*").order("total_points", { ascending: false });
      return data ?? [];
    },
  });
  if (isLoading) return <div className="container mx-auto py-12 text-center">Carregando…</div>;
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-black mb-6">Ranking</h1>
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden shadow">
        <table className="w-full">
          <thead className="bg-primary text-primary-foreground">
            <tr className="text-left text-sm">
              <th className="p-3 w-12">#</th>
              <th className="p-3">Participante</th>
              <th className="p-3 text-right">Jogos</th>
              <th className="p-3 text-right">Bônus</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r: any, i: number) => (
              <tr key={r.user_id} className={`border-t border-border ${i === 0 ? "bg-secondary/30 font-bold" : ""}`}>
                <td className="p-3">{i + 1}{i === 0 ? " 🏆" : ""}</td>
                <td className="p-3">{r.display_name}</td>
                <td className="p-3 text-right">{r.match_points}</td>
                <td className="p-3 text-right">{r.bonus_points}</td>
                <td className="p-3 text-right text-lg font-black text-primary">{r.total_points}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Ninguém marcou pontos ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}