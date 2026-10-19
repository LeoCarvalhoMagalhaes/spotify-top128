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
| Data de referência | **19/10/2026** (página consultada nesta data; o Kworb atualiza diariamente) |
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
`Cab.` é a cabeça de chave. `Kworb` é a posição original no ranking do Kworb em 19/10/2026.

| Cab. | Kworb | Música | Artista(s) | Streams |
|---:|---:|---|---|---:|
| 1 | 1 | Blinding Lights | The Weeknd | 5.640.607.896 |
| 2 | 2 | Shape of You | Ed Sheeran | 5.148.315.381 |
| 3 | 3 | Sweater Weather | The Neighbourhood | 4.962.514.316 |
| 4 | 4 | Starboy | The Weeknd com Daft Punk | 4.818.591.488 |
| 5 | 5 | As It Was | Harry Styles | 4.676.875.701 |
| 6 | 6 | One Dance | Drake com Wizkid, Kyla | 4.522.445.801 |
| 7 | 7 | Sunflower | Post Malone com Swae Lee | 4.519.033.107 |
| 8 | 8 | Someone You Loved | Lewis Capaldi | 4.471.843.067 |
| 9 | 9 | Perfect | Ed Sheeran | 4.152.368.750 |
| 10 | 10 | STAY | The Kid LAROI com Justin Bieber | 4.110.512.745 |
| 11 | 11 | Die With A Smile | Lady Gaga com Bruno Mars | 4.075.334.959 |
| 12 | 12 | I Wanna Be Yours | Arctic Monkeys | 4.061.456.074 |
| 13 | 13 | BIRDS OF A FEATHER | Billie Eilish | 4.050.702.591 |
| 14 | 14 | Yellow | Coldplay | 4.041.588.938 |
| 15 | 15 | Believer | Imagine Dragons | 3.991.607.629 |
| 16 | 16 | The Night We Met | Lord Huron | 3.991.500.598 |
| 17 | 17 | Riptide | Vance Joy | 3.969.572.687 |
| 18 | 18 | Heat Waves | Glass Animals | 3.966.569.605 |
| 19 | 19 | Closer | The Chainsmokers com Halsey | 3.923.053.988 |
| 20 | 20 | lovely | Billie Eilish com Khalid | 3.911.208.124 |
| 21 | 21 | Every Breath You Take | The Police | 3.822.986.252 |
| 22 | 22 | Something Just Like This | The Chainsmokers com Coldplay | 3.809.821.847 |
| 23 | 23 | Iris | The Goo Goo Dolls | 3.795.741.861 |
| 24 | 24 | Another Love | Tom Odell | 3.738.165.650 |
| 25 | 25 | Say You Won't Let Go | James Arthur | 3.721.957.520 |
| 26 | 26 | Counting Stars | OneRepublic | 3.691.830.594 |
| 27 | 27 | Take Me To Church | Hozier | 3.624.018.457 |
| 28 | 28 | Photograph | Ed Sheeran | 3.587.230.995 |
| 29 | 29 | Viva La Vida | Coldplay | 3.571.014.687 |
| 30 | 30 | Locked Out of Heaven | Bruno Mars | 3.559.496.746 |
| 31 | 31 | Can't Hold Us | Macklemore & Ryan Lewis com Ray Dalton | 3.557.856.360 |
| 32 | 32 | Mr. Brightside | The Killers | 3.542.994.950 |
| 33 | 33 | Dance Monkey | Tones And I | 3.531.547.734 |
| 34 | 34 | Just the Way You Are | Bruno Mars | 3.527.190.408 |
| 35 | 35 | Cruel Summer | Taylor Swift | 3.514.470.378 |
| 36 | 36 | rockstar | Post Malone com 21 Savage | 3.471.510.757 |
| 37 | 37 | Die For You | The Weeknd | 3.464.436.170 |
| 38 | 38 | Señorita | Shawn Mendes com Camila Cabello | 3.449.094.381 |
| 39 | 39 | That's What I Like | Bruno Mars | 3.440.460.141 |
| 40 | 40 | Watermelon Sugar | Harry Styles | 3.423.157.654 |
| 41 | 41 | In the End | Linkin Park | 3.422.546.634 |
| 42 | 42 | Love Yourself | Justin Bieber | 3.396.769.147 |
| 43 | 43 | Don’t Start Now | Dua Lipa | 3.346.679.285 |
| 44 | 44 | When I Was Your Man | Bruno Mars | 3.334.368.796 |
| 45 | 45 | Billie Jean | Michael Jackson | 3.316.894.961 |
| 46 | 46 | Circles | Post Malone | 3.310.989.931 |
| 47 | 47 | Bohemian Rhapsody | Queen | 3.305.048.156 |
| 48 | 48 | Without Me | Eminem | 3.269.092.343 |
| 49 | 49 | Let Me Love You | DJ Snake com Justin Bieber | 3.266.291.318 |
| 50 | 50 | Wake Me Up | Avicii | 3.264.514.961 |
| 51 | 51 | goosebumps | Travis Scott com Kendrick Lamar | 3.249.589.881 |
| 52 | 52 | Thinking out Loud | Ed Sheeran | 3.246.440.572 |
| 53 | 53 | Lucid Dreams | Juice WRLD | 3.223.118.596 |
| 54 | 54 | Espresso | Sabrina Carpenter | 3.222.325.201 |
| 55 | 55 | All of Me | John Legend | 3.218.265.946 |
| 56 | 56 | All The Stars | Kendrick Lamar com SZA | 3.217.564.635 |
| 57 | 57 | Beautiful Things | Benson Boone | 3.210.603.103 |
| 58 | 58 | God's Plan | Drake | 3.205.301.238 |
| 59 | 59 | Stressed Out | Twenty One Pilots | 3.203.910.464 |
| 60 | 60 | Treat You Better | Shawn Mendes | 3.198.583.689 |
| 61 | 61 | Creep | Radiohead | 3.197.328.350 |
| 62 | 62 | Shallow | Lady Gaga com Bradley Cooper | 3.194.751.518 |
| 63 | 63 | The Hills | The Weeknd | 3.189.427.437 |
| 64 | 64 | Do I Wanna Know? | Arctic Monkeys | 3.179.012.735 |
| 65 | 65 | Demons | Imagine Dragons | 3.172.294.662 |
| 66 | 66 | See You Again | Tyler, The Creator com Kali Uchis | 3.159.225.607 |
| 67 | 67 | Wonderwall | Oasis | 3.144.417.735 |
| 68 | 68 | Smells Like Teen Spirit | Nirvana | 3.136.716.178 |
| 69 | 69 | Thunder | Imagine Dragons | 3.135.568.484 |
| 70 | 70 | Seven | Jung Kook com Latto | 3.119.490.289 |
| 71 | 71 | Sorry | Justin Bieber | 3.111.688.750 |
| 72 | 72 | Unforgettable | French Montana com Swae Lee | 3.111.121.170 |
| 73 | 74 | 505 | Arctic Monkeys | 3.087.514.365 |
| 74 | 75 | No Role Modelz | J. Cole | 3.071.661.321 |
| 75 | 76 | Lose Yourself | Eminem | 3.050.299.829 |
| 76 | 77 | The Scientist | Coldplay | 3.037.464.318 |
| 77 | 78 | Don't Stop Believin' | Journey | 3.034.440.353 |
| 78 | 79 | There's Nothing Holdin' Me Back | Shawn Mendes | 3.030.671.368 |
| 79 | 80 | End of Beginning | Djo | 3.013.522.870 |
| 80 | 81 | Flowers | Miley Cyrus | 3.011.350.135 |
| 81 | 82 | HUMBLE. | Kendrick Lamar | 3.008.012.325 |
| 82 | 83 | bad guy | Billie Eilish | 2.991.709.300 |
| 83 | 84 | Dreams | Fleetwood Mac | 2.991.285.015 |
| 84 | 85 | drivers license | Olivia Rodrigo | 2.984.986.442 |
| 85 | 86 | Take on Me | a-ha | 2.966.200.038 |
| 86 | 87 | Numb | Linkin Park | 2.957.631.317 |
| 87 | 88 | 7 rings | Ariana Grande | 2.950.601.004 |
| 88 | 89 | Sweet Child O' Mine | Guns N' Roses | 2.927.549.855 |
| 89 | 90 | Let Her Go | Passenger | 2.922.699.394 |
| 90 | 91 | Kill Bill | SZA | 2.920.045.285 |
| 91 | 92 | Payphone | Maroon 5 com Wiz Khalifa | 2.909.338.408 |
| 92 | 93 | One Of The Girls | The Weeknd com JENNIE, Lily-Rose Depp | 2.905.473.987 |
| 93 | 94 | Save Your Tears | The Weeknd | 2.874.841.280 |
| 94 | 95 | Cold Heart | Elton John com Dua Lipa, PNAU | 2.838.778.991 |
| 95 | 96 | Lean On | Major Lazer com MØ, DJ Snake | 2.830.812.160 |
| 96 | 97 | Uptown Funk | Mark Ronson com Bruno Mars | 2.821.520.618 |
| 97 | 98 | One Kiss | Calvin Harris com Dua Lipa | 2.812.709.675 |
| 98 | 99 | Danza Kuduro | Don Omar com Lucenzo | 2.806.352.596 |
| 99 | 100 | Don't Stop Me Now | Queen | 2.799.230.103 |
| 100 | 101 | Africa | TOTO | 2.797.337.415 |
| 101 | 102 | We Don't Talk Anymore | Charlie Puth com Selena Gomez | 2.786.342.403 |
| 102 | 103 | Night Changes | One Direction | 2.758.075.532 |
| 103 | 104 | LA CANCIÓN | J Balvin com Bad Bunny | 2.751.407.641 |
| 104 | 105 | Somewhere Only We Know | Keane | 2.749.964.913 |
| 105 | 106 | good 4 u | Olivia Rodrigo | 2.740.005.227 |
| 106 | 107 | Everybody Wants To Rule The World | Tears For Fears | 2.738.573.664 |
| 107 | 108 | Hips Don't Lie | Shakira com Wyclef Jean | 2.733.001.817 |
| 108 | 109 | Someone Like You | Adele | 2.732.967.965 |
| 109 | 110 | Happier | Marshmello com Bastille | 2.713.964.311 |
| 110 | 111 | We Found Love | Calvin Harris com Rihanna | 2.711.804.489 |
| 111 | 112 | Levitating | Dua Lipa | 2.695.467.290 |
| 112 | 113 | Lose Control | Teddy Swims | 2.694.708.039 |
| 113 | 114 | SICKO MODE | Travis Scott com Drake | 2.685.774.147 |
| 114 | 115 | Gangsta's Paradise | Coolio com L.V. | 2.681.294.313 |
| 115 | 116 | APT. | ROSÉ com Bruno Mars | 2.674.438.404 |
| 116 | 117 | Attention | Charlie Puth | 2.660.779.571 |
| 117 | 118 | Stitches | Shawn Mendes | 2.655.977.527 |
| 118 | 119 | Lush Life | Zara Larsson | 2.654.751.664 |
| 119 | 120 | New Rules | Dua Lipa | 2.652.373.841 |
| 120 | 121 | Me Rehúso | Danny Ocean | 2.650.175.600 |
| 121 | 122 | The Less I Know The Better | Tame Impala | 2.647.870.540 |
| 122 | 123 | 7 Years | Lukas Graham | 2.644.792.162 |
| 123 | 124 | Blank Space | Taylor Swift | 2.638.375.174 |
| 124 | 125 | Pumped Up Kicks | Foster The People | 2.633.766.810 |
| 125 | 126 | Somebody That I Used To Know | Gotye com Kimbra | 2.631.499.994 |
| 126 | 127 | Apocalypse | Cigarettes After Sex | 2.628.269.502 |
| 127 | 128 | I'm Not The Only One | Sam Smith | 2.626.449.713 |
| 128 | 129 | Mockingbird | Eminem | 2.625.625.265 |

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
