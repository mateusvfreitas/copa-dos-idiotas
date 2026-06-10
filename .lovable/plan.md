# Bolão da Copa 2026

Site para amigos darem palpites em todos os jogos da Copa do Mundo 2026 (104 jogos, formato 48 seleções) e em palpites bônus, com ranking automático.

## Identidade visual
- Vibe festiva Copa 2026 — verde Brasil (#009739), amarelo (#FEDD00), azul (#012169), vermelho (#CE1126)
- Tipografia esportiva moderna
- Cards com bandeiras das seleções, layout vibrante mas legível

## Telas
1. **Landing / Login** — explicação rápida do bolão + botão "Entrar com Google"
2. **Meus Palpites** — lista de todos os 104 jogos agrupados por fase (Grupos A–L, 16-avos, Oitavas, Quartas, Semi, 3º lugar, Final). Inputs de placar editáveis até o início de cada jogo.
3. **Palpites Bônus** — formulário único editável até o início do torneio:
   - Artilheiro do torneio
   - Campeão, Vice, 3º, 4º lugar
   - Seleção revelação
   - Melhor jogador
   - Melhor ataque da fase de grupos
   - Melhor defesa da fase de grupos
4. **Ranking** — tabela de classificação dos participantes com pontuação total, posição, e breakdown por categoria
5. **Jogos & Resultados** — visão pública dos jogos com resultados oficiais já lançados
6. **Painel Admin** (só para você) — inserir/editar resultados dos jogos e definir os vencedores dos palpites bônus após o torneio

## Regras de pontuação (padrão, editáveis no código)
- Placar exato: **10 pts**
- Acertou vencedor + saldo de gols: **5 pts**
- Acertou só o vencedor (ou empate): **3 pts**
- Artilheiro: **20 pts**
- Campeão: **25 pts** / Vice: **15** / 3º: **10** / 4º: **5**
- Seleção revelação: **15 pts**
- Melhor jogador: **15 pts**
- Melhor ataque grupos: **10 pts**
- Melhor defesa grupos: **10 pts**

## Backend (Lovable Cloud)
Tabelas:
- `profiles` — id (FK auth.users), nome, avatar
- `user_roles` — admin/user (segurança via has_role)
- `teams` — 48 seleções (código, nome, bandeira, grupo)
- `matches` — 104 jogos (fase, grupo, data, home_team, away_team, home_score, away_score, status)
- `predictions` — palpite de placar por (user_id, match_id)
- `bonus_predictions` — 1 linha por usuário com os 8 campos bônus
- `bonus_results` — 1 linha global com os resultados oficiais dos bônus (preenchido pelo admin)

Seed migration popula `teams` e os 104 `matches` (fase de grupos completa + estrutura do mata-mata com placeholders TBD).

Login: **Google OAuth** via Lovable Cloud.

RLS:
- Qualquer usuário autenticado lê tudo público (times, jogos, ranking)
- Usuário só edita os próprios `predictions` e `bonus_predictions`, e apenas antes do `kickoff_time`
- Só admin escreve em `matches.home_score/away_score` e `bonus_results`

Ranking calculado via view SQL que soma pontos por usuário com base nos placares oficiais.

## Detalhes técnicos
- TanStack Start + TanStack Query + Tailwind
- Rotas: `/`, `/auth`, `/_authenticated/palpites`, `/_authenticated/bonus`, `/ranking` (público), `/jogos` (público), `/_authenticated/admin` (gated por role)
- Server functions para salvar palpites (valida `kickoff_time > now()`) e para o admin inserir resultados
- Cálculo de pontos roda como SQL function/view (rápido e seguro), exibido no ranking

## Fora de escopo
- API automática de resultados FIFA (admin manual)
- Pagamento/prêmios
- Notificações por email/push
- App mobile nativo

Pronto para implementar quando você aprovar.