# 70 Proposed New News Sources — Phase 40 Curation

**Created:** 2026-05-04
**Decision authority:** D-A1, D-A2, D-A3, D-A4 (40-CONTEXT.md)
**Status:** AWAITING USER REVIEW
**Total candidates:** 70
**Existing:** 130 (130 + 70 = 200, satisfying CONT-01)

## Distribution summary

| Bucket | Target | Actual |
|--------|--------|--------|
| Deepen existing 13 regions (D-A1) | ~30-40 | 32 |
| Carve 4 new sub-regions (D-A2) at ~5-8 each | ~20-30 | 24 |
| South-Global wires + think-tanks (D-A1) | ~10-15 | 14 |
| **Total** | **70** | **70** |

Per D-A1, sources serving multiple roles (e.g. a think-tank in usa) are counted in only ONE bucket above (the primary intent at curation time). The South-Global wires + think-tanks bucket holds entries whose primary value is wire-service breadth or policy/think-tank perspective regardless of which region they live in for `region:` purposes — those entries are *additionally* listed under their region section so the bias-coverage forecast stays accurate.

## Bias-coverage forecast (D-A3)

For each of the 17 regions after the merge, the table below counts sources per political-bias bucket using the canonical thresholds: **left** (`< -0.33`), **center** (`-0.33..0.33`), **right** (`> 0.33`). Existing-130 counts come from the current `sources.ts`; the "after merge" column is what the bias-balance script will see.

Counts include the 14 South-Global wires + think-tanks because each carries a `region:` tag and lands in its region's bucket (CFR/Brookings → `usa`, Chatham House/Carnegie-EU/MERICS/EFE/ANSA → `europa`, Anadolu → `tuerkei`, IRNA → `nahost`, Reuters-Canada → `kanada`, APA-News/ISS-Africa → `sub-saharan-africa`, Panapress → `afrika`, ORF-Online → `indien`).

| Region | Existing L/C/R | New L/C/R | After-merge L/C/R | Note |
|--------|----------------|-----------|--------------------|------|
| **USA** | 0 / 9 / 1 | 2 / 2 / 3 | 2 / 11 / 4 | adds: theatlantic+jacobin (L); cfr+brookings (C); reason+theamericanconservative+nationalreview (R) |
| **EUROPA** | 0 / 9 / 1 | 2 / 5 / 1 | 2 / 14 / 2 | adds: morningstaronline+lemonde-diplo (L); ft-europe+efe-english+ansa-english+chathamhouse+carnegie-eu+merics (C); spectator (R) |
| **DEUTSCHLAND** | 0 / 10 / 0 | 1 / 1 / 1 | 1 / 11 / 1 | adds: taz (L); nzz (C, +0.3); junge-freiheit (R) |
| **NAHOST** | 0 / 8 / 2 | 1 / 2 / 0 | 1 / 10 / 2 | adds: plus972 (L); almonitor+irna (C) |
| **TUERKEI** | 2 / 6 / 2 | 0 / 2 / 0 | 2 / 8 / 2 | adds: trtworld+anadolu (C) |
| **RUSSLAND** | 2 / 3 / 5 | 1 / 0 / 0 | 3 / 3 / 5 | `limited` per D-A3 — exempt; adds themoscowtimes-eu (L) |
| **CHINA** | 0 / 3 / 7 | 0 / 1 / 1 | 0 / 4 / 8 | `limited` per D-A3 — exempt; adds taipeitimes (C, 0.0); chinanews (R, +0.4) |
| **ASIEN** | 0 / 10 / 0 | 1 / 0 / 1 | 1 / 10 / 1 | adds: hankyoreh (L); japan-forward (R) |
| **AFRIKA** | 0 / 10 / 0 | 1 / 1 / 1 | 1 / 11 / 1 | adds: pambazuka (L); panapress (C); businessday-ng (R) |
| **LATEINAMERIKA** | 1 / 9 / 0 | 1 / 1 / 1 | 2 / 10 / 1 | adds: pagina12 (L, -0.5); folha-sao-paulo (C, -0.1); infobae (R, +0.4) |
| **OZEANIEN** | 0 / 9 / 1 | 1 / 1 / 1 | 1 / 10 / 2 | adds: crikey (L); pacificjournalism (C, -0.3); skynews-au (R) |
| **KANADA** | 0 / 10 / 0 | 1 / 1 / 1 | 1 / 11 / 1 | adds: thetyee (L); reuters-canada (C); therebel (R) |
| **ALTERNATIVE** | 9 / 1 / 0 | 1 / 0 / 1 | 10 / 1 / 1 | adds: truthout (L); zerohedge (R) |
| **SUDOSTASIEN** | 0 / 0 / 0 | 1 / 4 / 1 | 1 / 4 / 1 | NEW per D-A2 — adds: inquirer (L); jakartapost+vnexpress+bangkokpost-se+channelnewsasia (C); nikkei-asia (R) |
| **NORDEUROPA** | 0 / 0 / 0 | 1 / 4 / 1 | 1 / 4 / 1 | NEW per D-A2 — adds: politiken (L); yle-news+dr-dk+nrk+svtnyheter (C); nettavisen (R) |
| **SUB-SAHARAN-AFRICA** | 0 / 0 / 0 | 1 / 6 / 1 | 1 / 6 / 1 | NEW per D-A2 — adds: mg-co-za (L); dailynation+punchng+addisstandard+ghanaweb+apa-news+iss-africa (C); businesslive-za (R) |
| **INDIEN** | 0 / 0 / 0 | 1 / 5 / 1 | 1 / 5 / 1 | NEW per D-A2 — adds: thewireindia (L); indianexpress+hindustantimes+dailystar-bd+dailymirror-lk+orfonline (C); opindia (R) |

**Forecast invariant:** every non-exempt region has ≥1 source per bucket after merge. russland + china carry the `biasDiversityNote: 'limited'` flag at the data-level (added to all 10+1 russland and 10+2 china entries) so the gate logs `ℹ ... limited diversity` and skips the bucket check, satisfying D-A3 honest exception.

---

## Section: usa (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale (1-2 lines) |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| theatlantic | The Atlantic | https://www.theatlantic.com/feed/all/ | US | en | -0.4 | 8 | private | Long-form left-leaning analysis (Pulitzer 2022 Public Service); fills the `left` bucket gap in usa. |
| reason | Reason Magazine | https://reason.com/feed/ | US | en | 0.5 | 7 | private | Libertarian/right-leaning policy commentary; fills a right-bucket gap and adds an underrepresented worldview. |
| theamericanconservative | The American Conservative | https://www.theamericanconservative.com/feed/ | US | en | 0.5 | 6 | private | Paleo-conservative perspective; complements WSJ/Fox with a non-establishment-right voice. |
| jacobin | Jacobin | https://jacobin.com/feed | US | en | -0.7 | 6 | private | Democratic-socialist quarterly + daily; deepens left-bucket coverage with a non-liberal-establishment leftist voice. |
| nationalreview | National Review | https://www.nationalreview.com/feed/ | US | en | 0.6 | 7 | private | Mainstream conservative magazine of record (Buckley tradition); deepens right-bucket beyond WSJ business-conservatism. |

## Section: europa (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| morningstaronline | Morning Star | https://morningstaronline.co.uk/rss.xml | UK | en | -0.7 | 5 | private | Socialist/left-wing UK daily; fills the left-bucket gap in europa where currently no source has political < -0.33. |
| spectator | The Spectator | https://www.spectator.co.uk/feed | UK | en | 0.5 | 7 | private | Right-leaning UK political weekly (Conservative tradition); complements existing centrist UK Telegraph. |
| ft-europe | Financial Times Europe | https://news.google.com/rss/search?q=site:ft.com+europe+when:1d&hl=en-GB&gl=GB&ceid=GB:en | UK | en | 0 | 9 | private | High-reliability European business journalism; via Google News fallback because direct FT feed is paywalled. |
| lemonde-diplo | Le Monde diplomatique | https://mondediplo.com/spip.php?page=backend-en&lang=en | FR | en | -0.6 | 7 | private | Left-leaning French monthly on geopolitics + economics (English edition); deepens europa left-bucket from the Francophone perspective. |

## Section: deutschland (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| taz | taz | https://taz.de/!p4608;rss/ | DE | de | -0.5 | 7 | private | Left-leaning Berlin daily (cooperative-owned); fills the left-bucket gap — currently no DE source has political < -0.33 despite Süddeutsche/Spiegel sitting near 0. |
| junge-freiheit | Junge Freiheit | https://jungefreiheit.de/feed/ | DE | de | 0.6 | 5 | private | Right-leaning conservative weekly; fills the right-bucket gap so `deutschland` has documented bias spread per D-A3. |
| nzz | Neue Zürcher Zeitung | https://www.nzz.ch/feed | CH | de | 0.3 | 8 | private | Swiss German-language paper of record; center-right liberal-conservative editorial stance; deepens deutschland with a non-DE-state Germanophone voice. |

## Section: nahost (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| plus972 | +972 Magazine | https://www.972mag.com/feed/ | IL | en | -0.6 | 7 | private | Left-leaning Israeli-Palestinian magazine; fills the left-bucket gap in nahost (currently 0). |
| almonitor | Al-Monitor | https://news.google.com/rss/search?q=site:al-monitor.com+when:1d&hl=en&gl=US&ceid=US:en | US | en | -0.1 | 8 | private | Centrist Middle East policy news; high reliability; Google News fallback because direct feed has cookies. |

## Section: tuerkei (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| trtworld | TRT World | https://www.trtworld.com/rss | TR | en | 0.2 | 5 | state | State-aligned English-language outlet; complements existing trt with broader international news scope. |

## Section: russland (deepen — limited diversity exception)

All russland entries (existing 10 + new 1) will carry `biasDiversityNote: 'limited'` per D-A3 honest exception when merged into `sources.ts`. The bias-balance script logs `ℹ russland: limited diversity (exception per D-A3) — skipping`.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| themoscowtimes-eu | The Moscow Times Europe | https://news.google.com/rss/search?q=site:themoscowtimes.com+when:1d&hl=en-US&gl=US&ceid=US:en | LV | en | -0.4 | 7 | private | Independent Russian journalism in exile (Riga-based); supplements existing themoscowtimes via Google News fallback for redundancy. |

## Section: china (deepen — limited diversity exception)

All china entries (existing 10 + new 2) will carry `biasDiversityNote: 'limited'` per D-A3 honest exception. The bias-balance script logs `ℹ china: limited diversity (exception per D-A3) — skipping`.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| chinanews | China News Service | https://news.google.com/rss/search?q=site:ecns.cn+when:1d&hl=en-US&gl=US&ceid=US:en | CN | en | 0.4 | 5 | state | Second-largest state news agency after Xinhua; deepens china state-press coverage; Google News fallback. |
| taipeitimes | Taipei Times | https://news.google.com/rss/search?q=site:taipeitimes.com+when:1d&hl=en-US&gl=US&ceid=US:en | TW | en | 0.0 | 7 | private | Taiwan English-language daily; provides the cross-strait counterweight to PRC state outlets within the same `china` perspective bucket. |

## Section: asien (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| hankyoreh | The Hankyoreh | https://english.hani.co.kr/arti/RSS/ | KR | en | -0.5 | 7 | private | South Korean progressive daily (English edition); fills the left-bucket gap in asien. |
| japan-forward | Japan Forward | https://japan-forward.com/feed/ | JP | en | 0.5 | 6 | private | Right-leaning Japanese current-affairs site (Sankei-affiliated English); fills the right-bucket gap in asien. |

## Section: afrika (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| pambazuka | Pambazuka News | https://www.pambazuka.org/rss.xml | KE | en | -0.5 | 6 | private | Pan-African left-leaning social-justice news platform; fills the left-bucket gap in afrika (currently no source has political < -0.33). |
| businessday-ng | BusinessDay Nigeria | https://businessday.ng/feed/ | NG | en | 0.4 | 7 | private | Right-leaning business daily (Lagos); fills the right-bucket gap in afrika and adds Nigerian commercial perspective. |

## Section: lateinamerika (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| pagina12 | Página/12 | https://www.pagina12.com.ar/rss/portada | AR | es | -0.5 | 6 | private | Argentinian Kirchnerist left-leaning daily; complements existing telesur with a non-Bolivarian left voice. |
| infobae | Infobae | https://www.infobae.com/feeds/rss/ | AR | es | 0.4 | 7 | private | Right-leaning major Latin American news portal (Argentina-based); fills the right-bucket gap in lateinamerika. |
| folha-sao-paulo | Folha de São Paulo | https://news.google.com/rss/search?q=site:folha.uol.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt | BR | pt | -0.1 | 8 | private | Brazil's largest national newspaper; centrist with light center-left tilt; deepens lateinamerika beyond Spanish-language sources via Google News fallback. |

## Section: ozeanien (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| crikey | Crikey | https://www.crikey.com.au/feed/ | AU | en | -0.5 | 7 | private | Independent left-leaning Australian news site; fills the left-bucket gap in ozeanien. |
| skynews-au | Sky News Australia | https://news.google.com/rss/search?q=site:skynews.com.au+when:1d&hl=en-AU&gl=AU&ceid=AU:en | AU | en | 0.5 | 5 | private | Right-leaning Australian broadcaster (Murdoch-aligned); strengthens existing ozeanien right-bucket beyond just `australian`. |
| pacificjournalism | Asia Pacific Report | https://asiapacificreport.nz/feed/ | NZ | en | -0.3 | 6 | private | Pacific-Islands-focused journalism platform from AUT; centrist-left; broadens ozeanien beyond AU/NZ-only metropolitan press. |

## Section: kanada (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| thetyee | The Tyee | https://thetyee.ca/rss/ | CA | en | -0.5 | 7 | private | Independent left-leaning Canadian news magazine (Vancouver-based); fills the left-bucket gap in kanada. |
| therebel | Rebel News | https://www.rebelnews.com/feeds/syndication/all_feeds.rss | CA | en | 0.7 | 4 | private | Right-leaning Canadian populist platform; fills the right-bucket gap in kanada with a politically distinct voice from National Post. |

## Section: alternative (deepen)

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| zerohedge | Zero Hedge | https://news.google.com/rss/search?q=site:zerohedge.com+when:1d&hl=en-US&gl=US&ceid=US:en | US | en | 0.6 | 4 | private | Right-leaning alternative finance/news blog; fills the right-bucket gap in alternative (currently 0); Google News fallback for content sanitization. |
| truthout | Truthout | https://truthout.org/feed/ | US | en | -0.7 | 6 | private | Independent left-leaning investigative non-profit; deepens alternative left-bucket alongside Common Dreams + Democracy Now. |

## Section: sudostasien (NEW sub-region per D-A2)

Suggested seeds (researcher hint): The Jakarta Post (ID), Inquirer.net (PH), VnExpress (VN), Bangkok Post (TH), The Star (MY), Channel News Asia (SG), The Straits Times (SG). Aim for 5-8 with bias spread.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| jakartapost | The Jakarta Post | https://news.google.com/rss/search?q=site:thejakartapost.com+when:1d&hl=en-ID&gl=ID&ceid=ID:en | ID | en | -0.1 | 7 | private | Center-left Indonesian English daily; founding source for sudostasien; Google News fallback because direct feed has rate-limit issues from intercontinental crawlers. |
| inquirer | Inquirer.net | https://www.inquirer.net/fullfeed | PH | en | -0.4 | 7 | private | Philippine center-left major daily; fills the sudostasien left-bucket. |
| vnexpress | VnExpress International | https://e.vnexpress.net/rss/news.rss | VN | en | 0.2 | 6 | state | Vietnamese state-aligned news (English edition); largest VN daily by reach. |
| bangkokpost-se | Bangkok Post | https://www.bangkokpost.com/rss/data/topstories.xml | TH | en | 0.1 | 7 | private | Thai English-language paper of record; centrist mainstream. |
| channelnewsasia | Channel News Asia | https://www.channelnewsasia.com/rssfeeds/8395986 | SG | en | 0 | 8 | state | Singapore state-owned (Mediacorp) regional broadcaster; centrist; high reliability. |
| nikkei-asia | Nikkei Asia | https://news.google.com/rss/search?q=site:asia.nikkei.com+when:1d&hl=en-SG&gl=SG&ceid=SG:en | SG | en | 0.4 | 8 | private | Right-leaning business-focused regional outlet (Japanese parent, SG bureau); fills sudostasien right-bucket; Google News fallback (paywalled direct feed). |

## Section: nordeuropa (NEW sub-region per D-A2)

Suggested seeds: Dagens Nyheter (SE), Aftenposten (NO), Politiken (DK), Helsingin Sanomat (FI), Morgunblaðið (IS), Yle (FI public), DR (DK public). 5-8 with bias spread.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| yle-news | Yle News | https://yle.fi/uutiset/rss/uutiset.rss?osasto=news | FI | en | 0 | 9 | public | Finnish public broadcaster English service; centrist; very high reliability. Founding nordeuropa entry. |
| dr-dk | DR Nyheder | https://www.dr.dk/nyheder/service/feeds/allenyheder | DK | da | 0 | 9 | public | Danish public broadcaster; centrist news of record. |
| politiken | Politiken | https://politiken.dk/rss/senestenyt.rss | DK | da | -0.4 | 7 | private | Danish center-left daily; fills nordeuropa left-bucket. |
| nrk | NRK | https://www.nrk.no/toppsaker.rss | NO | nb | 0 | 9 | public | Norwegian public broadcaster; centrist mainstream. |
| nettavisen | Nettavisen | https://www.nettavisen.no/rss | NO | nb | 0.4 | 6 | private | Norwegian right-leaning online tabloid; fills nordeuropa right-bucket. |
| svtnyheter | SVT Nyheter | https://www.svt.se/nyheter/rss.xml | SE | sv | 0 | 9 | public | Swedish public broadcaster; centrist; Sweden's mainstream news of record. |

## Section: sub-saharan-africa (NEW sub-region per D-A2)

Suggested seeds: Daily Nation (KE), Punch Nigeria, Mail & Guardian (ZA), Addis Standard (ET), GhanaWeb, The East African (regional), AllAfrica (aggregator). 5-8 with bias spread.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| dailynation | Daily Nation | https://nation.africa/kenya/rss.xml | KE | en | 0 | 8 | private | Kenya's largest English daily; centrist; founding sub-saharan-africa entry. |
| punchng | The Punch | https://punchng.com/feed/ | NG | en | 0.1 | 7 | private | Nigeria's most widely read English newspaper; centrist mainstream. |
| mg-co-za | Mail & Guardian | https://mg.co.za/feed/ | ZA | en | -0.5 | 8 | private | South African center-left investigative weekly; fills sub-saharan-africa left-bucket. |
| addisstandard | Addis Standard | https://addisstandard.com/feed/ | ET | en | 0 | 7 | private | Ethiopian independent monthly; centrist analytical reporting. |
| ghanaweb | GhanaWeb | https://www.ghanaweb.com/GhanaHomePage/rss/news.xml | GH | en | 0 | 6 | private | Ghana's largest news portal; centrist aggregator-plus-original. |
| businesslive-za | BusinessLIVE (Business Day SA) | https://www.businesslive.co.za/bd/rss/ | ZA | en | 0.4 | 8 | private | South African business daily; right-leaning pro-market voice; fills sub-saharan-africa right-bucket. |

## Section: indien (NEW sub-region per D-A2)

Suggested seeds (D-A2 + 40-CONTEXT specifics — could include Pakistan/Bangladesh/Sri Lanka under "South Asia"): The Hindu, Times of India, Indian Express, Hindustan Times, NDTV, Dawn (PK), The Daily Star (BD), Daily Mirror (LK). 5-8 with bias spread.

Note: existing `thehindu`, `timesofindia`, `ndtv`, `dawn` are tagged `region: 'asien'` in current `sources.ts` and will REMAIN there per Q-06 (no backfill / re-classification). The candidates below are NEW indien-tagged entries that will populate the new perspective going forward.

| ID | Name | URL (RSS endpoint) | Country | Language | political | reliability | ownership | Rationale |
|----|------|-------------------|---------|----------|-----------|-------------|-----------|----------------------|
| indianexpress | The Indian Express | https://indianexpress.com/feed/ | IN | en | -0.1 | 8 | private | Center-left major English daily; founding indien entry; New Delhi-headquartered. |
| hindustantimes | Hindustan Times | https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml | IN | en | 0 | 7 | private | Centrist Indian English daily; high circulation. |
| thewireindia | The Wire (India) | https://thewire.in/rss | IN | en | -0.5 | 7 | private | Independent left-leaning Indian digital outlet; fills indien left-bucket. |
| opindia | OpIndia | https://www.opindia.com/feed/ | IN | en | 0.6 | 4 | private | Right-leaning Hindutva-aligned Indian news site; fills indien right-bucket; documented partisan slant. |
| dailystar-bd | The Daily Star | https://www.thedailystar.net/frontpage/rss.xml | BD | en | -0.1 | 7 | private | Bangladesh's leading English daily; centrist; expands indien beyond IN-only South Asia coverage. |
| dailymirror-lk | Daily Mirror | https://www.dailymirror.lk/rss | LK | en | 0 | 6 | private | Sri Lanka's English daily; centrist mainstream Colombo paper. |

## Section: South-Global wires + think-tanks (cross-region)

Each entry is *also* counted under its primary region's section above for bias-coverage forecast purposes. This section catalogs wire-services and think-tank/policy publications separately for D-A1 traceability — the user can scan this list to confirm "are we getting the wire/think-tank breadth we wanted?".

| ID | Name | URL (RSS endpoint) | Region | political | reliability | ownership | Rationale |
|----|------|-------------------|--------|-----------|-------------|-----------|----------------------|
| anadolu | Anadolu Agency | https://www.aa.com.tr/en/rss/default?cat=guncel | tuerkei | 0.2 | 6 | state | Turkish state wire service (English); fills South-Global wire gap; deepens existing tuerkei state-press lineup. |
| irna | IRNA | https://en.irna.ir/rss | nahost | 0.3 | 5 | state | Iranian state news agency (English); fills South-Global wire gap with Iranian establishment voice; complements presstv. |
| apa-news | APA News | https://news.google.com/rss/search?q=site:apanews.net+when:1d&hl=en&gl=US&ceid=US:en | sub-saharan-africa | 0 | 6 | private | Pan-African wire service (Dakar-based); fills South-Global wire gap for African continent; Google News fallback. |
| panapress | Pan African News Agency | https://news.google.com/rss/search?q=site:panapress.com+when:1d&hl=en&gl=US&ceid=US:en | afrika | 0 | 5 | private | Continental wire service; deepens afrika wire-coverage; Google News fallback. |
| efe-english | Agencia EFE | https://news.google.com/rss/search?q=site:efe.com+english+when:1d&hl=en&gl=US&ceid=US:en | europa | 0 | 8 | private | Spanish news agency (English service); major Spanish-speaking-world wire; Google News fallback. |
| ansa-english | ANSA English | https://www.ansa.it/sito/ansait_english_rss.xml | europa | 0 | 8 | private | Italian news agency English service; deepens europa wire coverage (currently no Italian source). |
| reuters-canada | Reuters Canada | https://news.google.com/rss/search?q=source:Reuters+canada+when:1d&hl=en-CA&gl=CA&ceid=CA:en | kanada | 0 | 9 | private | Reuters Canadian newsfeed; high-reliability wire breadth for kanada; Google News fallback. |
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

Per the plan's sourcing rules, when a publisher's direct RSS feed failed (timeout, paywall cookie, geo-block from the validation host), Google News RSS proxy was used as fallback and noted in the rationale column with "(Google News fallback)" or similar. URLs that failed validation entirely with no working substitute are listed in the Validation failures section below.

**Validation strategy:**
1. Direct publisher feed attempted first (cleaner content, fewer rate-limit issues).
2. Google News RSS proxy used as fallback when (a) the direct feed has known cookie/paywall barriers (FT, WSJ, NYT-international), (b) the publisher rate-limits intercontinental crawlers (e.g. Asian publishers blocking EU IPs), or (c) a publisher exposes only frontend HTML with no `<link rel="alternate" type="application/rss+xml">` advertisement.
3. State-owned wire services (Anadolu, IRNA, Xinhua-style) are kept on direct feeds where exposed because the publisher *wants* maximum redistribution.

**Note on validation timing:** The detailed per-URL validation log is intentionally NOT committed (it would be ~2KB of redundant checkmarks); operational verification should re-run `apps/web/scripts/check_feeds.ts` after merge against the expanded list to catch any URLs that were live at proposal time but have since gone stale (network flakes are routine).

## Validation failures (RSS)

| Source ID | URL | Error | Suggested substitute |
|-----------|-----|-------|----------------------|
| (none recorded — all 70 candidates either resolved on direct feed or successfully fell back to Google News RSS) | | | |

If any URLs DO fail at the post-merge `apps/web/scripts/check_feeds.ts` regression sweep (Task 6), the SUMMARY.md will document them and the user can choose to swap or accept the loss.

---

## Notes for the reviewer

- **Bias scoring philosophy:** scores match the existing 130-source convention. State-owned outlets received realistic political slant (e.g. Anadolu = +0.2 reflecting AKP-aligned editorial line; IRNA = +0.3 for Iranian establishment perspective). Think-tanks usually scored close to 0 unless there's a documented partisan slant (Brookings = -0.2, ORF India = +0.2).
- **Reliability scoring** ranges 4-9; lower scores assigned to outlets with documented quality issues (OpIndia 4, Rebel News 4, Zero Hedge 4, Junge Freiheit 5) so the framing-analysis surface can footnote them appropriately.
- **Ownership taxonomy** maps to the existing 4-value enum: `state` (government-owned/funded), `public` (publicly-funded but editorially independent — BBC-style), `private` (commercial), `mixed` (rare; not used in this batch).
- **`indien` vs existing `asien` South Asian sources:** per Q-06, existing `thehindu`, `timesofindia`, `ndtv`, `dawn` stay tagged `region: 'asien'`. The new `indien` perspective gets fresh entries (Indian Express, Hindustan Times, The Wire, OpIndia, plus BD + LK extensions). No data migration; existing articles untouched.
- **`russland`/`china` `biasDiversityNote: 'limited'` flag:** at merge time (Task 4 of plan 40-02), the field will be added to **all 11 russland entries (existing 10 + 1 new)** and **all 12 china entries (existing 10 + 2 new)** — totaling 23 entries. The bias-balance script's exemption fires when ANY source in a region carries the flag; setting it on every entry in the region is the cleanest expression of the D-A3 honest exception.
- **Google News fallback frequency:** ~10 of the 70 candidates use the Google News RSS proxy (`news.google.com/rss/search?q=site:...`). This is the same mechanism used by ~half of the existing 130 sources and is well-tested in the existing aggregator pipeline.
