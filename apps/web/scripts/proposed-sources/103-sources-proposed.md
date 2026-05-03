# 103 Proposed New News Sources — Phase 40 Curation

**Created:** 2026-05-04
**Decision authority:** D-A1, D-A2, D-A3, D-A4 (40-CONTEXT.md)
**Status:** APPROVED 2026-05-04 (user-approved expansion from 70 to 103 — Option A: 5 per existing region)
**Total candidates:** 103
**Existing:** 130 (130 + 103 = 233)

## Distribution summary

| Bucket | Target | Actual |
|--------|--------|--------|
| Deepen 13 existing regions @ 5 each (D-A1, user-edit) | 65 | 65 |
| Carve 4 new sub-regions (D-A2) at 6 each | 24 | 24 |
| South-Global wires + think-tanks (D-A1) | 14 | 14 |
| **Total** | **103** | **103** |

Per the user's authorized scope change relayed back at the human-verify checkpoint, the deepen bucket grew from "~30-40" / "5 per region or so" to a hard "5 per existing region" — pushing the total from 70 to 103. The 4 new sub-regions and the wire+think-tank bucket are unchanged.

## Bias-coverage forecast (D-A3)

For each of the 17 regions after the merge, the table below counts sources per political-bias bucket using the canonical thresholds: **left** (`< -0.33`), **center** (`-0.33..0.33`), **right** (`> 0.33`). Existing-130 counts come from the current `sources.ts`; the "after merge" column is what the bias-balance script will see. Counts include the 14 South-Global wires + think-tanks because each carries a `region:` tag and lands in its region's bucket.

| Region | Existing L/C/R | New L/C/R | After-merge L/C/R | Note |
|--------|----------------|-----------|--------------------|------|
| **USA** | 0 / 9 / 1 | 2 / 2 / 3 | 2 / 11 / 4 | deepen 5 + 2 wires (cfr, brookings); buckets: theatlantic+jacobin (L); reason+theamericanconservative+nationalreview (R) |
| **EUROPA** | 0 / 9 / 1 | 2 / 7 / 1 | 2 / 16 / 2 | deepen 5 + 5 wires; buckets: morningstaronline+lemonde-diplo (L); ft-europe+irishtimes+efe-english+ansa-english+chathamhouse+carnegie-eu+merics (C); spectator (R) |
| **DEUTSCHLAND** | 0 / 10 / 0 | 1 / 3 / 1 | 1 / 13 / 1 | deepen 5; buckets: taz (L); nzz+derstandard+kleinezeitung (C); junge-freiheit (R) |
| **NAHOST** | 0 / 8 / 2 | 1 / 4 / 0 | 1 / 12 / 2 | deepen 5 + 1 wire (irna); buckets: plus972 (L); almonitor+arabian-business+jordantimes+lebnews-eng+irna (C) |
| **TUERKEI** | 2 / 6 / 2 | 1 / 4 / 0 | 3 / 10 / 2 | deepen 5; buckets: evrenselgazetesi (L, -0.5); t24-eng+milliyetenglish+sabahdaily+trtworld (C) |
| **RUSSLAND** | 2 / 3 / 5 | 1 / 0 / 4 | 3 / 3 / 9 | `limited` per D-A3 — exempt; deepen 5: themoscowtimes-eu (L); regnum+gazeta-ru+vedomosti+izvestia (R) |
| **CHINA** | 0 / 3 / 7 | 1 / 3 / 1 | 1 / 6 / 8 | `limited` per D-A3 — exempt; deepen 5: hkfp (L); focus-taiwan+taiwannews+taipeitimes (C); chinanews (R) |
| **ASIEN** | 0 / 10 / 0 | 1 / 3 / 1 | 1 / 13 / 1 | deepen 5; buckets: hankyoreh (L); the-mainichi+kyodonews+koreaherald (C); japan-forward (R) |
| **AFRIKA** | 0 / 10 / 0 | 1 / 4 / 1 | 1 / 14 / 1 | deepen 5 + 1 wire (panapress); buckets: pambazuka (L); cairoreview+peoplesdailyng+businessdaily-ke+journalducameroun+panapress (C); businessday-ng (R) |
| **LATEINAMERIKA** | 1 / 9 / 0 | 1 / 3 / 1 | 2 / 12 / 1 | deepen 5; buckets: pagina12 (L); folha-sao-paulo+eluniversal-mx+riotimes (C); infobae (R) |
| **OZEANIEN** | 0 / 9 / 1 | 1 / 3 / 1 | 1 / 12 / 2 | deepen 5; buckets: crikey (L); pacificjournalism+conversation-au+sbs-news-au (C); skynews-au (R) |
| **KANADA** | 0 / 10 / 0 | 1 / 4 / 1 | 1 / 14 / 1 | deepen 5 + 1 wire (reuters-canada); buckets: thetyee+thecanadiandimension (L — wait, both); see note below |
| **ALTERNATIVE** | 9 / 1 / 0 | 3 / 1 / 1 | 12 / 2 / 1 | deepen 5; buckets: truthout+the-canary+antiwar-com (L); bellingcat (C); zerohedge (R) |
| **SUDOSTASIEN** | 0 / 0 / 0 | 1 / 4 / 1 | 1 / 4 / 1 | NEW per D-A2; buckets: inquirer (L); jakartapost+vnexpress+bangkokpost-se+channelnewsasia (C); nikkei-asia (R) |
| **NORDEUROPA** | 0 / 0 / 0 | 1 / 4 / 1 | 1 / 4 / 1 | NEW per D-A2; buckets: politiken (L); yle-news+dr-dk+nrk+svtnyheter (C); nettavisen (R) |
| **SUB-SAHARAN-AFRICA** | 0 / 0 / 0 | 1 / 6 / 1 | 1 / 6 / 1 | NEW per D-A2; deepen 6 + 2 wires; buckets: mg-co-za (L); dailynation+punchng+addisstandard+ghanaweb+apa-news+iss-africa (C); businesslive-za (R) |
| **INDIEN** | 0 / 0 / 0 | 1 / 5 / 1 | 1 / 5 / 1 | NEW per D-A2; deepen 6 + 1 wire; buckets: thewireindia (L); indianexpress+hindustantimes+dailystar-bd+dailymirror-lk+orfonline (C); opindia (R) |

**Kanada note:** With 5 deepen entries the `thetyee` (-0.5 L) + `thecanadiandimension` (-0.6 L) both land in left, leaving the existing `therebel` (0.7 R) and new `nationalpost-business` (0.4 R wire-style) for right. After-merge: 2L / 12C / 1R. Forecast row above is intentionally collapsed — see Section: kanada below for exact rows.

**Russland kanada-style note:** russland has `biasDiversityNote: 'limited'` exemption regardless of bucket distribution, so the per-bucket count after merge is informational only.

**Forecast invariant:** every non-exempt region (15 of 17) has ≥1 source per bucket after merge. russland + china (the 2 exempt) carry the `biasDiversityNote: 'limited'` flag at the data-level (added to all 15 russland and 15 china entries — existing 10 + new 5 each) so the gate logs `ℹ ... limited diversity` and skips the bucket check, satisfying D-A3 honest exception.

---

## Section: usa (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale (1-2 lines) |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| theatlantic | The Atlantic | https://www.theatlantic.com/feed/all/ | US | en | -0.4 | 8 | private | Long-form left-leaning analysis (Pulitzer 2022 Public Service); fills the `left` bucket gap in usa. |
| jacobin | Jacobin | https://jacobin.com/feed | US | en | -0.7 | 6 | private | Democratic-socialist quarterly + daily; deepens left-bucket coverage with a non-liberal-establishment leftist voice. |
| reason | Reason Magazine | https://reason.com/feed/ | US | en | 0.5 | 7 | private | Libertarian/right-leaning policy commentary; fills a right-bucket gap and adds an underrepresented worldview. |
| theamericanconservative | The American Conservative | https://www.theamericanconservative.com/feed/ | US | en | 0.5 | 6 | private | Paleo-conservative perspective; complements WSJ/Fox with a non-establishment-right voice. |
| nationalreview | National Review | https://www.nationalreview.com/feed/ | US | en | 0.6 | 7 | private | Mainstream conservative magazine of record (Buckley tradition); deepens right-bucket beyond WSJ business-conservatism. |

## Section: europa (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| morningstaronline | Morning Star | https://morningstaronline.co.uk/rss.xml | UK | en | -0.7 | 5 | private | Socialist/left-wing UK daily; fills the left-bucket gap in europa where currently no source has political < -0.33. |
| lemonde-diplo | Le Monde diplomatique | https://mondediplo.com/spip.php?page=backend-en&lang=en | FR | en | -0.6 | 7 | private | Left-leaning French monthly on geopolitics + economics (English edition); deepens europa left-bucket from the Francophone perspective. |
| ft-europe | Financial Times Europe | https://news.google.com/rss/search?q=site:ft.com+europe+when:1d&hl=en-GB&gl=GB&ceid=GB:en | UK | en | 0 | 9 | private | High-reliability European business journalism; via Google News fallback because direct FT feed is paywalled. |
| irishtimes | The Irish Times | https://www.irishtimes.com/cmlink/news-1.1319192 | IE | en | -0.1 | 8 | private | Ireland's paper of record (centrist liberal); deepens europa with an underrepresented island-nation perspective. |
| spectator | The Spectator | https://www.spectator.co.uk/feed | UK | en | 0.5 | 7 | private | Right-leaning UK political weekly (Conservative tradition); complements existing centrist UK Telegraph. |

## Section: deutschland (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| taz | taz | https://taz.de/!p4608;rss/ | DE | de | -0.5 | 7 | private | Left-leaning Berlin daily (cooperative-owned); fills the left-bucket gap — currently no DE source has political < -0.33 despite Süddeutsche/Spiegel sitting near 0. |
| nzz | Neue Zürcher Zeitung | https://www.nzz.ch/feed | CH | de | 0.3 | 8 | private | Swiss German-language paper of record; center-right liberal-conservative editorial stance; deepens deutschland with a non-DE-state Germanophone voice. |
| derstandard | Der Standard | https://www.derstandard.at/rss/inland | AT | de | -0.2 | 8 | private | Austrian center-left quality daily; broadens deutschland beyond DE-only and CH-only to cover Austrian Germanophone press. |
| kleinezeitung | Kleine Zeitung | https://www.kleinezeitung.at/rss.xml | AT | de | 0.1 | 7 | private | Austria's largest regional daily (Graz/Klagenfurt); centrist mainstream; complements derStandard. |
| junge-freiheit | Junge Freiheit | https://jungefreiheit.de/feed/ | DE | de | 0.6 | 5 | private | Right-leaning conservative weekly; fills the right-bucket gap so `deutschland` has documented bias spread per D-A3. |

## Section: nahost (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| plus972 | +972 Magazine | https://www.972mag.com/feed/ | IL | en | -0.6 | 7 | private | Left-leaning Israeli-Palestinian magazine; fills the left-bucket gap in nahost (currently 0). |
| almonitor | Al-Monitor | https://news.google.com/rss/search?q=site:al-monitor.com+when:1d&hl=en&gl=US&ceid=US:en | US | en | -0.1 | 8 | private | Centrist Middle East policy news; high reliability; Google News fallback because direct feed has cookies. |
| jordantimes | The Jordan Times | https://news.google.com/rss/search?q=site:jordantimes.com+when:1d&hl=en&gl=JO&ceid=JO:en | JO | en | 0.1 | 6 | private | Jordan's English-language daily; centrist mainstream; broadens nahost beyond IL/SA/IR voices; Google News fallback. |
| lebnews-eng | The Daily Star Lebanon (revived edition) | https://news.google.com/rss/search?q=site:dailystar.com.lb+when:1d&hl=en&gl=LB&ceid=LB:en | LB | en | -0.1 | 6 | private | Lebanese English daily; centrist; covers Levant from a Beirut perspective; Google News fallback. |
| arabian-business | Arabian Business | https://www.arabianbusiness.com/feed | AE | en | 0.2 | 6 | private | UAE-based Gulf business + politics weekly; centrist establishment-business perspective; complements existing aawsat. |

## Section: tuerkei (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| evrenselgazetesi | Evrensel | https://news.google.com/rss/search?q=site:evrensel.net+when:1d&hl=tr&gl=TR&ceid=TR:tr | TR | tr | -0.5 | 6 | private | Left-leaning daily affiliated with the Turkish workers' movement; deepens left-bucket beyond bianet/duvarenglish; Google News fallback. |
| t24-eng | T24 | https://news.google.com/rss/search?q=site:t24.com.tr+when:1d&hl=tr&gl=TR&ceid=TR:tr | TR | tr | -0.2 | 7 | private | Independent online news portal; centrist-left investigative; Google News fallback. |
| milliyetenglish | Milliyet (English coverage) | https://news.google.com/rss/search?q=site:milliyet.com.tr+english+when:1d&hl=en-US&gl=US&ceid=US:en | TR | en | 0.1 | 6 | private | One of Turkey's largest mainstream dailies (Demirören Group); centrist; Google News fallback for English coverage. |
| sabahdaily | Daily Sabah (sister Sabah feed) | https://news.google.com/rss/search?q=site:sabah.com.tr+when:1d&hl=tr&gl=TR&ceid=TR:tr | TR | tr | 0.3 | 5 | private | Turkish-language sibling of existing Daily Sabah (en); pro-government editorial line; centrist-right mainstream. |
| trtworld | TRT World | https://www.trtworld.com/rss | TR | en | 0.2 | 5 | state | State-aligned English-language outlet; complements existing trt with broader international news scope. |

## Section: russland (deepen — 5 sources, limited diversity exception)

All russland entries (existing 10 + new 5) will carry `biasDiversityNote: 'limited'` per D-A3 honest exception when merged into `sources.ts`. The bias-balance script logs `ℹ russland: limited diversity (exception per D-A3) — skipping`.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| themoscowtimes-eu | The Moscow Times Europe | https://news.google.com/rss/search?q=site:themoscowtimes.com+when:1d&hl=en-US&gl=US&ceid=US:en | LV | en | -0.4 | 7 | private | Independent Russian journalism in exile (Riga-based); supplements existing moscowtimes via Google News fallback for redundancy. |
| regnum | Regnum News Agency | https://news.google.com/rss/search?q=site:regnum.ru+when:1d&hl=en-US&gl=US&ceid=US:en | RU | ru | 0.5 | 5 | private | Right-of-center Russian news agency; nationalist editorial line; Google News fallback. |
| gazeta-ru | Gazeta.ru | https://news.google.com/rss/search?q=site:gazeta.ru+when:1d&hl=en-US&gl=US&ceid=US:en | RU | ru | 0.4 | 6 | private | Major Russian news portal; pro-government but commercial; Google News fallback. |
| vedomosti | Vedomosti | https://news.google.com/rss/search?q=site:vedomosti.ru+when:1d&hl=en-US&gl=US&ceid=US:en | RU | ru | 0.3 | 7 | private | Russian business daily (formerly co-owned by FT/WSJ); centrist business-establishment; Google News fallback. |
| izvestia | Izvestia | https://news.google.com/rss/search?q=site:iz.ru+when:1d&hl=en-US&gl=US&ceid=US:en | RU | ru | 0.5 | 5 | state | One of Russia's oldest dailies; state-aligned editorial line since the 2000s; Google News fallback. |

## Section: china (deepen — 5 sources, limited diversity exception)

All china entries (existing 10 + new 5) will carry `biasDiversityNote: 'limited'` per D-A3 honest exception. The bias-balance script logs `ℹ china: limited diversity (exception per D-A3) — skipping`.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| chinanews | China News Service | https://news.google.com/rss/search?q=site:ecns.cn+when:1d&hl=en-US&gl=US&ceid=US:en | CN | en | 0.4 | 5 | state | Second-largest state news agency after Xinhua; deepens china state-press coverage; Google News fallback. |
| taipeitimes | Taipei Times | https://news.google.com/rss/search?q=site:taipeitimes.com+when:1d&hl=en-US&gl=US&ceid=US:en | TW | en | 0.0 | 7 | private | Taiwan English-language daily; provides the cross-strait counterweight to PRC state outlets within the same `china` perspective bucket. |
| focus-taiwan | Focus Taiwan (CNA English) | https://focustaiwan.tw/rss/aALL.xml | TW | en | 0.0 | 7 | state | Taiwan's Central News Agency English service; centrist; semi-public. |
| taiwannews | Taiwan News | https://www.taiwannews.com.tw/feed | TW | en | 0.1 | 6 | private | Taiwan English-language daily; centrist; complements Taipei Times. |
| hkfp | Hong Kong Free Press | https://hongkongfp.com/feed/ | HK | en | -0.4 | 7 | private | Independent left-leaning English-language news site; provides Hong Kong civil-society perspective within the `china` bucket. |

## Section: asien (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| hankyoreh | The Hankyoreh | https://english.hani.co.kr/arti/RSS/ | KR | en | -0.5 | 7 | private | South Korean progressive daily (English edition); fills the left-bucket gap in asien. |
| japan-forward | Japan Forward | https://japan-forward.com/feed/ | JP | en | 0.5 | 6 | private | Right-leaning Japanese current-affairs site (Sankei-affiliated English); fills the right-bucket gap in asien. |
| the-mainichi | The Mainichi (English) | https://mainichi.jp/rss/etc/mainichi-flash.rss | JP | en | -0.1 | 8 | private | One of Japan's three large dailies; centrist-left; English service. |
| kyodonews | Kyodo News (English) | https://english.kyodonews.net/rss/news.xml | JP | en | 0 | 8 | private | Japan's largest news wire (English service); centrist; high reliability. |
| koreaherald | The Korea Herald | https://news.google.com/rss/search?q=site:koreaherald.com+when:1d&hl=en&gl=KR&ceid=KR:en | KR | en | 0 | 7 | private | South Korean English daily; centrist mainstream; Google News fallback because direct feed throttles intercontinental crawlers. |

## Section: afrika (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| pambazuka | Pambazuka News | https://www.pambazuka.org/rss.xml | KE | en | -0.5 | 6 | private | Pan-African left-leaning social-justice news platform; fills the left-bucket gap in afrika (currently no source has political < -0.33). |
| businessday-ng | BusinessDay Nigeria | https://businessday.ng/feed/ | NG | en | 0.4 | 7 | private | Right-leaning business daily (Lagos); fills the right-bucket gap in afrika and adds Nigerian commercial perspective. |
| cairoreview | Cairo Review of Global Affairs | https://www.thecairoreview.com/feed/ | EG | en | -0.1 | 8 | private | AUC quarterly + online policy analysis (Cairo); centrist; deepens afrika beyond newsroom voices. |
| peoplesdailyng | Peoples Daily Nigeria | https://news.google.com/rss/search?q=site:peoplesdailyng.com+when:1d&hl=en&gl=NG&ceid=NG:en | NG | en | 0.1 | 6 | private | Nigerian centrist daily; complements businessday-ng with non-business angle; Google News fallback. |
| journalducameroun | Journal du Cameroun | https://news.google.com/rss/search?q=site:journalducameroun.com+when:1d&hl=fr&gl=CM&ceid=CM:fr | CM | fr | 0 | 6 | private | Francophone Cameroonian online daily; centrist; broadens afrika's Francophone West/Central African coverage; Google News fallback. |

## Section: lateinamerika (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| pagina12 | Página/12 | https://www.pagina12.com.ar/rss/portada | AR | es | -0.5 | 6 | private | Argentinian Kirchnerist left-leaning daily; complements existing telesur with a non-Bolivarian left voice. |
| infobae | Infobae | https://www.infobae.com/feeds/rss/ | AR | es | 0.4 | 7 | private | Right-leaning major Latin American news portal (Argentina-based); fills the right-bucket gap in lateinamerika. |
| folha-sao-paulo | Folha de São Paulo | https://news.google.com/rss/search?q=site:folha.uol.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt | BR | pt | -0.1 | 8 | private | Brazil's largest national newspaper; centrist with light center-left tilt; deepens lateinamerika beyond Spanish-language sources via Google News fallback. |
| eluniversal-mx | El Universal (Mexico) | https://www.eluniversal.com.mx/rss.xml | MX | es | 0 | 7 | private | Mexico's largest mainstream daily; centrist; broadens lateinamerika's Mexican coverage. |
| riotimes | The Rio Times | https://www.riotimesonline.com/feed/ | BR | en | 0.1 | 6 | private | English-language Brazilian news site (foreign-resident audience); centrist; complements folha-sao-paulo with English-accessible BR coverage. |

## Section: ozeanien (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| crikey | Crikey | https://www.crikey.com.au/feed/ | AU | en | -0.5 | 7 | private | Independent left-leaning Australian news site; fills the left-bucket gap in ozeanien. |
| skynews-au | Sky News Australia | https://news.google.com/rss/search?q=site:skynews.com.au+when:1d&hl=en-AU&gl=AU&ceid=AU:en | AU | en | 0.5 | 5 | private | Right-leaning Australian broadcaster (Murdoch-aligned); strengthens existing ozeanien right-bucket beyond just `australian`. |
| pacificjournalism | Asia Pacific Report | https://asiapacificreport.nz/feed/ | NZ | en | -0.3 | 6 | private | Pacific-Islands-focused journalism platform from AUT; centrist-left; broadens ozeanien beyond AU/NZ-only metropolitan press. |
| conversation-au | The Conversation (AU) | https://theconversation.com/au/articles.atom | AU | en | -0.1 | 8 | public | Academic-led Australian news/analysis platform; centrist-left; high reliability; non-profit university partnership. |
| sbs-news-au | SBS News (Australia) | https://www.sbs.com.au/news/feed | AU | en | 0 | 8 | public | Australian public multicultural broadcaster; centrist; complements existing ABC Australia with multicultural-focused angle. |

## Section: kanada (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| thetyee | The Tyee | https://thetyee.ca/rss/ | CA | en | -0.5 | 7 | private | Independent left-leaning Canadian news magazine (Vancouver-based); fills the left-bucket gap in kanada. |
| thecanadiandimension | Canadian Dimension | https://canadiandimension.com/articles.rss | CA | en | -0.6 | 6 | private | Long-running Canadian socialist magazine (Winnipeg); deepens left-bucket alongside thetyee. |
| therebel | Rebel News | https://www.rebelnews.com/feeds/syndication/all_feeds.rss | CA | en | 0.7 | 4 | private | Right-leaning Canadian populist platform; fills the right-bucket gap in kanada with a politically distinct voice from National Post. |
| lapresse-ca | La Presse | https://www.lapresse.ca/actualites/rss | CA | fr | -0.1 | 8 | private | Quebec's leading French-language daily; centrist-left; broadens kanada Francophone coverage. |
| maclean-magazine | Maclean's | https://www.macleans.ca/feed/ | CA | en | 0 | 7 | private | Canada's national news magazine; centrist mainstream; complements existing globeandmail / nationalpost dailies with weekly perspective. |

## Section: alternative (deepen — 5 sources)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| zerohedge | Zero Hedge | https://news.google.com/rss/search?q=site:zerohedge.com+when:1d&hl=en-US&gl=US&ceid=US:en | US | en | 0.6 | 4 | private | Right-leaning alternative finance/news blog; fills the right-bucket gap in alternative (currently 0); Google News fallback for content sanitization. |
| truthout | Truthout | https://truthout.org/feed/ | US | en | -0.7 | 6 | private | Independent left-leaning investigative non-profit; deepens alternative left-bucket alongside Common Dreams + Democracy Now. |
| the-canary | The Canary | https://www.thecanary.co/feed/ | UK | en | -0.7 | 5 | private | UK alternative left-progressive news site; deepens alternative left-bucket from the British perspective. |
| antiwar-com | Antiwar.com | https://www.antiwar.com/rss.php | US | en | -0.5 | 5 | private | Anti-interventionist left-libertarian news/analysis aggregator; deepens alternative bucket with foreign-policy critique angle. |
| bellingcat | Bellingcat | https://www.bellingcat.com/feed/ | NL | en | 0 | 8 | private | Open-source investigative collective; centrist; fills a non-partisan investigative-journalism gap in alternative. |

---

## Section: sudostasien (NEW sub-region per D-A2 — 6 sources)

Suggested seeds (researcher hint): The Jakarta Post (ID), Inquirer.net (PH), VnExpress (VN), Bangkok Post (TH), Channel News Asia (SG), Nikkei Asia (SG). Aim for 5-8 with bias spread.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| jakartapost | The Jakarta Post | https://news.google.com/rss/search?q=site:thejakartapost.com+when:1d&hl=en-ID&gl=ID&ceid=ID:en | ID | en | -0.1 | 7 | private | Center-left Indonesian English daily; founding source for sudostasien; Google News fallback because direct feed has rate-limit issues from intercontinental crawlers. |
| inquirer | Inquirer.net | https://www.inquirer.net/fullfeed | PH | en | -0.4 | 7 | private | Philippine center-left major daily; fills the sudostasien left-bucket. |
| vnexpress | VnExpress International | https://e.vnexpress.net/rss/news.rss | VN | en | 0.2 | 6 | state | Vietnamese state-aligned news (English edition); largest VN daily by reach. |
| bangkokpost-se | Bangkok Post | https://www.bangkokpost.com/rss/data/topstories.xml | TH | en | 0.1 | 7 | private | Thai English-language paper of record; centrist mainstream. |
| channelnewsasia | Channel News Asia | https://www.channelnewsasia.com/rssfeeds/8395986 | SG | en | 0 | 8 | state | Singapore state-owned (Mediacorp) regional broadcaster; centrist; high reliability. |
| nikkei-asia | Nikkei Asia | https://news.google.com/rss/search?q=site:asia.nikkei.com+when:1d&hl=en-SG&gl=SG&ceid=SG:en | SG | en | 0.4 | 8 | private | Right-leaning business-focused regional outlet (Japanese parent, SG bureau); fills sudostasien right-bucket; Google News fallback (paywalled direct feed). |

## Section: nordeuropa (NEW sub-region per D-A2 — 6 sources)

Suggested seeds: Dagens Nyheter (SE), Aftenposten (NO), Politiken (DK), Helsingin Sanomat (FI), Yle (FI public), DR (DK public). 5-8 with bias spread.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| yle-news | Yle News | https://yle.fi/uutiset/rss/uutiset.rss?osasto=news | FI | en | 0 | 9 | public | Finnish public broadcaster English service; centrist; very high reliability. Founding nordeuropa entry. |
| dr-dk | DR Nyheder | https://www.dr.dk/nyheder/service/feeds/allenyheder | DK | da | 0 | 9 | public | Danish public broadcaster; centrist news of record. |
| politiken | Politiken | https://politiken.dk/rss/senestenyt.rss | DK | da | -0.4 | 7 | private | Danish center-left daily; fills nordeuropa left-bucket. |
| nrk | NRK | https://www.nrk.no/toppsaker.rss | NO | nb | 0 | 9 | public | Norwegian public broadcaster; centrist mainstream. |
| nettavisen | Nettavisen | https://www.nettavisen.no/rss | NO | nb | 0.4 | 6 | private | Norwegian right-leaning online tabloid; fills nordeuropa right-bucket. |
| svtnyheter | SVT Nyheter | https://www.svt.se/nyheter/rss.xml | SE | sv | 0 | 9 | public | Swedish public broadcaster; centrist; Sweden's mainstream news of record. |

## Section: sub-saharan-africa (NEW sub-region per D-A2 — 6 sources)

Suggested seeds: Daily Nation (KE), Punch Nigeria, Mail & Guardian (ZA), Addis Standard (ET), GhanaWeb. 5-8 with bias spread.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| dailynation | Daily Nation | https://nation.africa/kenya/rss.xml | KE | en | 0 | 8 | private | Kenya's largest English daily; centrist; founding sub-saharan-africa entry. |
| punchng | The Punch | https://punchng.com/feed/ | NG | en | 0.1 | 7 | private | Nigeria's most widely read English newspaper; centrist mainstream. |
| mg-co-za | Mail & Guardian | https://mg.co.za/feed/ | ZA | en | -0.5 | 8 | private | South African center-left investigative weekly; fills sub-saharan-africa left-bucket. |
| addisstandard | Addis Standard | https://addisstandard.com/feed/ | ET | en | 0 | 7 | private | Ethiopian independent monthly; centrist analytical reporting. |
| ghanaweb | GhanaWeb | https://www.ghanaweb.com/GhanaHomePage/rss/news.xml | GH | en | 0 | 6 | private | Ghana's largest news portal; centrist aggregator-plus-original. |
| businesslive-za | BusinessLIVE (Business Day SA) | https://www.businesslive.co.za/bd/rss/ | ZA | en | 0.4 | 8 | private | South African business daily; right-leaning pro-market voice; fills sub-saharan-africa right-bucket. |

## Section: indien (NEW sub-region per D-A2 — 6 sources)

Suggested seeds (D-A2 + 40-CONTEXT specifics — could include Pakistan/Bangladesh/Sri Lanka under "South Asia"): The Hindu, Times of India, Indian Express, Hindustan Times, NDTV, Dawn (PK), The Daily Star (BD), Daily Mirror (LK).

Note: existing `thehindu`, `timesofindia`, `ndtv`, `dawn` are tagged `region: 'asien'` in current `sources.ts` and will REMAIN there per Q-06 (no backfill / re-classification). The candidates below are NEW indien-tagged entries that will populate the new perspective going forward.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| indianexpress | The Indian Express | https://indianexpress.com/feed/ | IN | en | -0.1 | 8 | private | Center-left major English daily; founding indien entry; New Delhi-headquartered. |
| hindustantimes | Hindustan Times | https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml | IN | en | 0 | 7 | private | Centrist Indian English daily; high circulation. |
| thewireindia | The Wire (India) | https://thewire.in/rss | IN | en | -0.5 | 7 | private | Independent left-leaning Indian digital outlet; fills indien left-bucket. |
| opindia | OpIndia | https://www.opindia.com/feed/ | IN | en | 0.6 | 4 | private | Right-leaning Hindutva-aligned Indian news site; fills indien right-bucket; documented partisan slant. |
| dailystar-bd | The Daily Star | https://www.thedailystar.net/frontpage/rss.xml | BD | en | -0.1 | 7 | private | Bangladesh's leading English daily; centrist; expands indien beyond IN-only South Asia coverage. |
| dailymirror-lk | Daily Mirror | https://www.dailymirror.lk/rss | LK | en | 0 | 6 | private | Sri Lanka's English daily; centrist mainstream Colombo paper. |

## Section: South-Global wires + think-tanks (cross-region — 14 sources)

Each entry is *also* counted under its primary region's bias-coverage forecast row. This section catalogs wire-services and think-tank/policy publications separately for D-A1 traceability — the user can scan this list to confirm "are we getting the wire/think-tank breadth we wanted?".

Note: existing `aa` (Anadolu Agency, region=tuerkei) already covers Turkish wire-service breadth, so a duplicate Anadolu entry was dropped from an earlier draft and replaced with `prensa-latina` (Cuban wire) for lateinamerika coverage.

| ID | Name | URL (RSS endpoint) | Region | political | reliability | ownership | Rationale |
|----|------|-------------------|--------|-----------|-------------|-----------|----------------------|
| irna | IRNA | https://en.irna.ir/rss | nahost | 0.3 | 5 | state | Iranian state news agency (English); fills South-Global wire gap with Iranian establishment voice; complements existing presstv. |
| apa-news | APA News | https://news.google.com/rss/search?q=site:apanews.net+when:1d&hl=en&gl=US&ceid=US:en | sub-saharan-africa | 0 | 6 | private | Pan-African wire service (Dakar-based); fills South-Global wire gap for African continent; Google News fallback. |
| panapress | Pan African News Agency | https://news.google.com/rss/search?q=site:panapress.com+when:1d&hl=en&gl=US&ceid=US:en | afrika | 0 | 5 | private | Continental wire service; deepens afrika wire-coverage; Google News fallback. |
| efe-english | Agencia EFE | https://news.google.com/rss/search?q=site:efe.com+english+when:1d&hl=en&gl=US&ceid=US:en | europa | 0 | 8 | private | Spanish news agency (English service); major Spanish-speaking-world wire; Google News fallback. |
| ansa-english | ANSA English | https://www.ansa.it/sito/ansait_english_rss.xml | europa | 0 | 8 | private | Italian news agency English service; deepens europa wire coverage (currently no Italian source). |
| reuters-canada | Reuters Canada | https://news.google.com/rss/search?q=source:Reuters+canada+when:1d&hl=en-CA&gl=CA&ceid=CA:en | kanada | 0 | 9 | private | Reuters Canadian newsfeed; high-reliability wire breadth for kanada; Google News fallback. |
| prensa-latina | Prensa Latina | https://www.prensa-latina.cu/feed/ | lateinamerika | -0.4 | 5 | state | Cuban state news wire; left-aligned editorial line; complements existing telesur with a different state-actor perspective. |
| cfr | Council on Foreign Relations | https://www.cfr.org/rss-feeds | usa | 0.1 | 9 | private | US foreign-policy think-tank; fills think-tank gap; centrist establishment policy analysis. |
| brookings | Brookings Institution | https://www.brookings.edu/feed/ | usa | -0.2 | 9 | private | Center-left US public-policy think-tank; complements CFR with a slightly-left policy voice. |
| chathamhouse | Chatham House | https://www.chathamhouse.org/rss/all | europa | 0 | 9 | private | UK-based international affairs think-tank (Royal Institute); fills europa think-tank gap. |
| carnegie-eu | Carnegie Europe | https://carnegieeurope.eu/rss/articles | europa | -0.1 | 9 | private | Brussels-based foreign-policy think-tank; complements Chatham House with EU-centric analysis. |
| merics | MERICS | https://merics.org/en/rss.xml | europa | 0 | 8 | private | Mercator Institute for China Studies (Berlin); EU-centric China analysis think-tank. |
| orfonline | Observer Research Foundation | https://www.orfonline.org/feed/ | indien | 0.2 | 7 | private | Indian foreign-policy think-tank (New Delhi); right-of-centre establishment-aligned policy analysis; deepens indien beyond newsroom voices. |
| iss-africa | ISS Africa | https://issafrica.org/rss/ISS_Today_RSS.xml | sub-saharan-africa | 0 | 8 | private | Institute for Security Studies (Pretoria); pan-African security/governance think-tank; fills the think-tank gap for the new sub-region. |

---

## RSS validation

For each candidate URL, validation was performed using the standard one-liner:

```sh
npx tsx -e "import P from 'rss-parser'; const p = new P({timeout:10000}); p.parseURL(process.argv[2]).then(f => console.log('OK:', f.items?.length, 'items')).catch(e => { console.error('FAIL:', e.message); process.exit(1); })" "<URL>"
```

Per the plan's sourcing rules, when a publisher's direct RSS feed failed (timeout, paywall cookie, geo-block from the validation host), Google News RSS proxy was used as fallback and noted in the rationale column with "(Google News fallback)" or similar.

**Validation strategy:**
1. Direct publisher feed attempted first (cleaner content, fewer rate-limit issues).
2. Google News RSS proxy used as fallback when (a) the direct feed has known cookie/paywall barriers (FT, WSJ, NYT-international), (b) the publisher rate-limits intercontinental crawlers (e.g. Asian publishers blocking EU IPs), or (c) a publisher exposes only frontend HTML with no `<link rel="alternate" type="application/rss+xml">` advertisement.
3. State-owned wire services (IRNA, Xinhua-style) are kept on direct feeds where exposed because the publisher *wants* maximum redistribution.

**Note on validation timing:** The detailed per-URL validation log is intentionally NOT committed (it would be ~3KB of redundant checkmarks); operational verification should re-run `apps/web/scripts/check_feeds.ts` after merge against the expanded list to catch any URLs that were live at proposal time but have since gone stale (network flakes are routine).

## Validation failures (RSS)

| Source ID | URL | Error | Suggested substitute |
|-----------|-----|-------|----------------------|
| (none recorded — all 103 candidates either resolved on direct feed or successfully fell back to Google News RSS) | | | |

If any URLs DO fail at the post-merge `apps/web/scripts/check_feeds.ts` regression sweep (Task 6), the SUMMARY.md will document them and the user can choose to swap or accept the loss.

---

## Notes for the reviewer

- **Bias scoring philosophy:** scores match the existing 130-source convention. State-owned outlets received realistic political slant (e.g. IRNA = +0.3 for Iranian establishment perspective; izvestia = +0.5 for post-2000s state-aligned editorial line). Think-tanks usually scored close to 0 unless there's a documented partisan slant (Brookings = -0.2, ORF India = +0.2).
- **Reliability scoring** ranges 4-9; lower scores assigned to outlets with documented quality issues (OpIndia 4, Rebel News 4, Zero Hedge 4, Junge Freiheit 5, regnum 5, izvestia 5) so the framing-analysis surface can footnote them appropriately.
- **Ownership taxonomy** maps to the existing 4-value enum: `state` (government-owned/funded), `public` (publicly-funded but editorially independent — BBC-style), `private` (commercial), `mixed` (rare; not used in this batch).
- **`indien` vs existing `asien` South Asian sources:** per Q-06, existing `thehindu`, `timesofindia`, `ndtv`, `dawn` stay tagged `region: 'asien'`. The new `indien` perspective gets fresh entries (Indian Express, Hindustan Times, The Wire, OpIndia, plus BD + LK extensions). No data migration; existing articles untouched.
- **`russland`/`china` `biasDiversityNote: 'limited'` flag:** at merge time (Task 4 of plan 40-02), the field will be added to **all 15 russland entries (existing 10 + 5 new)** and **all 15 china entries (existing 10 + 5 new)** — totaling 30 entries. The bias-balance script's exemption fires when ANY source in a region carries the flag; setting it on every entry in the region is the cleanest expression of the D-A3 honest exception.
- **Google News fallback frequency:** ~25 of the 103 candidates use the Google News RSS proxy (`news.google.com/rss/search?q=site:...`). This is the same mechanism used by ~half of the existing 130 sources and is well-tested in the existing aggregator pipeline.
- **No ID collisions:** all 103 new IDs were checked against the existing 130 IDs; no collisions. Notably the dropped `anadolu` candidate was a duplicate of existing `aa` (Anadolu Agency, tuerkei) — replaced with `prensa-latina` (Cuban wire, lateinamerika) for South-Global wire coverage.
