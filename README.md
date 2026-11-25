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
| Data de referência | **25/11/2026** (página consultada nesta data; o Kworb atualiza diariamente) |
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
`Cab.` é a cabeça de chave. `Kworb` é a posição original no ranking do Kworb em 25/11/2026.

| Cab. | Kworb | Música | Artista(s) | Streams |
|---:|---:|---|---|---:|
| 1 | 1 | Blinding Lights | The Weeknd | 5.695.562.227 |
| 2 | 2 | Shape of You | Ed Sheeran | 5.203.258.294 |
| 3 | 3 | Sweater Weather | The Neighbourhood | 5.055.319.941 |
| 4 | 4 | Starboy | The Weeknd com Daft Punk | 4.885.326.906 |
| 5 | 5 | As It Was | Harry Styles | 4.728.369.677 |
| 6 | 6 | One Dance | Drake com Wizkid, Kyla | 4.582.043.516 |
| 7 | 7 | Sunflower | Post Malone com Swae Lee | 4.571.373.119 |
| 8 | 8 | Someone You Loved | Lewis Capaldi | 4.508.655.905 |
| 9 | 9 | Perfect | Ed Sheeran | 4.198.108.507 |
| 10 | 10 | Die With A Smile | Lady Gaga com Bruno Mars | 4.168.143.902 |
| 11 | 11 | STAY | The Kid LAROI | 4.147.085.213 |
| 12 | 12 | I Wanna Be Yours | Arctic Monkeys | 4.132.765.108 |
| 13 | 13 | BIRDS OF A FEATHER | Billie Eilish | 4.124.942.089 |
| 14 | 14 | Yellow | Coldplay | 4.107.677.412 |
| 15 | 15 | The Night We Met | Lord Huron | 4.055.746.491 |
| 16 | 16 | Riptide | Vance Joy | 4.027.380.288 |
| 17 | 17 | Believer | Imagine Dragons | 4.025.014.961 |
| 18 | 18 | Heat Waves | Glass Animals | 4.007.603.956 |
| 19 | 19 | Closer | The Chainsmokers com Halsey | 3.971.992.789 |
| 20 | 20 | lovely | Billie Eilish com Khalid | 3.947.610.618 |
| 21 | 21 | Every Breath You Take | The Police | 3.898.112.940 |
| 22 | 22 | Iris | The Goo Goo Dolls | 3.889.386.632 |
| 23 | 23 | Something Just Like This | The Chainsmokers com Coldplay | 3.850.463.974 |
| 24 | 24 | Another Love | Tom Odell | 3.784.829.864 |
| 25 | 25 | Say You Won't Let Go | James Arthur | 3.751.505.056 |
| 26 | 26 | Counting Stars | OneRepublic | 3.743.541.473 |
| 27 | 27 | Take Me To Church | Hozier | 3.664.294.780 |
| 28 | 28 | Viva La Vida | Coldplay | 3.625.577.552 |
| 29 | 29 | Locked out of Heaven | Bruno Mars | 3.625.562.626 |
| 30 | 30 | Photograph | Ed Sheeran | 3.625.248.414 |
| 31 | 31 | Mr. Brightside | The Killers | 3.622.452.722 |
| 32 | 32 | Can't Hold Us | Macklemore & Ryan Lewis com Ray Dalton | 3.601.150.190 |
| 33 | 33 | Just The Way You Are | Bruno Mars | 3.581.889.678 |
| 34 | 34 | Dance Monkey | Tones And I | 3.551.097.641 |
| 35 | 35 | Cruel Summer | Taylor Swift | 3.544.448.983 |
| 36 | 36 | Die For You | The Weeknd | 3.518.486.845 |
| 37 | 37 | rockstar | Post Malone com 21 Savage | 3.491.801.098 |
| 38 | 38 | That's What I Like | Bruno Mars | 3.489.497.887 |
| 39 | 39 | In the End | Linkin Park | 3.482.021.745 |
| 40 | 40 | Señorita | Shawn Mendes com Camila Cabello | 3.480.294.078 |
| 41 | 41 | Watermelon Sugar | Harry Styles | 3.447.934.524 |
| 42 | 42 | Love Yourself | Justin Bieber | 3.436.742.463 |
| 43 | 43 | Billie Jean | Michael Jackson | 3.393.430.923 |
| 44 | 44 | When I Was Your Man | Bruno Mars | 3.376.602.480 |
| 45 | 45 | Don’t Start Now | Dua Lipa | 3.372.138.663 |
| 46 | 46 | Circles | Post Malone | 3.349.476.951 |
| 47 | 47 | Bohemian Rhapsody | Queen | 3.344.141.931 |
| 48 | 48 | Let Me Love You | DJ Snake com Justin Bieber | 3.313.190.132 |
| 49 | 49 | Without Me | Eminem | 3.311.162.720 |
| 50 | 50 | Wake Me Up | Avicii | 3.297.994.638 |
| 51 | 51 | Thinking out Loud | Ed Sheeran | 3.282.042.762 |
| 52 | 52 | goosebumps | Travis Scott com Kendrick Lamar | 3.279.292.719 |
| 53 | 53 | Treat You Better | Shawn Mendes | 3.277.651.094 |
| 54 | 54 | Creep | Radiohead | 3.272.978.272 |
| 55 | 55 | All The Stars | Kendrick Lamar com SZA | 3.265.903.257 |
| 56 | 56 | Espresso | Sabrina Carpenter | 3.265.852.073 |
| 57 | 57 | Beautiful Things | Benson Boone | 3.264.107.888 |
| 58 | 58 | All Of Me | John Legend | 3.255.196.385 |
| 59 | 59 | Lucid Dreams | Juice WRLD | 3.246.467.887 |
| 60 | 60 | Stressed Out | Twenty One Pilots | 3.245.405.197 |
| 61 | 61 | God's Plan | Drake | 3.241.314.940 |
| 62 | 62 | Do I Wanna Know? | Arctic Monkeys | 3.236.067.689 |
| 63 | 63 | The Hills | The Weeknd | 3.228.137.076 |
| 64 | 64 | Shallow | Lady Gaga com Bradley Cooper | 3.222.046.593 |
| 65 | 65 | Wonderwall | Oasis | 3.212.605.809 |
| 66 | 66 | See You Again | Tyler, The Creator com Kali Uchis | 3.209.262.667 |
| 67 | 67 | Demons | Imagine Dragons | 3.206.773.300 |
| 68 | 68 | Smells Like Teen Spirit | Nirvana | 3.190.805.271 |
| 69 | 69 | Thunder | Imagine Dragons | 3.164.075.402 |
| 70 | 70 | Unforgettable | French Montana com Swae Lee | 3.157.381.383 |
| 71 | 71 | Seven | Jung Kook com Latto | 3.154.076.404 |
| 72 | 72 | 505 | Arctic Monkeys | 3.151.579.552 |
| 73 | 73 | Sorry | Justin Bieber | 3.151.408.871 |
| 74 | 75 | No Role Modelz | J. Cole | 3.110.289.935 |
| 75 | 76 | End of Beginning | Djo | 3.093.652.927 |
| 76 | 77 | Lose Yourself | Eminem | 3.085.269.814 |
| 77 | 78 | The Scientist | Coldplay | 3.080.438.206 |
| 78 | 79 | There's Nothing Holdin' Me Back | Shawn Mendes | 3.079.905.796 |
| 79 | 80 | Don't Stop Believin' | Journey | 3.076.527.918 |
| 80 | 81 | Dreams | Fleetwood Mac | 3.042.667.810 |
| 81 | 82 | Flowers | Miley Cyrus | 3.039.621.489 |
| 82 | 83 | HUMBLE. | Kendrick Lamar | 3.028.104.878 |
| 83 | 84 | drivers license | Olivia Rodrigo | 3.022.922.811 |
| 84 | 85 | bad guy | Billie Eilish | 3.009.495.165 |
| 85 | 86 | Take on Me | a-ha | 3.008.600.799 |
| 86 | 87 | Numb | Linkin Park | 3.007.936.021 |
| 87 | 88 | One Of The Girls | The Weeknd com JENNIE, Lily-Rose Depp | 2.980.572.767 |
| 88 | 89 | 7 rings | Ariana Grande | 2.979.989.144 |
| 89 | 90 | Sweet Child O' Mine | Guns N' Roses | 2.977.260.940 |
| 90 | 91 | Kill Bill | SZA | 2.951.750.596 |
| 91 | 92 | Let Her Go | Passenger | 2.947.275.841 |
| 92 | 93 | Save Your Tears | The Weeknd | 2.913.899.901 |
| 93 | 94 | Payphone | Maroon 5 com Wiz Khalifa | 2.888.537.802 |
| 94 | 95 | Cold Heart | Elton John com Dua Lipa, PNAU | 2.864.074.292 |
| 95 | 96 | Lean On | Major Lazer com MØ, DJ Snake | 2.859.321.451 |
| 96 | 97 | Uptown Funk | Mark Ronson com Bruno Mars | 2.857.332.793 |
| 97 | 98 | Danza Kuduro | Don Omar com Lucenzo | 2.855.333.548 |
| 98 | 99 | Africa | TOTO | 2.840.256.373 |
| 99 | 100 | One Kiss | Calvin Harris com Dua Lipa | 2.839.256.983 |
| 100 | 101 | Don't Stop Me Now | Queen | 2.833.248.427 |
| 101 | 102 | We Don't Talk Anymore | Charlie Puth com Selena Gomez | 2.829.465.460 |
| 102 | 103 | Somewhere Only We Know | Keane | 2.800.447.604 |
| 103 | 104 | Night Changes | One Direction | 2.799.478.983 |
| 104 | 105 | LA CANCIÓN | J Balvin com Bad Bunny | 2.788.980.491 |
| 105 | 106 | Everybody Wants To Rule The World | Tears For Fears | 2.786.348.758 |
| 106 | 107 | Hips Don't Lie | Shakira com Wyclef Jean | 2.777.548.392 |
| 107 | 108 | Someone Like You | Adele | 2.766.740.148 |
| 108 | 109 | good 4 u | Olivia Rodrigo | 2.761.777.184 |
| 109 | 110 | We Found Love | Calvin Harris com Rihanna | 2.759.083.867 |
| 110 | 111 | Happier | Marshmello com Bastille | 2.742.286.182 |
| 111 | 112 | Lose Control | Teddy Swims | 2.739.832.649 |
| 112 | 113 | APT. | ROSÉ com Bruno Mars | 2.720.088.200 |
| 113 | 114 | Gangsta's Paradise | Coolio com L.V. | 2.719.202.059 |
| 114 | 115 | Levitating | Dua Lipa | 2.718.863.286 |
| 115 | 116 | SICKO MODE | Travis Scott com Drake | 2.712.082.887 |
| 116 | 117 | Lush Life | Zara Larsson | 2.703.487.071 |
| 117 | 118 | Attention | Charlie Puth | 2.699.364.528 |
| 118 | 119 | Me Rehúso | Danny Ocean | 2.694.493.839 |
| 119 | 120 | The Less I Know The Better | Tame Impala | 2.693.970.166 |
| 120 | 121 | Stitches | Shawn Mendes | 2.693.589.457 |
| 121 | 122 | Apocalypse | Cigarettes After Sex | 2.685.971.834 |
| 122 | 123 | Blank Space | Taylor Swift | 2.683.004.208 |
| 123 | 124 | 7 Years | Lukas Graham | 2.673.896.059 |
| 124 | 125 | New Rules | Dua Lipa | 2.673.372.225 |
| 125 | 126 | Somebody That I Used To Know | Gotye com Kimbra | 2.671.870.368 |
| 126 | 127 | Pumped Up Kicks | Foster The People | 2.668.064.159 |
| 127 | 128 | I'm Not The Only One | Sam Smith | 2.657.741.367 |
| 128 | 129 | Mockingbird | Eminem | 2.657.658.185 |

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
