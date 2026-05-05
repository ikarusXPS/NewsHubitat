/**
 * Seed mock news + sources for screenshot capture and demo runs.
 *
 * Idempotent: re-running upserts the same fixed IDs.
 *
 * Run via: pnpm seed:news (or `npx tsx prisma/seed-news.ts` from apps/web).
 */
import 'dotenv/config';
import { prisma } from '../server/db/prisma';
import { NEWS_SOURCES } from '../server/config/sources';

interface MockArticle {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  summary: string;
  perspective: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  topics: string[];
  entities: string[];
  imageUrl: string;
  hoursAgo: number;
}

const HOUR_MS = 60 * 60 * 1000;

const MOCK_ARTICLES: MockArticle[] = [
  // Military / geo events
  {
    id: 'seed-001',
    sourceId: 'reuters-us',
    title: 'Drone strike reported near Kyiv as Russia escalates pressure',
    content: 'A series of drone attacks targeted infrastructure near Kyiv overnight, with air defense forces intercepting most of the threats. The strike comes amid renewed missile pressure on Ukraine\'s eastern front. Officials said the attack damaged a power substation but caused no civilian casualties.',
    summary: 'Drone attacks targeted Kyiv area infrastructure overnight; air defenses intercepted most threats.',
    perspective: 'usa',
    sentiment: 'negative',
    sentimentScore: -0.6,
    topics: ['ukraine', 'russia', 'military', 'drone'],
    entities: ['Kyiv', 'Russia', 'Ukraine'],
    imageUrl: 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800',
    hoursAgo: 2,
  },
  {
    id: 'seed-002',
    sourceId: 'bbc',
    title: 'Israeli airstrike hits Rafah amid ceasefire talks',
    content: 'An Israeli airstrike struck the southern Gaza city of Rafah early Tuesday, even as diplomatic teams in Doha continued ceasefire negotiations. Humanitarian aid groups reported damage to a medical clinic and called for an immediate halt to the offensive.',
    summary: 'Airstrike hits Rafah while ceasefire talks continue in Doha; medical clinic damaged.',
    perspective: 'europa',
    sentiment: 'negative',
    sentimentScore: -0.7,
    topics: ['gaza', 'israel', 'ceasefire', 'humanitarian'],
    entities: ['Rafah', 'Gaza', 'Doha', 'Israel'],
    imageUrl: 'https://images.unsplash.com/photo-1586892477838-2b96e85e0f96?w=800',
    hoursAgo: 4,
  },
  {
    id: 'seed-003',
    sourceId: 'aljazeera',
    title: 'Humanitarian aid convoy reaches northern Gaza after 14-day delay',
    content: 'A 32-truck humanitarian aid convoy carrying food, water, and medical supplies finally reached northern Gaza after a two-week border delay. UN officials warned that the level of aid remains far below what is needed to prevent a worsening famine.',
    summary: 'UN aid convoy reaches northern Gaza after long delay; officials say more needed.',
    perspective: 'nahost',
    sentiment: 'neutral',
    sentimentScore: 0.1,
    topics: ['gaza', 'humanitarian', 'aid', 'un'],
    entities: ['Gaza', 'UN'],
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    hoursAgo: 6,
  },
  {
    id: 'seed-004',
    sourceId: 'rt',
    title: 'Moscow demands Western powers halt arms shipments to Kyiv',
    content: 'Russian foreign minister demanded an immediate halt to NATO arms shipments, calling them a direct provocation. The statement followed reports of new long-range missile deliveries arriving at the Polish-Ukrainian border.',
    summary: 'Russia\'s foreign ministry demands NATO halt arms transfers to Ukraine.',
    perspective: 'russland',
    sentiment: 'negative',
    sentimentScore: -0.4,
    topics: ['russia', 'nato', 'ukraine', 'diplomacy'],
    entities: ['Moscow', 'NATO', 'Kyiv'],
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    hoursAgo: 3,
  },
  {
    id: 'seed-005',
    sourceId: 'xinhua',
    title: 'China-Brazil summit produces 24 cooperation agreements',
    content: 'A two-day summit between China and Brazil concluded with 24 signed cooperation agreements covering trade, agriculture, infrastructure, and renewable energy. Officials hailed the agreements as a milestone for Global South diplomacy.',
    summary: 'China and Brazil sign 24 cooperation agreements at summit; trade and renewables prioritized.',
    perspective: 'china',
    sentiment: 'positive',
    sentimentScore: 0.6,
    topics: ['china', 'brazil', 'diplomacy', 'trade'],
    entities: ['Beijing', 'Brasilia', 'Brazil', 'China'],
    imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800',
    hoursAgo: 8,
  },
  {
    id: 'seed-006',
    sourceId: 'spiegel-intl',
    title: 'Berlin announces €4 billion energy security package',
    content: 'The German federal government unveiled a €4 billion package aimed at securing winter energy supplies and accelerating the rollout of renewable infrastructure. Chancellor stressed that the plan would not increase consumer bills.',
    summary: 'Germany\'s €4bn energy package targets winter security and renewable rollout.',
    perspective: 'deutschland',
    sentiment: 'positive',
    sentimentScore: 0.5,
    topics: ['deutschland', 'energy', 'climate'],
    entities: ['Berlin', 'Germany'],
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800',
    hoursAgo: 5,
  },
  {
    id: 'seed-007',
    sourceId: 'lemonde-diplo',
    title: 'Mass protest in Paris over pension reform reaches 200,000',
    content: 'Police estimated 200,000 demonstrators marched through central Paris in the largest protest in three years over the proposed pension reform. The rally remained peaceful, with union leaders announcing a follow-up strike for next week.',
    summary: 'Paris pension protest draws 200,000; further strikes planned.',
    perspective: 'europa',
    sentiment: 'negative',
    sentimentScore: -0.3,
    topics: ['france', 'protest', 'pension', 'europa'],
    entities: ['Paris', 'France'],
    imageUrl: 'https://images.unsplash.com/photo-1591193686104-fddba4d29304?w=800',
    hoursAgo: 7,
  },
  {
    id: 'seed-008',
    sourceId: 'cnn',
    title: 'US Treasury announces new sanctions package targeting Tehran',
    content: 'The US Treasury Department announced expanded sanctions on Tehran-linked entities tied to drone production. The measure freezes assets and bars dollar-denominated transactions for 14 named companies and 8 individuals.',
    summary: 'Treasury expands Iran sanctions targeting drone supply chain.',
    perspective: 'usa',
    sentiment: 'negative',
    sentimentScore: -0.4,
    topics: ['usa', 'iran', 'sanctions', 'drone'],
    entities: ['Tehran', 'Washington', 'US Treasury'],
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
    hoursAgo: 9,
  },
  {
    id: 'seed-009',
    sourceId: 'guardian',
    title: 'UN Security Council deadlocked over Gaza ceasefire resolution',
    content: 'A UN Security Council vote on a Gaza ceasefire resolution failed after a permanent member exercised veto power for the third time this year. Diplomats from twelve nations called for emergency meetings.',
    summary: 'UN Security Council blocked again on Gaza ceasefire vote.',
    perspective: 'europa',
    sentiment: 'negative',
    sentimentScore: -0.5,
    topics: ['un', 'gaza', 'diplomacy', 'ceasefire'],
    entities: ['UN', 'Gaza', 'Security Council'],
    imageUrl: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=800',
    hoursAgo: 11,
  },
  {
    id: 'seed-010',
    sourceId: 'tass',
    title: 'Russian forces report capture of strategic village in Donbas',
    content: 'Russian defense ministry reported the capture of a strategic village near Bakhmut after weeks of artillery shelling and infantry assaults. Ukrainian forces have not confirmed the loss but acknowledged heavy combat in the sector.',
    summary: 'Russian MoD claims village near Bakhmut; Ukraine cites heavy combat.',
    perspective: 'russland',
    sentiment: 'negative',
    sentimentScore: -0.5,
    topics: ['russia', 'ukraine', 'military', 'bakhmut'],
    entities: ['Bakhmut', 'Donbas', 'Russia', 'Ukraine'],
    imageUrl: 'https://images.unsplash.com/photo-1517490232338-06b912a786b5?w=800',
    hoursAgo: 12,
  },

  // Diplomacy events
  {
    id: 'seed-011',
    sourceId: 'reuters-us',
    title: 'NATO summit in Brussels concludes with new defense spending pledge',
    content: 'NATO members agreed at a Brussels summit to raise the defense spending floor to 2.5% of GDP. The communiqué also committed to a permanent forward presence on the eastern flank.',
    summary: 'NATO ministers raise defense spending floor to 2.5% at Brussels summit.',
    perspective: 'usa',
    sentiment: 'neutral',
    sentimentScore: 0.2,
    topics: ['nato', 'diplomacy', 'defense', 'europa'],
    entities: ['Brussels', 'NATO'],
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    hoursAgo: 13,
  },
  {
    id: 'seed-012',
    sourceId: 'nytimes',
    title: 'US, China resume trade talks after six-month freeze',
    content: 'US and Chinese trade negotiators resumed dialogue this week after a six-month freeze, with discussions focused on semiconductor exports and tariff reductions. Both sides described the meeting as constructive.',
    summary: 'US and China restart trade dialogue; semiconductor exports on the agenda.',
    perspective: 'usa',
    sentiment: 'positive',
    sentimentScore: 0.4,
    topics: ['usa', 'china', 'trade', 'diplomacy'],
    entities: ['Washington', 'Beijing'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    hoursAgo: 14,
  },
  {
    id: 'seed-013',
    sourceId: 'hurriyet',
    title: 'Turkey hosts Russia-Ukraine grain corridor talks in Istanbul',
    content: 'Diplomats from Russia, Ukraine, Turkey, and the UN met in Istanbul to extend the Black Sea grain corridor agreement. The talks focused on insurance arrangements and inspection protocols.',
    summary: 'Black Sea grain corridor renegotiated in Istanbul; insurance terms key.',
    perspective: 'tuerkei',
    sentiment: 'positive',
    sentimentScore: 0.4,
    topics: ['turkey', 'russia', 'ukraine', 'diplomacy', 'grain'],
    entities: ['Istanbul', 'Turkey', 'Black Sea'],
    imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800',
    hoursAgo: 16,
  },

  // Climate / humanitarian
  {
    id: 'seed-014',
    sourceId: 'guardian',
    title: 'COP29 closes with $300bn climate finance pledge for developing nations',
    content: 'COP29 concluded with a pledge of $300 billion in annual climate finance for developing nations by 2035. Activists called the figure inadequate while industrialized countries described it as a milestone.',
    summary: 'COP29 ends with $300bn-by-2035 climate finance pledge.',
    perspective: 'europa',
    sentiment: 'positive',
    sentimentScore: 0.3,
    topics: ['climate', 'cop29', 'diplomacy', 'finance'],
    entities: ['COP29'],
    imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800',
    hoursAgo: 18,
  },
  {
    id: 'seed-015',
    sourceId: 'aljazeera',
    title: 'Major flooding in Pakistan displaces 1.5 million as monsoon intensifies',
    content: 'Severe flooding across Sindh and Punjab provinces displaced an estimated 1.5 million people. Pakistan\'s government has declared a state of emergency and requested international humanitarian aid.',
    summary: 'Pakistan declares emergency as floods displace 1.5 million; aid sought.',
    perspective: 'asien',
    sentiment: 'negative',
    sentimentScore: -0.7,
    topics: ['pakistan', 'flood', 'humanitarian', 'climate'],
    entities: ['Sindh', 'Punjab', 'Pakistan'],
    imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800',
    hoursAgo: 19,
  },

  // Tech / economy
  {
    id: 'seed-016',
    sourceId: 'wsj',
    title: 'Federal Reserve holds rates steady, signals two more cuts in 2026',
    content: 'The Federal Reserve held its benchmark interest rate steady at the latest FOMC meeting and signaled two additional rate cuts before the end of 2026. Markets reacted positively, with the S&P 500 rising 1.2%.',
    summary: 'Fed keeps rates flat; two more 2026 cuts signaled. Markets up 1.2%.',
    perspective: 'usa',
    sentiment: 'positive',
    sentimentScore: 0.5,
    topics: ['economy', 'fed', 'rates', 'usa'],
    entities: ['Federal Reserve', 'FOMC'],
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    hoursAgo: 5,
  },
  {
    id: 'seed-017',
    sourceId: 'bloomberg',
    title: 'European Central Bank inflation forecast revised down to 2.1%',
    content: 'The ECB revised its 2026 inflation forecast down to 2.1%, citing easing energy prices and tighter monetary policy effects. The outlook supports continued gradual rate cuts.',
    summary: 'ECB cuts 2026 inflation forecast to 2.1%; rate-cut path stays.',
    perspective: 'europa',
    sentiment: 'positive',
    sentimentScore: 0.4,
    topics: ['economy', 'ecb', 'inflation', 'europa'],
    entities: ['ECB', 'Frankfurt'],
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
    hoursAgo: 10,
  },
  {
    id: 'seed-018',
    sourceId: 'cnn',
    title: 'AI safety summit in Seoul produces binding international commitments',
    content: 'Leaders from 28 nations signed binding AI safety commitments at the Seoul summit, including red-team testing requirements for frontier models and a shared incident-reporting framework.',
    summary: 'Seoul AI summit yields binding commitments from 28 nations.',
    perspective: 'asien',
    sentiment: 'positive',
    sentimentScore: 0.6,
    topics: ['ai', 'tech', 'seoul', 'diplomacy'],
    entities: ['Seoul', 'AI'],
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
    hoursAgo: 6,
  },

  // Asia
  {
    id: 'seed-019',
    sourceId: 'xinhua',
    title: 'Beijing tech sector rebounds 18% on AI investment surge',
    content: 'Chinese technology stocks rose 18% over the past month, driven by domestic AI infrastructure investment and easing regulatory pressure. Several major firms announced multi-billion-yuan capacity expansions.',
    summary: 'China tech up 18% on AI capex and regulatory easing.',
    perspective: 'china',
    sentiment: 'positive',
    sentimentScore: 0.6,
    topics: ['china', 'tech', 'ai', 'economy'],
    entities: ['Beijing', 'China'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    hoursAgo: 22,
  },
  {
    id: 'seed-020',
    sourceId: 'bbc',
    title: 'Japan signs $5bn semiconductor cooperation deal with India',
    content: 'Tokyo and New Delhi signed a $5 billion semiconductor cooperation agreement covering joint R&D, fabrication facilities, and workforce training. The deal is seen as a counterweight to regional supply chain risks.',
    summary: 'Japan-India $5bn semiconductor deal counters supply chain risk.',
    perspective: 'asien',
    sentiment: 'positive',
    sentimentScore: 0.7,
    topics: ['japan', 'india', 'tech', 'semiconductor', 'diplomacy'],
    entities: ['Tokyo', 'New Delhi'],
    imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800',
    hoursAgo: 24,
  },

  // Africa / Latin America
  {
    id: 'seed-021',
    sourceId: 'aljazeera',
    title: 'Sudan crisis: Khartoum aid agencies report worsening famine conditions',
    content: 'Aid agencies operating in Khartoum reported sharply worsening famine conditions across Sudan, with several million people facing acute food insecurity. Convoys carrying medical supplies were attacked twice this week.',
    summary: 'Sudan famine deepens; medical aid convoys attacked in Khartoum.',
    perspective: 'afrika',
    sentiment: 'negative',
    sentimentScore: -0.8,
    topics: ['sudan', 'humanitarian', 'famine'],
    entities: ['Khartoum', 'Sudan'],
    imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800',
    hoursAgo: 15,
  },
  {
    id: 'seed-022',
    sourceId: 'guardian',
    title: 'Mexican president visits Washington to renegotiate trade framework',
    content: 'Mexico\'s president met with the US administration in Washington to begin renegotiation of the regional trade framework. Tariff carve-outs for the auto sector and agriculture top the agenda.',
    summary: 'Mexico-US trade talks open in Washington; autos and agriculture key.',
    perspective: 'lateinamerika',
    sentiment: 'neutral',
    sentimentScore: 0.1,
    topics: ['mexico', 'usa', 'trade', 'diplomacy'],
    entities: ['Mexico', 'Washington'],
    imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
    hoursAgo: 17,
  },

  // Domestic Germany
  {
    id: 'seed-023',
    sourceId: 'tagesschau-en',
    title: 'Bundestag passes climate transition law with cross-party majority',
    content: 'Germany\'s Bundestag passed a sweeping climate transition law with cross-party support, mandating a 65% emissions cut by 2030. Industry groups warned of competitiveness risks while environmental NGOs called the law overdue.',
    summary: 'Bundestag passes climate law with 65%-by-2030 emissions cut.',
    perspective: 'deutschland',
    sentiment: 'positive',
    sentimentScore: 0.5,
    topics: ['deutschland', 'climate', 'bundestag'],
    entities: ['Bundestag', 'Berlin'],
    imageUrl: 'https://images.unsplash.com/photo-1554224154-26032cdc8b62?w=800',
    hoursAgo: 8,
  },
  {
    id: 'seed-024',
    sourceId: 'taz',
    title: 'Frankfurt rally protests planned data retention expansion',
    content: 'A protest in Frankfurt drew several thousand demonstrators against the proposed expansion of data retention rules. Civil-liberties groups argue the bill violates EU privacy standards.',
    summary: 'Frankfurt data-retention protest; activists cite EU privacy law.',
    perspective: 'deutschland',
    sentiment: 'negative',
    sentimentScore: -0.3,
    topics: ['deutschland', 'protest', 'privacy', 'tech'],
    entities: ['Frankfurt'],
    imageUrl: 'https://images.unsplash.com/photo-1519750013442-e1d29a82d4ea?w=800',
    hoursAgo: 21,
  },

  // Alternative / non-mainstream
  {
    id: 'seed-025',
    sourceId: 'intercept',
    title: 'Investigation: Drone supply chain spans 12 jurisdictions, evades export controls',
    content: 'A months-long investigation traced military drone components through 12 jurisdictions, revealing systematic evasion of Western export controls via shell companies and trans-shipment hubs.',
    summary: 'Drone parts evade export controls via 12 jurisdictions; investigation finds shell-company chain.',
    perspective: 'alternative',
    sentiment: 'negative',
    sentimentScore: -0.5,
    topics: ['investigation', 'drone', 'sanctions', 'tech'],
    entities: ['Export controls'],
    imageUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    hoursAgo: 30,
  },
  {
    id: 'seed-026',
    sourceId: 'democracynow',
    title: 'Indigenous communities march in Lima against mining concessions',
    content: 'Thousands of indigenous demonstrators marched in Lima against newly granted mining concessions on protected ancestral lands. Organizers said the concessions violate prior consultation requirements.',
    summary: 'Lima march opposes mining concessions on indigenous lands.',
    perspective: 'lateinamerika',
    sentiment: 'negative',
    sentimentScore: -0.3,
    topics: ['lateinamerika', 'protest', 'mining', 'indigenous'],
    entities: ['Lima', 'Peru'],
    imageUrl: 'https://images.unsplash.com/photo-1495556650867-99590cea3657?w=800',
    hoursAgo: 26,
  },

  // Health / science
  {
    id: 'seed-027',
    sourceId: 'reuters-us',
    title: 'WHO warns of rising cholera outbreak in Yemen, calls for funding',
    content: 'The WHO warned of a rapidly worsening cholera outbreak in Yemen, with case counts up 40% month-over-month. The agency issued an urgent funding appeal for medical supplies and water sanitation infrastructure.',
    summary: 'WHO: Yemen cholera up 40%; emergency funding appeal launched.',
    perspective: 'nahost',
    sentiment: 'negative',
    sentimentScore: -0.6,
    topics: ['who', 'yemen', 'humanitarian', 'health'],
    entities: ['Yemen', 'WHO', 'Sanaa'],
    imageUrl: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=800',
    hoursAgo: 12,
  },
  {
    id: 'seed-028',
    sourceId: 'lemonde-diplo',
    title: 'EU adopts revised AI Act compliance timeline',
    content: 'The European Council adopted a revised AI Act compliance timeline, extending some general-purpose model obligations by 18 months while preserving the risk-classification framework. Industry welcomed the change.',
    summary: 'EU revises AI Act timeline; GPAI obligations delayed 18 months.',
    perspective: 'europa',
    sentiment: 'neutral',
    sentimentScore: 0.2,
    topics: ['europa', 'ai', 'regulation', 'tech'],
    entities: ['EU', 'Brussels'],
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
    hoursAgo: 20,
  },

  // More military / Eastern Europe
  {
    id: 'seed-029',
    sourceId: 'bbc',
    title: 'Ukrainian counter-offensive recaptures villages near Kharkiv',
    content: 'Ukrainian forces reported recapturing three villages northeast of Kharkiv in a counter-offensive that began three days ago. Heavy combat continues as both sides reinforce positions.',
    summary: 'Ukraine retakes 3 villages near Kharkiv; combat continues.',
    perspective: 'europa',
    sentiment: 'neutral',
    sentimentScore: 0.0,
    topics: ['ukraine', 'russia', 'military', 'kharkiv'],
    entities: ['Kharkiv', 'Ukraine'],
    imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800',
    hoursAgo: 4,
  },
  {
    id: 'seed-030',
    sourceId: 'hurriyet',
    title: 'Ankara hosts trilateral Iran-Turkey-Iraq energy talks',
    content: 'Foreign ministers from Iran, Turkey, and Iraq met in Ankara to discuss cross-border energy infrastructure and a proposed natural gas corridor. Officials described preliminary agreement on a feasibility study.',
    summary: 'Iran-Turkey-Iraq energy talks in Ankara reach feasibility-study agreement.',
    perspective: 'tuerkei',
    sentiment: 'positive',
    sentimentScore: 0.4,
    topics: ['turkey', 'iran', 'iraq', 'energy', 'diplomacy'],
    entities: ['Ankara', 'Tehran', 'Baghdad'],
    imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800',
    hoursAgo: 11,
  },

  // Recent breaking-style
  {
    id: 'seed-031',
    sourceId: 'reuters-us',
    title: 'BREAKING: Major cyberattack hits European banking infrastructure',
    content: 'A coordinated cyberattack disrupted online banking services across at least seven European countries Monday morning. National cyber agencies are investigating; no group has claimed responsibility yet.',
    summary: 'Coordinated cyberattack disrupts European bank services in 7 countries.',
    perspective: 'usa',
    sentiment: 'negative',
    sentimentScore: -0.6,
    topics: ['europa', 'cyber', 'banking', 'security'],
    entities: ['Europe'],
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
    hoursAgo: 1,
  },
  {
    id: 'seed-032',
    sourceId: 'spiegel-intl',
    title: 'Hamburg port reports record container throughput in Q1',
    content: 'Hamburg\'s port reported record-breaking Q1 container throughput, citing rebounding Asian demand and improved rail logistics. Volume rose 12% year-over-year.',
    summary: 'Hamburg port Q1 volumes up 12% YoY; Asian demand drives rebound.',
    perspective: 'deutschland',
    sentiment: 'positive',
    sentimentScore: 0.6,
    topics: ['deutschland', 'economy', 'logistics'],
    entities: ['Hamburg'],
    imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    hoursAgo: 23,
  },
  {
    id: 'seed-033',
    sourceId: 'wsj',
    title: 'Tesla announces $3bn battery plant expansion in Texas',
    content: 'Tesla announced a $3 billion expansion of its Texas battery cell facility, projected to create 4,000 jobs. The plant will produce next-generation 4680 cells with improved energy density.',
    summary: 'Tesla\'s $3bn Texas battery plant expansion to add 4,000 jobs.',
    perspective: 'usa',
    sentiment: 'positive',
    sentimentScore: 0.7,
    topics: ['usa', 'tesla', 'tech', 'energy'],
    entities: ['Texas', 'Tesla'],
    imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
    hoursAgo: 14,
  },

  // Lighter
  {
    id: 'seed-034',
    sourceId: 'guardian',
    title: 'London Marathon raises record £80 million for charity',
    content: 'The London Marathon raised a record £80 million for charity this year, surpassing last year\'s total by 18%. Organizers cited a strong field of corporate sponsors and individual fundraisers.',
    summary: 'London Marathon charity total hits record £80m, up 18% YoY.',
    perspective: 'europa',
    sentiment: 'positive',
    sentimentScore: 0.8,
    topics: ['europa', 'sport', 'charity'],
    entities: ['London'],
    imageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800',
    hoursAgo: 28,
  },
  {
    id: 'seed-035',
    sourceId: 'tagesschau-en',
    title: 'ESA Mars rover transmits highest-resolution surface imagery yet',
    content: 'The European Space Agency\'s Mars rover transmitted its highest-resolution surface imagery to date, including detailed views of mineral deposits in Jezero Crater. Scientists called the data a breakthrough for astrobiology.',
    summary: 'ESA Mars rover sends record-resolution Jezero imagery; mineral data hailed.',
    perspective: 'europa',
    sentiment: 'positive',
    sentimentScore: 0.7,
    topics: ['europa', 'esa', 'space', 'science'],
    entities: ['ESA', 'Mars'],
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800',
    hoursAgo: 32,
  },
  {
    id: 'seed-036',
    sourceId: 'aljazeera',
    title: 'Egypt and Saudi Arabia sign Red Sea tourism corridor pact',
    content: 'Egypt and Saudi Arabia signed a Red Sea tourism corridor pact aimed at developing joint cruise and dive sites along the coast. The agreement includes a $2 billion infrastructure commitment.',
    summary: 'Egypt-Saudi Red Sea tourism pact signed; $2bn infrastructure commitment.',
    perspective: 'nahost',
    sentiment: 'positive',
    sentimentScore: 0.6,
    topics: ['nahost', 'egypt', 'saudi-arabia', 'tourism', 'diplomacy'],
    entities: ['Cairo', 'Riyadh', 'Red Sea'],
    imageUrl: 'https://images.unsplash.com/photo-1581434659112-49ec47b2afaa?w=800',
    hoursAgo: 25,
  },

  // Africa
  {
    id: 'seed-037',
    sourceId: 'bbc',
    title: 'Kenya hosts pan-African renewable energy summit in Nairobi',
    content: 'Heads of state from 14 African nations met in Nairobi for a renewable energy summit, agreeing on a continental grid interconnection roadmap. The summit closed with $11 billion in committed investments.',
    summary: 'Nairobi summit: 14 nations agree continental grid roadmap, $11bn committed.',
    perspective: 'afrika',
    sentiment: 'positive',
    sentimentScore: 0.7,
    topics: ['afrika', 'kenya', 'energy', 'diplomacy'],
    entities: ['Nairobi', 'Kenya'],
    imageUrl: 'https://images.unsplash.com/photo-1566041510639-8d95cc8aece4?w=800',
    hoursAgo: 33,
  },
  {
    id: 'seed-038',
    sourceId: 'aljazeera',
    title: 'Nigeria flooding affects 600,000 across Niger Delta',
    content: 'Severe flooding in Nigeria\'s Niger Delta affected approximately 600,000 residents, with rescue operations underway. The federal government dispatched emergency response teams from Abuja.',
    summary: 'Niger Delta flooding hits 600k; Abuja deploys emergency teams.',
    perspective: 'afrika',
    sentiment: 'negative',
    sentimentScore: -0.7,
    topics: ['afrika', 'nigeria', 'flood', 'humanitarian'],
    entities: ['Abuja', 'Nigeria', 'Niger Delta'],
    imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800',
    hoursAgo: 27,
  },

  // Oceania / final
  {
    id: 'seed-039',
    sourceId: 'reuters-us',
    title: 'Australia announces strategic mineral export ban for unfriendly states',
    content: 'Australia announced a strategic mineral export framework that will block lithium, rare-earth, and graphite shipments to a list of designated unfriendly states. The policy comes amid growing supply-chain security concerns.',
    summary: 'Australia restricts strategic mineral exports to designated states.',
    perspective: 'ozeanien',
    sentiment: 'neutral',
    sentimentScore: 0.0,
    topics: ['ozeanien', 'australia', 'minerals', 'trade'],
    entities: ['Canberra', 'Australia'],
    imageUrl: 'https://images.unsplash.com/photo-1493947959003-1b8b1edd2c97?w=800',
    hoursAgo: 18,
  },
  {
    id: 'seed-040',
    sourceId: 'cbc',
    title: 'Canada announces 30,000 humanitarian visa places for displaced families',
    content: 'Canada announced 30,000 humanitarian visa places for families displaced by ongoing conflicts in Sudan, Ukraine, and Gaza. The program will be administered through expanded resettlement partnerships.',
    summary: 'Canada opens 30,000 humanitarian visa spots for displaced families.',
    perspective: 'kanada',
    sentiment: 'positive',
    sentimentScore: 0.7,
    topics: ['kanada', 'humanitarian', 'immigration'],
    entities: ['Canada', 'Ottawa'],
    imageUrl: 'https://images.unsplash.com/photo-1503614472-8c93d56cd601?w=800',
    hoursAgo: 9,
  },
];

async function ensureSources(): Promise<void> {
  console.log(`Upserting ${NEWS_SOURCES.length} news sources...`);
  for (const source of NEWS_SOURCES) {
    await prisma.newsSource.upsert({
      where: { id: source.id },
      update: {
        name: source.name,
        country: source.country,
        region: source.region,
        language: source.language,
        politicalBias: source.bias.political,
        reliability: source.bias.reliability,
        ownership: source.bias.ownership,
        apiEndpoint: source.apiEndpoint ?? null,
        rateLimit: source.rateLimit ?? 100,
      },
      create: {
        id: source.id,
        name: source.name,
        country: source.country,
        region: source.region,
        language: source.language,
        politicalBias: source.bias.political,
        reliability: source.bias.reliability,
        ownership: source.bias.ownership,
        apiEndpoint: source.apiEndpoint ?? null,
        rateLimit: source.rateLimit ?? 100,
      },
    });
  }
  console.log(`  ✓ ${NEWS_SOURCES.length} sources upserted.`);
}

async function ensureArticles(): Promise<void> {
  const sourceIds = new Set(NEWS_SOURCES.map((s) => s.id));
  const skipped = MOCK_ARTICLES.filter((a) => !sourceIds.has(a.sourceId));
  if (skipped.length > 0) {
    console.warn(`  ! Skipping ${skipped.length} articles with unknown sourceIds:`, skipped.map((a) => `${a.id} -> ${a.sourceId}`).join(', '));
  }
  const articles = MOCK_ARTICLES.filter((a) => sourceIds.has(a.sourceId));

  console.log(`Upserting ${articles.length} mock articles...`);
  const now = Date.now();
  for (const article of articles) {
    const publishedAt = new Date(now - article.hoursAgo * HOUR_MS);
    const url = `https://newshub-seed.example/${article.id}`;
    await prisma.newsArticle.upsert({
      where: { id: article.id },
      update: {
        title: article.title,
        content: article.content,
        summary: article.summary,
        originalLanguage: 'en',
        publishedAt,
        url,
        imageUrl: article.imageUrl,
        sentiment: article.sentiment,
        sentimentScore: article.sentimentScore,
        perspective: article.perspective,
        topics: article.topics,
        entities: article.entities,
        sourceId: article.sourceId,
      },
      create: {
        id: article.id,
        title: article.title,
        content: article.content,
        summary: article.summary,
        originalLanguage: 'en',
        publishedAt,
        url,
        imageUrl: article.imageUrl,
        sentiment: article.sentiment,
        sentimentScore: article.sentimentScore,
        perspective: article.perspective,
        topics: article.topics,
        entities: article.entities,
        sourceId: article.sourceId,
      },
    });
  }
  console.log(`  ✓ ${articles.length} articles upserted.`);
}

async function main(): Promise<void> {
  console.log('Seeding mock news data for screenshot capture / demo...\n');
  await ensureSources();
  await ensureArticles();
  console.log('\nDone.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
