import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Trophy, Target, Crown, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolão Copa do Mundo 2026 — Palpite com a galera" },
      { name: "description", content: "Faça palpites em todos os 104 jogos da Copa do Mundo FIFA 2026, escolha o artilheiro, o campeão e dispute o topo do ranking com seus amigos." },
      { property: "og:title", content: "Bolão Copa do Mundo 2026" },
      { property: "og:description", content: "Palpite todos os jogos da Copa 2026 e dispute o ranking com seus amigos." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(254,221,0,0.4), transparent 40%), radial-gradient(circle at 80% 70%, rgba(206,17,38,0.35), transparent 45%)" }} />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Trophy className="h-3 w-3" /> FIFA World Cup 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight max-w-3xl leading-[0.95]">
            Bolão da Copa <span className="text-secondary">com a galera.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-2xl text-primary-foreground/90">
            104 jogos. 48 seleções. 1 campeão. Palpite cada confronto, escolha artilheiro, campeão, revelação e dispute o topo do ranking.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg" variant="secondary" className="font-bold">Entrar e palpitar</Button></Link>
            <Link to="/jogos"><Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">Ver jogos</Button></Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-black mb-10 text-center">Como funciona</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Users, title: "Entre com Google", desc: "Login rápido, sem cadastro chato." },
            { icon: Target, title: "Palpite os 104 jogos", desc: "Coloque seu placar até o início de cada partida." },
            { icon: Crown, title: "Aposte nos bônus", desc: "Artilheiro, campeão, revelação, melhor jogador e mais." },
            { icon: Trophy, title: "Suba no ranking", desc: "Placar exato vale 10 pontos. O campeão vale 25." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border-2 border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary transition">
              <div className="inline-flex p-3 rounded-lg bg-primary text-primary-foreground mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-accent text-accent-foreground py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-black mb-8">Tabela de pontos</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ["Placar exato", "10 pts"],
              ["Vencedor + saldo de gols", "5 pts"],
              ["Apenas vencedor", "3 pts"],
              ["Artilheiro do torneio", "20 pts"],
              ["Campeão", "25 pts"],
              ["Vice / 3º / 4º lugar", "15 / 10 / 5"],
              ["Seleção revelação", "15 pts"],
              ["Maior assistente", "15 pts"],
              ["Melhor ataque / defesa (grupos)", "10 / 10"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between bg-accent-foreground/10 rounded-lg px-4 py-3 border border-accent-foreground/20">
                <span className="font-medium">{k}</span>
                <span className="font-black text-secondary">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
