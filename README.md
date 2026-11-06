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
| Data de referência | **06/11/2026** (página consultada nesta data; o Kworb atualiza diariamente) |
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
`Cab.` é a cabeça de chave. `Kworb` é a posição original no ranking do Kworb em 06/11/2026.

| Cab. | Kworb | Música | Artista(s) | Streams |
|---:|---:|---|---|---:|
| 1 | 1 | Blinding Lights | The Weeknd | 5.668.555.657 |
| 2 | 2 | Shape of You | Ed Sheeran | 5.174.271.837 |
| 3 | 3 | Sweater Weather | The Neighbourhood | 5.009.061.556 |
| 4 | 4 | Starboy | The Weeknd com Daft Punk | 4.850.892.212 |
| 5 | 5 | As It Was | Harry Styles | 4.702.596.019 |
| 6 | 6 | One Dance | Drake com Wizkid, Kyla | 4.551.661.582 |
| 7 | 7 | Sunflower | Post Malone com Swae Lee | 4.545.375.748 |
| 8 | 8 | Someone You Loved | Lewis Capaldi | 4.489.788.194 |
| 9 | 9 | Perfect | Ed Sheeran | 4.174.401.264 |
| 10 | 10 | STAY | The Kid LAROI com Justin Bieber | 4.128.024.066 |
| 11 | 11 | Die With A Smile | Lady Gaga com Bruno Mars | 4.122.612.627 |
| 12 | 12 | I Wanna Be Yours | Arctic Monkeys | 4.094.908.799 |
| 13 | 13 | BIRDS OF A FEATHER | Billie Eilish | 4.088.166.441 |
| 14 | 14 | Yellow | Coldplay | 4.074.422.158 |
| 15 | 15 | The Night We Met | Lord Huron | 4.022.779.743 |
| 16 | 16 | Believer | Imagine Dragons | 4.008.127.475 |
| 17 | 17 | Riptide | Vance Joy | 3.997.681.642 |
| 18 | 18 | Heat Waves | Glass Animals | 3.986.592.463 |
| 19 | 19 | Closer | The Chainsmokers com Halsey | 3.947.552.945 |
| 20 | 20 | lovely | Billie Eilish com Khalid | 3.928.901.543 |
| 21 | 21 | Every Breath You Take | The Police | 3.859.221.839 |
| 22 | 22 | Iris | The Goo Goo Dolls | 3.843.296.236 |
| 23 | 23 | Something Just Like This | The Chainsmokers com Coldplay | 3.828.435.221 |
| 24 | 24 | Another Love | Tom Odell | 3.761.419.220 |
| 25 | 25 | Say You Won't Let Go | James Arthur | 3.735.957.685 |
| 26 | 26 | Counting Stars | OneRepublic | 3.715.895.006 |
| 27 | 27 | Take Me To Church | Hozier | 3.642.732.247 |
| 28 | 28 | Photograph | Ed Sheeran | 3.606.093.244 |
| 29 | 29 | Viva La Vida | Coldplay | 3.597.954.737 |
| 30 | 30 | Locked out of Heaven | Bruno Mars | 3.592.712.249 |
| 31 | 31 | Mr. Brightside | The Killers | 3.582.218.907 |
| 32 | 32 | Can't Hold Us | Macklemore & Ryan Lewis com Ray Dalton | 3.581.786.035 |
| 33 | 33 | Just The Way You Are | Bruno Mars | 3.554.101.611 |
| 34 | 34 | Dance Monkey | Tones And I | 3.540.800.002 |
| 35 | 35 | Cruel Summer | Taylor Swift | 3.529.924.011 |
| 36 | 36 | Die For You | The Weeknd | 3.491.209.240 |
| 37 | 37 | rockstar | Post Malone com 21 Savage | 3.481.495.988 |
| 38 | 38 | Señorita | Shawn Mendes com Camila Cabello | 3.464.280.749 |
| 39 | 39 | That's What I Like | Bruno Mars | 3.463.714.009 |
| 40 | 40 | In the End | Linkin Park | 3.451.297.699 |
| 41 | 41 | Watermelon Sugar | Harry Styles | 3.435.209.160 |
| 42 | 42 | Love Yourself | Justin Bieber | 3.415.595.696 |
| 43 | 43 | Don’t Start Now | Dua Lipa | 3.359.530.001 |
| 44 | 44 | Billie Jean | Michael Jackson | 3.356.856.092 |
| 45 | 45 | When I Was Your Man | Bruno Mars | 3.355.498.203 |
| 46 | 46 | Circles | Post Malone | 3.329.959.892 |
| 47 | 47 | Bohemian Rhapsody | Queen | 3.323.702.753 |
| 48 | 48 | Without Me | Eminem | 3.289.343.895 |
| 49 | 49 | Let Me Love You | DJ Snake com Justin Bieber | 3.288.334.968 |
| 50 | 50 | Wake Me Up | Avicii | 3.280.749.790 |
| 51 | 51 | goosebumps | Travis Scott com Kendrick Lamar | 3.263.492.937 |
| 52 | 52 | Thinking out Loud | Ed Sheeran | 3.262.884.921 |
| 53 | 53 | Espresso | Sabrina Carpenter | 3.243.993.999 |
| 54 | 54 | All The Stars | Kendrick Lamar com SZA | 3.240.709.543 |
| 55 | 55 | Treat You Better | Shawn Mendes | 3.238.267.937 |
| 56 | 56 | Beautiful Things | Benson Boone | 3.237.425.616 |
| 57 | 57 | All Of Me | John Legend | 3.236.296.261 |
| 58 | 58 | Creep | Radiohead | 3.234.651.881 |
| 59 | 59 | Lucid Dreams | Juice WRLD | 3.234.256.837 |
| 60 | 60 | Stressed Out | Twenty One Pilots | 3.223.409.523 |
| 61 | 61 | God's Plan | Drake | 3.223.015.978 |
| 62 | 62 | The Hills | The Weeknd | 3.208.056.771 |
| 63 | 63 | Shallow | Lady Gaga com Bradley Cooper | 3.207.504.897 |
| 64 | 64 | Do I Wanna Know? | Arctic Monkeys | 3.206.682.753 |
| 65 | 65 | Demons | Imagine Dragons | 3.188.800.732 |
| 66 | 66 | See You Again | Tyler, The Creator com Kali Uchis | 3.183.470.222 |
| 67 | 67 | Wonderwall | Oasis | 3.180.276.178 |
| 68 | 68 | Smells Like Teen Spirit | Nirvana | 3.163.090.786 |
| 69 | 69 | Thunder | Imagine Dragons | 3.148.816.332 |
| 70 | 70 | Seven | Jung Kook com Latto | 3.135.227.755 |
| 71 | 71 | Unforgettable | French Montana com Swae Lee | 3.133.842.335 |
| 72 | 72 | Sorry | Justin Bieber | 3.130.133.804 |
| 73 | 73 | 505 | Arctic Monkeys | 3.118.977.393 |
| 74 | 75 | No Role Modelz | J. Cole | 3.089.945.391 |
| 75 | 76 | Lose Yourself | Eminem | 3.067.261.513 |
| 76 | 77 | The Scientist | Coldplay | 3.058.269.782 |
| 77 | 78 | Don't Stop Believin' | Journey | 3.057.389.419 |
| 78 | 79 | There's Nothing Holdin' Me Back | Shawn Mendes | 3.054.657.238 |
| 79 | 80 | End of Beginning | Djo | 3.053.213.199 |
| 80 | 81 | Flowers | Miley Cyrus | 3.025.905.764 |
| 81 | 82 | HUMBLE. | Kendrick Lamar | 3.017.483.120 |
| 82 | 83 | Dreams | Fleetwood Mac | 3.016.552.354 |
| 83 | 84 | drivers license | Olivia Rodrigo | 3.003.173.708 |
| 84 | 85 | bad guy | Billie Eilish | 3.001.766.988 |
| 85 | 86 | Take on Me | a-ha | 2.988.735.964 |
| 86 | 87 | Numb | Linkin Park | 2.982.396.207 |
| 87 | 88 | 7 rings | Ariana Grande | 2.965.136.617 |
| 88 | 89 | Sweet Child O' Mine | Guns N' Roses | 2.951.794.835 |
| 89 | 90 | One Of The Girls | The Weeknd com JENNIE, Lily-Rose Depp | 2.943.277.142 |
| 90 | 91 | Kill Bill | SZA | 2.935.916.294 |
| 91 | 92 | Payphone | Maroon 5 com Wiz Khalifa | 2.935.685.040 |
| 92 | 93 | Let Her Go | Passenger | 2.934.821.944 |
| 93 | 94 | Save Your Tears | The Weeknd | 2.892.818.337 |
| 94 | 95 | Cold Heart | Elton John com Dua Lipa, PNAU | 2.850.998.721 |
| 95 | 96 | Lean On | Major Lazer com MØ, DJ Snake | 2.844.644.662 |
| 96 | 97 | Uptown Funk | Mark Ronson com Bruno Mars | 2.838.955.363 |
| 97 | 98 | Danza Kuduro | Don Omar com Lucenzo | 2.830.196.614 |
| 98 | 99 | One Kiss | Calvin Harris com Dua Lipa | 2.826.329.168 |
| 99 | 100 | Africa | TOTO | 2.818.143.769 |
| 100 | 101 | Don't Stop Me Now | Queen | 2.815.275.035 |
| 101 | 102 | We Don't Talk Anymore | Charlie Puth com Selena Gomez | 2.806.867.289 |
| 102 | 103 | Night Changes | One Direction | 2.778.393.904 |
| 103 | 104 | Somewhere Only We Know | Keane | 2.775.421.139 |
| 104 | 105 | LA CANCIÓN | J Balvin com Bad Bunny | 2.769.271.638 |
| 105 | 106 | Everybody Wants To Rule The World | Tears For Fears | 2.763.039.567 |
| 106 | 107 | Hips Don't Lie | Shakira com Wyclef Jean | 2.755.801.925 |
| 107 | 108 | good 4 u | Olivia Rodrigo | 2.750.773.026 |
| 108 | 109 | Someone Like You | Adele | 2.749.050.427 |
| 109 | 110 | We Found Love | Calvin Harris com Rihanna | 2.735.251.084 |
| 110 | 111 | Happier | Marshmello com Bastille | 2.727.157.938 |
| 111 | 112 | Lose Control | Teddy Swims | 2.716.982.951 |
| 112 | 113 | Levitating | Dua Lipa | 2.707.049.431 |
| 113 | 114 | Gangsta's Paradise | Coolio com L.V. | 2.699.768.444 |
| 114 | 115 | APT. | ROSÉ com Bruno Mars | 2.698.476.524 |
| 115 | 116 | SICKO MODE | Travis Scott com Drake | 2.698.370.790 |
| 116 | 117 | Lush Life | Zara Larsson | 2.680.284.527 |
| 117 | 118 | Attention | Charlie Puth | 2.679.265.576 |
| 118 | 119 | Stitches | Shawn Mendes | 2.674.466.293 |
| 119 | 120 | Me Rehúso | Danny Ocean | 2.671.044.012 |
| 120 | 121 | The Less I Know The Better | Tame Impala | 2.670.116.228 |
| 121 | 122 | New Rules | Dua Lipa | 2.662.929.257 |
| 122 | 123 | Blank Space | Taylor Swift | 2.661.046.583 |
| 123 | 124 | 7 Years | Lukas Graham | 2.659.044.936 |
| 124 | 125 | Apocalypse | Cigarettes After Sex | 2.656.261.723 |
| 125 | 126 | Somebody That I Used To Know | Gotye com Kimbra | 2.650.570.560 |
| 126 | 127 | Pumped Up Kicks | Foster The People | 2.649.705.103 |
| 127 | 128 | I'm Not The Only One | Sam Smith | 2.641.565.720 |
| 128 | 129 | Mockingbird | Eminem | 2.641.148.939 |

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
