# Spotify Top 128 — The Ultimate Music Bracket

**128 músicas. Uma campeã. Você decide.**

Um mata-mata de sete rodadas com as 128 faixas mais reproduzidas da história do Spotify. Os streams históricos definem só o chaveamento inicial; quem escolhe a campeã é você, um confronto de cada vez.

Feito em HTML, CSS e JavaScript puro, sem frameworks, sem API paga e sem servidor obrigatório.

---

## Como executar

**Jeito mais rápido:** abra o arquivo `index.html` no navegador (dois cliques). Funciona porque os dados também estão em `data/songs.js`, que o navegador carrega mesmo sem servidor.

**Jeito recomendado (servidor local):** com um servidor, o site lê `data/songs.json` diretamente e as capas oficiais (quando houver link direto) carregam com mais confiabilidade.

```bash
cd spotify-top128
python3 -m http.server 8000      # ou: npx serve .
```

Depois abra `http://localhost:8000`.

Navegadores testados: Chromium 141 (desktop e emulação de celular). O código usa apenas recursos presentes em Chrome, Edge, Firefox e Safari atuais (`<dialog>`, container queries, `color-mix`).

## Arquivos

```
index.html              estrutura da página
style.css               visual, layout responsivo e animações
script.js               lógica do torneio, persistência e interface
data/songs.json         as 128 músicas (fonte da verdade)
data/songs.js           cópia de songs.json para abrir o site sem servidor
tools/atualizar-dados.mjs  atualiza os dados a partir do Kworb (Node 18+)
tests/core.test.js      testes automatizados da lógica do torneio
README.md               este arquivo
```

---

## De onde vêm os dados

| Item | Valor |
|---|---|
| Fonte do ranking | Kworb — *Spotify Most Streamed Songs of All Time* (`https://kworb.net/spotify/songs.html`) |
| Data de referência | **23/11/2026** (página consultada nesta data; o Kworb atualiza diariamente) |
| Conferência | Wikipedia — *List of Spotify streaming records*, tabela do top 100 atualizada em 19/09/2026 |
| O que é medido | Streams acumulados de cada faixa no Spotify, desde o lançamento |

**Critério de seleção.** As 128 primeiras faixas *musicais* do ranking do Kworb, na ordem do Kworb. O ranking mede streams acumulados ao longo de toda a história, não popularidade atual.

**Exclusão.** A posição 73 do Kworb é *Clean Baby Sleep White Noise (Loopable)*, de Dream Supplier: uma faixa de ruído branco para bebês, não uma música. Ela foi retirada, e por isso a lista vai até a posição 129 do Kworb. A posição original de cada faixa foi preservada no campo `rank`; a cabeça de chave (`seed`, de 1 a 128) é a ordem entre as participantes.

**Duplicatas.** Nenhuma das 128 se repete. O Kworb lista versões diferentes como faixas separadas (por exemplo, duas versões de *Despacito* e de *Levitating*); neste recorte, apenas a versão mais ouvida de *Levitating* aparece, e as outras versões ficaram abaixo da posição 129.

**Participações.** O Kworb mostra só o artista principal. As participações das posições 1 a 101 do Kworb foram conferidas na tabela da Wikipedia; as das posições 102 a 129 vêm dos créditos oficiais conhecidos das faixas (campo `creditsSource` em cada música).

**Conferência cruzada.** A ordem do top 100 da Wikipedia (19/09/2026) bate com a do Kworb, com pequenas trocas de posição entre faixas com streams muito próximos, o que é esperado com três semanas de diferença.

### Player do Spotify

Cada música tem um botão **Tocar** que toca a faixa dentro do site, num player fixo no rodapé. O player é o **Embed oficial do Spotify**, controlado pela IFrame API (`https://open.spotify.com/embed/iframe-api/v1`):

- sem login no Spotify, toca a prévia de 30 segundos; com login no Spotify neste navegador, a faixa completa;
- uma música por vez: tocar outra troca a faixa no mesmo player, e o botão vira Pausar/Continuar;
- tocar nunca registra voto, e a música continua enquanto você vota e navega;
- o player só é carregado quando alguém aperta Tocar; sem internet, aparece um aviso e o botão Tentar de novo.

**O player precisa do ID de cada faixa.** As 128 músicas já vêm com o ID (`spotifyId` em `data/songs.json`). A tabela do ranking do Kworb não tem links, então o script de atualização busca cada ID na página de músicas do artista no Kworb, exigindo o mesmo título e a mesma contagem de streams. Em 14/10/2026, os 128 IDs foram conferidos um a um em `open.spotify.com/track/<ID>` (título e artista batem). Se alguma música ficar sem ID, o botão aparece como **Vincular faixa**: ele abre a busca do Spotify para você copiar o link certo e colar no site uma única vez; o vínculo fica salvo no navegador. Também dá para importar na página *Dados* um arquivo com a coluna `spotify_id`.

O player funciona abrindo o `index.html` direto ou num servidor local, desde que haja internet. Ele **não funciona dentro do Artifact publicado no Claude**, porque a página publicada bloqueia scripts e conteúdos de outros sites, incluindo o do Spotify.

---

## As 128 músicas

<!-- tabela:inicio (gerada por tools/atualizar-dados.mjs) -->
`Cab.` é a cabeça de chave. `Kworb` é a posição original no ranking do Kworb em 23/11/2026.

| Cab. | Kworb | Música | Artista(s) | Streams |
|---:|---:|---|---|---:|
| 1 | 1 | Blinding Lights | The Weeknd | 5.692.971.942 |
| 2 | 2 | Shape of You | Ed Sheeran | 5.200.535.576 |
| 3 | 3 | Sweater Weather | The Neighbourhood | 5.050.897.294 |
| 4 | 4 | Starboy | The Weeknd com Daft Punk | 4.882.159.809 |
| 5 | 5 | As It Was | Harry Styles | 4.726.066.982 |
| 6 | 6 | One Dance | Drake com Wizkid, Kyla | 4.579.199.401 |
| 7 | 7 | Sunflower | Post Malone com Swae Lee | 4.568.862.769 |
| 8 | 8 | Someone You Loved | Lewis Capaldi | 4.506.868.570 |
| 9 | 9 | Perfect | Ed Sheeran | 4.195.753.649 |
| 10 | 10 | Die With A Smile | Lady Gaga com Bruno Mars | 4.164.011.341 |
| 11 | 11 | STAY | The Kid LAROI | 4.145.230.250 |
| 12 | 12 | I Wanna Be Yours | Arctic Monkeys | 4.128.829.477 |
| 13 | 13 | BIRDS OF A FEATHER | Billie Eilish | 4.121.657.465 |
| 14 | 14 | Yellow | Coldplay | 4.104.851.418 |
| 15 | 15 | The Night We Met | Lord Huron | 4.052.462.206 |
| 16 | 16 | Riptide | Vance Joy | 4.024.749.827 |
| 17 | 17 | Believer | Imagine Dragons | 4.023.410.218 |
| 18 | 18 | Heat Waves | Glass Animals | 4.005.488.103 |
| 19 | 19 | Closer | The Chainsmokers com Halsey | 3.969.693.721 |
| 20 | 20 | lovely | Billie Eilish com Khalid | 3.945.788.597 |
| 21 | 21 | Every Breath You Take | The Police | 3.894.465.363 |
| 22 | 22 | Iris | The Goo Goo Dolls | 3.885.262.368 |
| 23 | 23 | Something Just Like This | The Chainsmokers com Coldplay | 3.848.496.199 |
| 24 | 24 | Another Love | Tom Odell | 3.782.720.967 |
| 25 | 25 | Say You Won't Let Go | James Arthur | 3.750.016.625 |
| 26 | 26 | Counting Stars | OneRepublic | 3.741.099.687 |
| 27 | 27 | Take Me To Church | Hozier | 3.662.367.784 |
| 28 | 28 | Photograph | Ed Sheeran | 3.623.339.131 |
| 29 | 29 | Viva La Vida | Coldplay | 3.623.144.809 |
| 30 | 30 | Locked out of Heaven | Bruno Mars | 3.622.281.932 |
| 31 | 31 | Mr. Brightside | The Killers | 3.618.594.806 |
| 32 | 32 | Can't Hold Us | Macklemore & Ryan Lewis com Ray Dalton | 3.599.306.153 |
| 33 | 33 | Just the Way You Are | Bruno Mars | 3.578.994.469 |
| 34 | 34 | Dance Monkey | Tones And I | 3.550.028.403 |
| 35 | 35 | Cruel Summer | Taylor Swift | 3.542.952.945 |
| 36 | 36 | Die For You | The Weeknd | 3.515.928.928 |
| 37 | 37 | rockstar | Post Malone com 21 Savage | 3.490.836.524 |
| 38 | 38 | That's What I Like | Bruno Mars | 3.486.672.431 |
| 39 | 39 | In the End | Linkin Park | 3.479.282.528 |
| 40 | 40 | Señorita | Shawn Mendes com Camila Cabello | 3.478.778.594 |
| 41 | 41 | Watermelon Sugar | Harry Styles | 3.446.717.701 |
| 42 | 42 | Love Yourself | Justin Bieber | 3.434.484.628 |
| 43 | 43 | Billie Jean | Michael Jackson | 3.390.055.872 |
| 44 | 44 | When I Was Your Man | Bruno Mars | 3.374.611.778 |
| 45 | 45 | Don’t Start Now | Dua Lipa | 3.370.927.534 |
| 46 | 46 | Circles | Post Malone | 3.347.687.743 |
| 47 | 47 | Bohemian Rhapsody | Queen | 3.342.073.470 |
| 48 | 48 | Let Me Love You | DJ Snake com Justin Bieber | 3.310.753.579 |
| 49 | 49 | Without Me | Eminem | 3.309.028.987 |
| 50 | 50 | Wake Me Up | Avicii | 3.296.385.492 |
| 51 | 51 | Thinking out Loud | Ed Sheeran | 3.279.999.175 |
| 52 | 52 | goosebumps | Travis Scott com Kendrick Lamar | 3.277.770.547 |
| 53 | 53 | Treat You Better | Shawn Mendes | 3.273.534.964 |
| 54 | 54 | Creep | Radiohead | 3.269.178.199 |
| 55 | 55 | Espresso | Sabrina Carpenter | 3.263.774.674 |
| 56 | 56 | All The Stars | Kendrick Lamar com SZA | 3.263.609.136 |
| 57 | 57 | Beautiful Things | Benson Boone | 3.261.559.774 |
| 58 | 58 | All Of Me | John Legend | 3.253.464.373 |
| 59 | 59 | Lucid Dreams | Juice WRLD | 3.245.305.618 |
| 60 | 60 | Stressed Out | Twenty One Pilots | 3.243.269.517 |
| 61 | 61 | God's Plan | Drake | 3.239.552.080 |
| 62 | 62 | Do I Wanna Know? | Arctic Monkeys | 3.232.856.770 |
| 63 | 63 | The Hills | The Weeknd | 3.226.191.800 |
| 64 | 64 | Shallow | Lady Gaga com Bradley Cooper | 3.220.626.263 |
| 65 | 65 | Wonderwall | Oasis | 3.209.513.663 |
| 66 | 66 | See You Again | Tyler, The Creator com Kali Uchis | 3.206.576.916 |
| 67 | 67 | Demons | Imagine Dragons | 3.205.104.601 |
| 68 | 68 | Smells Like Teen Spirit | Nirvana | 3.188.134.091 |
| 69 | 69 | Thunder | Imagine Dragons | 3.162.601.797 |
| 70 | 70 | Unforgettable | French Montana com Swae Lee | 3.154.866.175 |
| 71 | 71 | Seven | Jung Kook com Latto | 3.152.207.070 |
| 72 | 72 | Sorry | Justin Bieber | 3.149.273.057 |
| 73 | 73 | 505 | Arctic Monkeys | 3.148.294.011 |
| 74 | 75 | No Role Modelz | J. Cole | 3.108.484.299 |
| 75 | 76 | End of Beginning | Djo | 3.089.583.981 |
| 76 | 77 | Lose Yourself | Eminem | 3.083.609.584 |
| 77 | 78 | The Scientist | Coldplay | 3.078.486.461 |
| 78 | 79 | There's Nothing Holdin' Me Back | Shawn Mendes | 3.077.483.686 |
| 79 | 80 | Don't Stop Believin' | Journey | 3.074.586.548 |
| 80 | 81 | Dreams | Fleetwood Mac | 3.040.204.690 |
| 81 | 82 | Flowers | Miley Cyrus | 3.038.356.491 |
| 82 | 83 | HUMBLE. | Kendrick Lamar | 3.027.132.895 |
| 83 | 84 | drivers license | Olivia Rodrigo | 3.020.975.068 |
| 84 | 85 | bad guy | Billie Eilish | 3.008.743.969 |
| 85 | 86 | Take on Me | a-ha | 3.008.379.369 |
| 86 | 87 | Numb | Linkin Park | 3.005.646.979 |
| 87 | 88 | 7 rings | Ariana Grande | 2.978.472.235 |
| 88 | 89 | One Of The Girls | The Weeknd com JENNIE, Lily-Rose Depp | 2.976.889.720 |
| 89 | 90 | Sweet Child O' Mine | Guns N' Roses | 2.974.841.484 |
| 90 | 91 | Kill Bill | SZA | 2.950.061.818 |
| 91 | 92 | Let Her Go | Passenger | 2.946.175.771 |
| 92 | 93 | Save Your Tears | The Weeknd | 2.911.924.437 |
| 93 | 94 | Payphone | Maroon 5 com Wiz Khalifa | 2.886.107.811 |
| 94 | 95 | Cold Heart | Elton John com Dua Lipa, PNAU | 2.862.847.739 |
| 95 | 96 | Lean On | Major Lazer com MØ, DJ Snake | 2.857.856.256 |
| 96 | 97 | Uptown Funk | Mark Ronson com Bruno Mars | 2.855.545.162 |
| 97 | 98 | Danza Kuduro | Don Omar com Lucenzo | 2.852.821.133 |
| 98 | 99 | Africa | TOTO | 2.838.180.704 |
| 99 | 100 | One Kiss | Calvin Harris com Dua Lipa | 2.837.989.126 |
| 100 | 101 | Don't Stop Me Now | Queen | 2.831.383.606 |
| 101 | 102 | We Don't Talk Anymore | Charlie Puth com Selena Gomez | 2.827.166.817 |
| 102 | 103 | Somewhere Only We Know | Keane | 2.798.347.356 |
| 103 | 104 | Night Changes | One Direction | 2.797.260.125 |
| 104 | 105 | LA CANCIÓN | J Balvin com Bad Bunny | 2.787.080.347 |
| 105 | 106 | Everybody Wants To Rule The World | Tears For Fears | 2.784.169.429 |
| 106 | 107 | Hips Don't Lie | Shakira com Wyclef Jean | 2.775.530.994 |
| 107 | 108 | Someone Like You | Adele | 2.764.880.263 |
| 108 | 109 | good 4 u | Olivia Rodrigo | 2.760.579.013 |
| 109 | 110 | We Found Love | Calvin Harris com Rihanna | 2.756.870.606 |
| 110 | 111 | Happier | Marshmello com Bastille | 2.740.912.832 |
| 111 | 112 | Lose Control | Teddy Swims | 2.737.734.086 |
| 112 | 113 | APT. | ROSÉ com Bruno Mars | 2.717.939.251 |
| 113 | 114 | Levitating | Dua Lipa | 2.717.794.029 |
| 114 | 115 | Gangsta's Paradise | Coolio com L.V. | 2.717.239.557 |
| 115 | 116 | SICKO MODE | Travis Scott com Drake | 2.710.667.093 |
| 116 | 117 | Lush Life | Zara Larsson | 2.701.147.129 |
| 117 | 118 | Attention | Charlie Puth | 2.697.385.830 |
| 118 | 119 | Me Rehúso | Danny Ocean | 2.692.188.360 |
| 119 | 120 | Stitches | Shawn Mendes | 2.691.833.556 |
| 120 | 121 | The Less I Know The Better | Tame Impala | 2.691.604.130 |
| 121 | 122 | Apocalypse | Cigarettes After Sex | 2.682.987.195 |
| 122 | 123 | Blank Space | Taylor Swift | 2.680.798.646 |
| 123 | 124 | 7 Years | Lukas Graham | 2.672.607.472 |
| 124 | 125 | New Rules | Dua Lipa | 2.672.353.471 |
| 125 | 126 | Somebody That I Used To Know | Gotye com Kimbra | 2.670.002.651 |
| 126 | 127 | Pumped Up Kicks | Foster The People | 2.666.315.909 |
| 127 | 128 | Mockingbird | Eminem | 2.656.177.847 |
| 128 | 129 | I'm Not The Only One | Sam Smith | 2.656.157.366 |

<!-- tabela:fim -->

---

## Como o chaveamento funciona

### Rodadas

| # | Rodada | Músicas | Confrontos |
|---|---|---|---|
| 1 | Rodada de 128 | 128 | 64 |
| 2 | Rodada de 64 | 64 | 32 |
| 3 | Rodada de 32 | 32 | 16 |
| 4 | Oitavas de final | 16 | 8 |
| 5 | Quartas de final | 8 | 4 |
| 6 | Semifinais (Final Four) | 4 | 2 |
| 7 | Grande final | 2 | 1 |

São 127 confrontos. Os nomes seguem a convenção do futebol: "oitavas" são as 16 últimas, "quartas" as 8, e a Final Four são as semifinais.

### Formato 1: cabeças de chave (padrão)

A ordem dos slots da primeira rodada é construída de forma recursiva: começando com `[1, 2]`, cada cabeça `s` de um chaveamento de tamanho `n/2` passa a enfrentar `n + 1 − s` no chaveamento de tamanho `n`. Para 128 isso gera `1×128, 64×65, 32×97, 33×96, ...`, a mesma lógica do March Madness. Consequências:

- a soma das cabeças em todo confronto da primeira rodada é 129;
- as cabeças 1 e 2 só podem se encontrar na final; 1, 2, 3 e 4 só nas semifinais;
- se as favoritas vencerem sempre, as semifinais são 1×4 e 2×3.

O chaveamento é dividido em quatro **lados** de 32 músicas (Lado A com a cabeça 1, B com a 4, C com a 2 e D com a 3). O vencedor de cada lado vai à Final Four: A enfrenta B e C enfrenta D.

### Formato 2: sorteio salvo

As 128 músicas são embaralhadas (Fisher–Yates) por um gerador pseudoaleatório determinístico (mulberry32) iniciado com um número sorteado uma única vez. O número e a ordem resultante ficam salvos, então recarregar a página nunca muda os confrontos. Antes do primeiro voto dá para *Sortear de novo*; depois do primeiro voto o formato fica travado.

### Escolhas, correções e desfazer

O estado guarda só duas coisas: a ordem dos 128 slots e a vencedora de cada confronto decidido. As participantes de qualquer confronto são sempre **calculadas** a partir disso, nunca copiadas. Por isso o chaveamento não pode exibir vencedoras inconsistentes.

- **Votar duas vezes no mesmo confronto** não faz nada: a segunda escolha igual é ignorada, e os botões ficam desativados durante a animação.
- **Trocar um resultado antigo** muda a participante do confronto seguinte. Esse confronto e todos os que dependem dele são apagados em cascata, e o site avisa antes quantos resultados serão perdidos. Uma música eliminada nunca reaparece onde não deveria.
- **Desfazer** guarda, para cada alteração, a escolha anterior e tudo o que ela apagou; desfazer restaura exatamente o estado anterior. Dá para desfazer em sequência até o início.
- **Tocar** é um botão separado do voto e nunca registra uma escolha.

### Persistência

Tudo é salvo no `localStorage` a cada voto:

| Chave | Conteúdo |
|---|---|
| `st128:state:v1` | as 128 músicas usadas, formato, número do sorteio, ordem dos confrontos, vencedoras e histórico para desfazer |
| `st128:links:v1` | links do Spotify adicionados por você (sobrevivem à reinicialização) |
| `st128:covers:v1` | endereços das capas oficiais já carregadas |
| `st128:settings:v1` | preferência de avanço automático |

Ao abrir o site, o estado salvo é validado: músicas, ordem e cada vencedora. Resultados incoerentes são descartados com aviso; um estado ilegível é copiado para `st128:state:backup` antes de um novo torneio começar. Se o torneio for alterado em outra aba, as demais se atualizam em vez de sobrescrever o progresso. Se o navegador bloquear o armazenamento (modo privado restrito), um aviso explica que o progresso vale só até fechar a aba.

**Reiniciar** pede confirmação e apaga só o torneio; a lista de músicas e os links continuam.

---

## Telas

- **Início:** nome, explicação, participantes, fase atual, confrontos restantes, progresso por rodada, escolha do formato e reinício.
- **Confronto:** as duas músicas lado a lado (empilhadas no celular), com capa, cabeça de chave, posição histórica, streams, *Tocar* (player do Spotify) e *Escolher vencedora*; comparação de streams; navegação entre confrontos; desfazer; tela cheia para votar em grupo num telão.
- **Chaveamento:** os quatro lados e a Final Four, com classificadas, eliminadas e o próximo voto destacados. Cada confronto pronto é clicável.
- **Músicas:** busca por nome e por artista (inclui participações), ordenação por ranking, streams ou nome, filtro por situação (aguardando, classificada, eliminada, campeã) e links.
- **Estatísticas:** totais, rodada atual, progresso, campeã, artistas com mais músicas vivas e a maior surpresa.
- **Campeã:** capa, dados, mensagem, caminho até o título com as sete adversárias derrotadas e novo torneio.
- **Dados:** fonte e data, links, importação e exportação.

**Atalhos na tela de confronto:** `1` e `2` escolhem a vencedora, `←` e `→` trocam de confronto, `Z` desfaz.

---

## Como atualizar os dados no futuro

### Automático (recomendado)

```bash
node tools/atualizar-dados.mjs
```

O script baixa o ranking do Kworb, descarta faixas que não são música e duplicatas, pega as 128 primeiras, mantém os IDs do Spotify e as participações já cadastradas, busca nas páginas de artista do Kworb o ID das músicas que entraram e regrava `data/songs.json`, `data/songs.js` e a tabela deste README. No final, lista o que entrou e o que saiu. Se uma música nova entrar sem participações cadastradas, ele avisa para você conferir.

Também aceita uma cópia salva da página: `node tools/atualizar-dados.mjs pagina-kworb.html`.

> O script foi testado contra a página ao vivo do Kworb em 14/10/2026. Se o Kworb mudar o HTML, o script para com uma mensagem clara em vez de gravar dados ruins.

Um workflow do GitHub Actions (`.github/workflows/atualizar-dados.yml`) roda o script uma vez por dia e só faz commit quando os dados mudam. Como os streams mudam todo dia, na prática há um commit quase diário.

Um torneio em andamento continua com as músicas com que começou. Quando houver dados novos, a página *Dados* oferece começar um torneio novo com eles.

### Manual

Edite `data/songs.json` e depois recrie a cópia para uso sem servidor:

```bash
node -e "const d=require('./data/songs.json');require('fs').writeFileSync('data/songs.js','window.SPOTIFY_TOP128_DATA = '+JSON.stringify(d,null,2)+';\n')"
```

### Importando pelo site

Na página *Dados*, escolha um arquivo. O site valida antes de usar e lista os problemas encontrados.

**JSON:** mesmo formato de `data/songs.json`:

```json
{
  "meta": { "referenceDate": "2026-10-12", "source": { "name": "...", "url": "..." } },
  "songs": [
    { "id": "kw-001", "rank": 1, "title": "Blinding Lights", "artist": "The Weeknd",
      "features": [], "streams": 5629909555, "dailyStreams": 1553322, "spotifyId": null }
  ]
}
```

**CSV:** separado por vírgula ou ponto e vírgula, com cabeçalho. Obrigatórias: `rank, title, artist, streams`. Opcionais: `features` (nomes separados por `;` ou `|`), `spotify_id` (aceita link, URI `spotify:track:` ou ID), `daily`.

```csv
rank,title,artist,features,streams,spotify_id
1,Blinding Lights,The Weeknd,,5629909555,
6,One Dance,Drake,Wizkid; Kyla,4511040864,
```

**Regras de validação:** exatamente 128 músicas; nome, artista, posição e streams obrigatórios; posições e identificadores únicos; a mesma música (artista + título) não pode aparecer duas vezes; links do Spotify inválidos são ignorados com aviso; streams fora de ordem decrescente geram aviso.

---

## Testes realizados

### Automatizados (`node --test`)

Rode na raiz do projeto. No Node 22 ou mais novo, `node --test tests/` não funciona, porque o argumento é tratado como padrão de arquivo; use `node --test` sem argumentos ou `node --test tests/*.test.js`.

Lógica do torneio (`tests/core.test.js`):

1. Os dados padrão têm exatamente 128 músicas únicas, com fonte, data e streams válidos.
2. A ordem de cabeças de chave segue 1×128, 64×65..., com 1 e 2 em metades opostas e 1 a 4 em quartos diferentes.
3. Com as favoritas sempre vencendo, as semifinais são 1×4 e 2×3 e a final é 1×2.
4. O torneio completo tem 127 confrontos, uma campeã, 127 eliminadas e um caminho de 7 vitórias.
5. Repetir a mesma escolha não conta duas vezes.
6. Não aceita voto em confronto incompleto, inexistente ou em música de fora do confronto.
7. Trocar um resultado da primeira rodada apaga as 6 rodadas dependentes e nenhuma eliminada reaparece.
8. Desfazer restaura exatamente o estado anterior, inclusive o que foi apagado em cascata.
9. O sorteio é determinístico com o mesmo número e muda com outro.
10. O estado sobrevive a salvar e recarregar sem alterações.
11. Um estado adulterado é reparado (vencedoras impossíveis descartadas) ou recusado (ordem inválida).
12. A validação recusa listas com 127 músicas, duplicadas ou sem streams.
13. Links do Spotify: aceita link, link com `intl-pt`, URI e ID; recusa álbum, outros sites e `javascript:`.
14. CSV com aspas, vírgula no nome do artista, ponto e vírgula como separador e participações.

Script de atualização (`tests/atualizar-dados.test.js`):

1. Lê a tabela de texto do ranking do Kworb (formato da página ao vivo).
2. Lê o índice de artistas e a página de músicas de cada artista.
3. Escolhe a versão certa da faixa pelo título e pelos streams, e deixa sem ID quando nada bate.
4. Regrava a tabela do README entre os marcadores.

### Ponta a ponta no navegador (Chromium headless, 46 de 46 verificações)

Torneio completo até a campeã; primeiro confronto 1×128; links com `target="_blank"` e `rel="noopener noreferrer"`; abrir o Spotify não registra voto; destaque da vencedora e da eliminada; avanço automático e manual; atalhos de teclado sem voto duplo; progresso após recarregar; sorteio salvo após recarregar; confirmação com contagem ao trocar resultado; desfazer pelo botão e pela tecla Z; voto feito em outra aba preservado; busca por música e artista; filtros e ordenação; link inválido recusado e link válido salvo; estatísticas; importação recusando lista incompleta; reinício cancelado e confirmado; estado corrompido com aviso; ausência de rolagem horizontal no celular (390 px) em todas as telas; site funcionando aberto direto do arquivo (`file://`); nenhum erro de JavaScript no console.

---

## Limitações conhecidas

- **Músicas novas no ranking** só ganham link direto se o artista estiver na lista de artistas do Kworb. Se o script não achar o ID, ele avisa e o botão vira *Vincular faixa*.
- **Capas oficiais** usam o oEmbed público do Spotify, chamado pelo navegador. Se o Spotify bloquear a requisição (por política de CORS ou limite de uso), a capa gerada continua sendo exibida.
- **Os números mudam todo dia.** Os streams são uma foto do dia da última atualização; o site sempre mostra a data de referência.
- **Fonte tipográfica** (Archivo) vem do Google Fonts. Sem internet, o site usa uma fonte condensada do sistema e continua funcionando.
- **Progresso por navegador:** o torneio fica no `localStorage` daquele navegador e aparelho; não há sincronização entre dispositivos.
- **Reprodução de áudio** não acontece dentro do site, de propósito: a música abre no Spotify.

Projeto de fãs, sem vínculo com o Spotify ou com o Kworb.
