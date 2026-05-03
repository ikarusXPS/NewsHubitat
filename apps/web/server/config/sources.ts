import type { NewsSource } from '../../src/types';

export const NEWS_SOURCES: NewsSource[] = [
  // ===== USA (10 sources) =====
  {
    id: 'ap',
    name: 'Associated Press',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Associated+Press+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'reuters-us',
    name: 'Reuters USA',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Reuters+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'cnn',
    name: 'CNN',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.2, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:CNN+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'nytimes',
    name: 'New York Times',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.3, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:New+York+Times+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'washingtonpost',
    name: 'Washington Post',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.3, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Washington+Post+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'wsj',
    name: 'Wall Street Journal',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0.3, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Wall+Street+Journal+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Bloomberg+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'foxnews',
    name: 'Fox News',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0.5, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Fox+News+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'npr',
    name: 'NPR',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.2, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:NPR+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'politico',
    name: 'Politico',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Politico+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources + 2 think-tank wires (cfr, brookings) — see proposed-sources/103-sources-proposed.md
  {
    id: 'theatlantic',
    name: 'The Atlantic',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.4, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.theatlantic.com/feed/all/',
    rateLimit: 100
  },
  {
    id: 'jacobin',
    name: 'Jacobin',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.7, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://jacobin.com/feed',
    rateLimit: 100
  },
  {
    id: 'reason',
    name: 'Reason Magazine',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://reason.com/feed/',
    rateLimit: 100
  },
  {
    id: 'theamericanconservative',
    name: 'The American Conservative',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0.5, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.theamericanconservative.com/feed/',
    rateLimit: 100
  },
  {
    id: 'nationalreview',
    name: 'National Review',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0.6, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.nationalreview.com/feed/',
    rateLimit: 100
  },
  {
    id: 'cfr',
    name: 'Council on Foreign Relations',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: 0.1, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://www.cfr.org/rss-feeds',
    rateLimit: 100
  },
  {
    id: 'brookings',
    name: 'Brookings Institution',
    country: 'US',
    region: 'usa',
    language: 'en',
    bias: { political: -0.2, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://www.brookings.edu/feed/',
    rateLimit: 100
  },

  // ===== EUROPA (10 sources) =====
  {
    id: 'bbc',
    name: 'BBC News',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
    rateLimit: 100
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: -0.3, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.theguardian.com/world/middleeast/rss',
    rateLimit: 100
  },
  {
    id: 'telegraph',
    name: 'The Telegraph',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: 0.4, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.telegraph.co.uk/rss.xml',
    rateLimit: 100
  },
  {
    id: 'independent',
    name: 'The Independent',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: -0.3, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.independent.co.uk/rss',
    rateLimit: 100
  },
  {
    id: 'france24',
    name: 'France 24',
    country: 'FR',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://www.france24.com/en/rss',
    rateLimit: 100
  },
  {
    id: 'afp',
    name: 'AFP',
    country: 'FR',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'euronews',
    name: 'Euronews',
    country: 'FR',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'thelocal',
    name: 'The Local Europe',
    country: 'EU',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'euractiv',
    name: 'EURACTIV',
    country: 'EU',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'eubserver',
    name: 'EUobserver',
    country: 'EU',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources + 5 wires/think-tanks
  {
    id: 'morningstaronline',
    name: 'Morning Star',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: -0.7, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://morningstaronline.co.uk/rss.xml',
    rateLimit: 100
  },
  {
    id: 'lemonde-diplo',
    name: 'Le Monde diplomatique',
    country: 'FR',
    region: 'europa',
    language: 'en',
    bias: { political: -0.6, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://mondediplo.com/spip.php?page=backend-en&lang=en',
    rateLimit: 100
  },
  {
    id: 'ft-europe',
    name: 'Financial Times Europe',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:ft.com+europe+when:1d&hl=en-GB&gl=GB&ceid=GB:en',
    rateLimit: 100
  },
  {
    id: 'irishtimes',
    name: 'The Irish Times',
    country: 'IE',
    region: 'europa',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.irishtimes.com/cmlink/news-1.1319192',
    rateLimit: 100
  },
  {
    id: 'spectator',
    name: 'The Spectator',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: 0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.spectator.co.uk/feed',
    rateLimit: 100
  },
  {
    id: 'efe-english',
    name: 'Agencia EFE',
    country: 'ES',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:efe.com+english+when:1d&hl=en&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'ansa-english',
    name: 'ANSA English',
    country: 'IT',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.ansa.it/sito/ansait_english_rss.xml',
    rateLimit: 100
  },
  {
    id: 'chathamhouse',
    name: 'Chatham House',
    country: 'UK',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://www.chathamhouse.org/rss/all',
    rateLimit: 100
  },
  {
    id: 'carnegie-eu',
    name: 'Carnegie Europe',
    country: 'BE',
    region: 'europa',
    language: 'en',
    bias: { political: -0.1, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://carnegieeurope.eu/rss/articles',
    rateLimit: 100
  },
  {
    id: 'merics',
    name: 'MERICS',
    country: 'DE',
    region: 'europa',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://merics.org/en/rss.xml',
    rateLimit: 100
  },

  // ===== DEUTSCHLAND (10 sources) =====
  {
    id: 'dw',
    name: 'Deutsche Welle',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://rss.dw.com/xml/rss-en-all',
    rateLimit: 100
  },
  {
    id: 'dw-mideast',
    name: 'DW Middle East',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://rss.dw.com/xml/rss-en-middle-east',
    rateLimit: 100
  },
  {
    id: 'spiegel-intl',
    name: 'Der Spiegel International',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: -0.2, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.spiegel.de/international/index.rss',
    rateLimit: 100
  },
  {
    id: 'zeit-online',
    name: 'Die Zeit Online',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: -0.2, reliability: 8, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'faz-english',
    name: 'Frankfurter Allgemeine',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: 0.2, reliability: 8, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'handelsblatt',
    name: 'Handelsblatt Today',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'dpa',
    name: 'Deutsche Presse-Agentur',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'sueddeutsche',
    name: 'Süddeutsche Zeitung',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'tagesschau-en',
    name: 'Tagesschau English',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'public' },
    rateLimit: 100
  },
  {
    id: 'berlin-spectator',
    name: 'The Berlin Spectator',
    country: 'DE',
    region: 'deutschland',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources
  {
    id: 'taz',
    name: 'taz',
    country: 'DE',
    region: 'deutschland',
    language: 'de',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://taz.de/!p4608;rss/',
    rateLimit: 100
  },
  {
    id: 'nzz',
    name: 'Neue Zürcher Zeitung',
    country: 'CH',
    region: 'deutschland',
    language: 'de',
    bias: { political: 0.3, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.nzz.ch/feed',
    rateLimit: 100
  },
  {
    id: 'derstandard',
    name: 'Der Standard',
    country: 'AT',
    region: 'deutschland',
    language: 'de',
    bias: { political: -0.2, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.derstandard.at/rss/inland',
    rateLimit: 100
  },
  {
    id: 'kleinezeitung',
    name: 'Kleine Zeitung',
    country: 'AT',
    region: 'deutschland',
    language: 'de',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.kleinezeitung.at/rss.xml',
    rateLimit: 100
  },
  {
    id: 'junge-freiheit',
    name: 'Junge Freiheit',
    country: 'DE',
    region: 'deutschland',
    language: 'de',
    bias: { political: 0.6, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://jungefreiheit.de/feed/',
    rateLimit: 100
  },

  // ===== NAHOST (10 sources) =====
  {
    id: 'aljazeera',
    name: 'Al Jazeera',
    country: 'QA',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.2, reliability: 7, ownership: 'state' },
    apiEndpoint: 'https://www.aljazeera.com/xml/rss/all.xml',
    rateLimit: 100
  },
  {
    id: 'haaretz',
    name: 'Haaretz',
    country: 'IL',
    region: 'nahost',
    language: 'en',
    bias: { political: -0.3, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.haaretz.com/srv/haaretz-latest-headlines',
    rateLimit: 50
  },
  {
    id: 'timesofisrael',
    name: 'Times of Israel',
    country: 'IL',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.timesofisrael.com/feed/',
    rateLimit: 100
  },
  {
    id: 'middleeasteye',
    name: 'Middle East Eye',
    country: 'UK',
    region: 'nahost',
    language: 'en',
    bias: { political: -0.2, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.middleeasteye.net/rss',
    rateLimit: 100
  },
  {
    id: 'presstv',
    name: 'PressTV',
    country: 'IR',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.4, reliability: 4, ownership: 'state' },
    rateLimit: 50
  },
  {
    id: 'arabnews',
    name: 'Arab News',
    country: 'SA',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.3, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.arabnews.com/rss.xml',
    rateLimit: 100
  },
  {
    id: 'aawsat',
    name: 'Asharq Al-Awsat',
    country: 'SA',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.4, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'ahramonline',
    name: 'Al Ahram English',
    country: 'EG',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.3, reliability: 6, ownership: 'state' },
    apiEndpoint: 'http://english.ahram.org.eg/UI/Front/InnerRSS.aspx',
    rateLimit: 100
  },
  {
    id: 'jpost',
    name: 'Jerusalem Post',
    country: 'IL',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.3, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx',
    rateLimit: 100
  },
  {
    id: 'i24news',
    name: 'i24 News',
    country: 'IL',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.i24news.tv/en/rss',
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources + 1 wire (irna)
  {
    id: 'plus972',
    name: '+972 Magazine',
    country: 'IL',
    region: 'nahost',
    language: 'en',
    bias: { political: -0.6, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.972mag.com/feed/',
    rateLimit: 100
  },
  {
    id: 'almonitor',
    name: 'Al-Monitor',
    country: 'US',
    region: 'nahost',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:al-monitor.com+when:1d&hl=en&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'jordantimes',
    name: 'The Jordan Times',
    country: 'JO',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:jordantimes.com+when:1d&hl=en&gl=JO&ceid=JO:en',
    rateLimit: 100
  },
  {
    id: 'lebnews-eng',
    name: 'The Daily Star Lebanon (revived edition)',
    country: 'LB',
    region: 'nahost',
    language: 'en',
    bias: { political: -0.1, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:dailystar.com.lb+when:1d&hl=en&gl=LB&ceid=LB:en',
    rateLimit: 100
  },
  {
    id: 'arabian-business',
    name: 'Arabian Business',
    country: 'AE',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.arabianbusiness.com/feed',
    rateLimit: 100
  },
  {
    id: 'irna',
    name: 'IRNA',
    country: 'IR',
    region: 'nahost',
    language: 'en',
    bias: { political: 0.3, reliability: 5, ownership: 'state' },
    apiEndpoint: 'https://en.irna.ir/rss',
    rateLimit: 100
  },

  // ===== TÜRKEI (10 sources) =====
  {
    id: 'trt',
    name: 'TRT World',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0.3, reliability: 6, ownership: 'state' },
    apiEndpoint: 'https://www.trtworld.com/rss/news.xml',
    rateLimit: 100
  },
  {
    id: 'dailysabah',
    name: 'Daily Sabah',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0.5, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://www.dailysabah.com/rssFeed/todays_news',
    rateLimit: 100
  },
  {
    id: 'hurriyet',
    name: 'Hurriyet Daily News',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.hurriyetdailynews.com/rss',
    rateLimit: 100
  },
  {
    id: 'aa',
    name: 'Anadolu Agency',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0.4, reliability: 6, ownership: 'state' },
    apiEndpoint: 'https://www.aa.com.tr/en/rss/default?cat=world',
    rateLimit: 100
  },
  {
    id: 'duvarenglish',
    name: 'Duvar English',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: -0.3, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'bianet',
    name: 'Bianet English',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: -0.4, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'turkishminute',
    name: 'Turkish Minute',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: -0.5, reliability: 5, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'ahval',
    name: 'Ahval News',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: -0.3, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'balkaninsight-turkey',
    name: 'Balkan Insight Turkey',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'turkishpress',
    name: 'Turkish Press',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources
  {
    id: 'evrenselgazetesi',
    name: 'Evrensel',
    country: 'TR',
    region: 'tuerkei',
    language: 'tr',
    bias: { political: -0.5, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:evrensel.net+when:1d&hl=tr&gl=TR&ceid=TR:tr',
    rateLimit: 100
  },
  {
    id: 't24-eng',
    name: 'T24',
    country: 'TR',
    region: 'tuerkei',
    language: 'tr',
    bias: { political: -0.2, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:t24.com.tr+when:1d&hl=tr&gl=TR&ceid=TR:tr',
    rateLimit: 100
  },
  {
    id: 'milliyetenglish',
    name: 'Milliyet (English coverage)',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:milliyet.com.tr+english+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'sabahdaily',
    name: 'Daily Sabah (sister Sabah feed)',
    country: 'TR',
    region: 'tuerkei',
    language: 'tr',
    bias: { political: 0.3, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:sabah.com.tr+when:1d&hl=tr&gl=TR&ceid=TR:tr',
    rateLimit: 100
  },
  {
    id: 'trtworld',
    name: 'TRT World',
    country: 'TR',
    region: 'tuerkei',
    language: 'en',
    bias: { political: 0.2, reliability: 5, ownership: 'state' },
    apiEndpoint: 'https://www.trtworld.com/rss',
    rateLimit: 100
  },

  // ===== RUSSLAND (10 sources) =====
  {
    id: 'tass',
    name: 'TASS',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    apiEndpoint: 'https://tass.com/rss/v2.xml',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'rt',
    name: 'RT',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.6, reliability: 3, ownership: 'state' },
    apiEndpoint: 'https://www.rt.com/rss/news/',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'sputnik',
    name: 'Sputnik',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.6, reliability: 3, ownership: 'state' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'interfax',
    name: 'Interfax',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.4, reliability: 5, ownership: 'private' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'moscowtimes',
    name: 'The Moscow Times',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: -0.3, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.themoscowtimes.com/rss/news',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'meduza',
    name: 'Meduza',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: -0.4, reliability: 7, ownership: 'private' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'novayagazeta',
    name: 'Novaya Gazeta Europe',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'rbc',
    name: 'RBC News',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'kommersant',
    name: 'Kommersant English',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'private' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'russiabeyond',
    name: 'Russia Beyond',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.4, reliability: 5, ownership: 'state' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  // Phase 40 (40-02): +5 deepening sources, all flagged biasDiversityNote: 'limited' (D-A3 exception)
  {
    id: 'themoscowtimes-eu',
    name: 'The Moscow Times Europe',
    country: 'LV',
    region: 'russland',
    language: 'en',
    bias: { political: -0.4, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:themoscowtimes.com+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },
  {
    id: 'regnum',
    name: 'Regnum News Agency',
    country: 'RU',
    region: 'russland',
    language: 'ru',
    bias: { political: 0.5, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:regnum.ru+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },
  {
    id: 'gazeta-ru',
    name: 'Gazeta.ru',
    country: 'RU',
    region: 'russland',
    language: 'ru',
    bias: { political: 0.4, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:gazeta.ru+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },
  {
    id: 'vedomosti',
    name: 'Vedomosti',
    country: 'RU',
    region: 'russland',
    language: 'ru',
    bias: { political: 0.3, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:vedomosti.ru+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },
  {
    id: 'izvestia',
    name: 'Izvestia',
    country: 'RU',
    region: 'russland',
    language: 'ru',
    bias: { political: 0.5, reliability: 5, ownership: 'state' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:iz.ru+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },

  // ===== CHINA (10 sources) =====
  {
    id: 'xinhua',
    name: 'Xinhua',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 4, ownership: 'state' },
    apiEndpoint: 'http://www.news.cn/english/rss/worldrss.xml',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'globaltimes',
    name: 'Global Times',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    apiEndpoint: 'https://www.globaltimes.cn/rss/outbrain.xml',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'cgtn',
    name: 'CGTN',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 4, ownership: 'state' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'scmp',
    name: 'South China Morning Post',
    country: 'HK',
    region: 'china',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.scmp.com/rss/91/feed',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'chinadaily',
    name: 'China Daily',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    apiEndpoint: 'http://www.chinadaily.com.cn/rss/world_rss.xml',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'peopledaily',
    name: "People's Daily",
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'chinaorg',
    name: 'China.org.cn',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 4, ownership: 'state' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'sixthtone',
    name: 'Sixth Tone',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'state' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'caixin',
    name: 'Caixin Global',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  {
    id: 'shanghaidaily',
    name: 'Shanghai Daily',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 5, ownership: 'state' },
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception: state-dominated press
  },
  // Phase 40 (40-02): +5 deepening sources, all flagged biasDiversityNote: 'limited' (D-A3 exception)
  {
    id: 'chinanews',
    name: 'China News Service',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 5, ownership: 'state' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:ecns.cn+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },
  {
    id: 'taipeitimes',
    name: 'Taipei Times',
    country: 'TW',
    region: 'china',
    language: 'en',
    bias: { political: 0.0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:taipeitimes.com+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception (state-dominated cross-strait coverage)
  },
  {
    id: 'focus-taiwan',
    name: 'Focus Taiwan (CNA English)',
    country: 'TW',
    region: 'china',
    language: 'en',
    bias: { political: 0.0, reliability: 7, ownership: 'state' },
    apiEndpoint: 'https://focustaiwan.tw/rss/aALL.xml',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },
  {
    id: 'taiwannews',
    name: 'Taiwan News',
    country: 'TW',
    region: 'china',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.taiwannews.com.tw/feed',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception
  },
  {
    id: 'hkfp',
    name: 'Hong Kong Free Press',
    country: 'HK',
    region: 'china',
    language: 'en',
    bias: { political: -0.4, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://hongkongfp.com/feed/',
    rateLimit: 100,
    biasDiversityNote: 'limited' // D-A3 honest exception (Hong Kong civil-society perspective)
  },

  // ===== ASIEN (10 sources) =====
  {
    id: 'nhk',
    name: 'NHK World',
    country: 'JP',
    region: 'asien',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://www3.nhk.or.jp/nhkworld/en/rss.xml',
    rateLimit: 100
  },
  {
    id: 'japantimes',
    name: 'Japan Times',
    country: 'JP',
    region: 'asien',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.japantimes.co.jp/feed/',
    rateLimit: 100
  },
  {
    id: 'asahi',
    name: 'Asahi Shimbun',
    country: 'JP',
    region: 'asien',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.asahi.com/rss/asahi/newsheadlines.rdf',
    rateLimit: 100
  },
  {
    id: 'timesofindia',
    name: 'Times of India',
    country: 'IN',
    region: 'asien',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    rateLimit: 100
  },
  {
    id: 'thehindu',
    name: 'The Hindu',
    country: 'IN',
    region: 'asien',
    language: 'en',
    bias: { political: -0.2, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.thehindu.com/news/international/feeder/default.rss',
    rateLimit: 100
  },
  {
    id: 'ndtv',
    name: 'NDTV',
    country: 'IN',
    region: 'asien',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://feeds.feedburner.com/ndtvnews-world-news',
    rateLimit: 100
  },
  {
    id: 'dawn',
    name: 'Dawn',
    country: 'PK',
    region: 'asien',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.dawn.com/feeds/home',
    rateLimit: 100
  },
  {
    id: 'straitstimes',
    name: 'Straits Times',
    country: 'SG',
    region: 'asien',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'bangkokpost',
    name: 'Bangkok Post',
    country: 'TH',
    region: 'asien',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'koreatimes',
    name: 'Korea Times',
    country: 'KR',
    region: 'asien',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources
  {
    id: 'hankyoreh',
    name: 'The Hankyoreh',
    country: 'KR',
    region: 'asien',
    language: 'en',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://english.hani.co.kr/arti/RSS/',
    rateLimit: 100
  },
  {
    id: 'japan-forward',
    name: 'Japan Forward',
    country: 'JP',
    region: 'asien',
    language: 'en',
    bias: { political: 0.5, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://japan-forward.com/feed/',
    rateLimit: 100
  },
  {
    id: 'the-mainichi',
    name: 'The Mainichi (English)',
    country: 'JP',
    region: 'asien',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://mainichi.jp/rss/etc/mainichi-flash.rss',
    rateLimit: 100
  },
  {
    id: 'kyodonews',
    name: 'Kyodo News (English)',
    country: 'JP',
    region: 'asien',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://english.kyodonews.net/rss/news.xml',
    rateLimit: 100
  },
  {
    id: 'koreaherald',
    name: 'The Korea Herald',
    country: 'KR',
    region: 'asien',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:koreaherald.com+when:1d&hl=en&gl=KR&ceid=KR:en',
    rateLimit: 100
  },

  // ===== AFRIKA (10 sources) =====
  {
    id: 'dailymaverick',
    name: 'Daily Maverick',
    country: 'ZA',
    region: 'afrika',
    language: 'en',
    bias: { political: -0.2, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.dailymaverick.co.za/dmrss/',
    rateLimit: 100
  },
  {
    id: 'news24',
    name: 'News24',
    country: 'ZA',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://feeds.24.com/articles/news24/TopStories/rss',
    rateLimit: 100
  },
  {
    id: 'eastafrican',
    name: 'The East African',
    country: 'KE',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.theeastafrican.co.ke/tea/rss',
    rateLimit: 100
  },
  {
    id: 'premiumtimes',
    name: 'Premium Times',
    country: 'NG',
    region: 'afrika',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.premiumtimesng.com/feed',
    rateLimit: 100
  },
  {
    id: 'ana',
    name: 'African News Agency',
    country: 'ZA',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'allafrica',
    name: 'AllAfrica',
    country: 'Multi',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',
    rateLimit: 100
  },
  {
    id: 'citizen',
    name: 'The Citizen',
    country: 'ZA',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'nation',
    name: 'The Nation',
    country: 'KE',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'africanews',
    name: 'Africanews',
    country: 'Multi',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'standard',
    name: 'The Standard',
    country: 'KE',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources + 1 wire (panapress)
  {
    id: 'pambazuka',
    name: 'Pambazuka News',
    country: 'KE',
    region: 'afrika',
    language: 'en',
    bias: { political: -0.5, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.pambazuka.org/rss.xml',
    rateLimit: 100
  },
  {
    id: 'businessday-ng',
    name: 'BusinessDay Nigeria',
    country: 'NG',
    region: 'afrika',
    language: 'en',
    bias: { political: 0.4, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://businessday.ng/feed/',
    rateLimit: 100
  },
  {
    id: 'cairoreview',
    name: 'Cairo Review of Global Affairs',
    country: 'EG',
    region: 'afrika',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.thecairoreview.com/feed/',
    rateLimit: 100
  },
  {
    id: 'peoplesdailyng',
    name: 'Peoples Daily Nigeria',
    country: 'NG',
    region: 'afrika',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:peoplesdailyng.com+when:1d&hl=en&gl=NG&ceid=NG:en',
    rateLimit: 100
  },
  {
    id: 'journalducameroun',
    name: 'Journal du Cameroun',
    country: 'CM',
    region: 'afrika',
    language: 'fr',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:journalducameroun.com+when:1d&hl=fr&gl=CM&ceid=CM:fr',
    rateLimit: 100
  },
  {
    id: 'panapress',
    name: 'Pan African News Agency',
    country: 'SN',
    region: 'afrika',
    language: 'en',
    bias: { political: 0, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:panapress.com+when:1d&hl=en&gl=US&ceid=US:en',
    rateLimit: 100
  },

  // ===== LATEINAMERIKA (10 sources) =====
  {
    id: 'univision',
    name: 'Univision News',
    country: 'US',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: -0.1, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'telesur',
    name: 'teleSUR English',
    country: 'VE',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: -0.5, reliability: 5, ownership: 'state' },
    rateLimit: 100
  },
  {
    id: 'brazilenglish',
    name: 'The Brazilian Report',
    country: 'BR',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'buenosairestimes',
    name: 'Buenos Aires Times',
    country: 'AR',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'mexiconewsdaily',
    name: 'Mexico News Daily',
    country: 'MX',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'costaricastar',
    name: 'The Tico Times',
    country: 'CR',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'colombia reports',
    name: 'Colombia Reports',
    country: 'CO',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: -0.1, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'perunews',
    name: 'Peru Reports',
    country: 'PE',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'chilean',
    name: 'The Santiago Times',
    country: 'CL',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'latinamerican post',
    name: 'Latin American Post',
    country: 'Multi',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources + 1 wire (prensa-latina)
  {
    id: 'pagina12',
    name: 'Página/12',
    country: 'AR',
    region: 'lateinamerika',
    language: 'es',
    bias: { political: -0.5, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.pagina12.com.ar/rss/portada',
    rateLimit: 100
  },
  {
    id: 'infobae',
    name: 'Infobae',
    country: 'AR',
    region: 'lateinamerika',
    language: 'es',
    bias: { political: 0.4, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.infobae.com/feeds/rss/',
    rateLimit: 100
  },
  {
    id: 'folha-sao-paulo',
    name: 'Folha de São Paulo',
    country: 'BR',
    region: 'lateinamerika',
    language: 'pt',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:folha.uol.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt',
    rateLimit: 100
  },
  {
    id: 'eluniversal-mx',
    name: 'El Universal (Mexico)',
    country: 'MX',
    region: 'lateinamerika',
    language: 'es',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.eluniversal.com.mx/rss.xml',
    rateLimit: 100
  },
  {
    id: 'riotimes',
    name: 'The Rio Times',
    country: 'BR',
    region: 'lateinamerika',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.riotimesonline.com/feed/',
    rateLimit: 100
  },
  {
    id: 'prensa-latina',
    name: 'Prensa Latina',
    country: 'CU',
    region: 'lateinamerika',
    language: 'es',
    bias: { political: -0.4, reliability: 5, ownership: 'state' },
    apiEndpoint: 'https://www.prensa-latina.cu/feed/',
    rateLimit: 100
  },

  // ===== OZEANIEN (10 sources) =====
  {
    id: 'abc-aus',
    name: 'ABC News Australia',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'public' },
    rateLimit: 100
  },
  {
    id: 'guardian-aus',
    name: 'The Guardian Australia',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: -0.3, reliability: 8, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'smh',
    name: 'Sydney Morning Herald',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'theage',
    name: 'The Age',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'australian',
    name: 'The Australian',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0.4, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'nzherald',
    name: 'NZ Herald',
    country: 'NZ',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'stuff',
    name: 'Stuff.co.nz',
    country: 'NZ',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'rnz',
    name: 'Radio New Zealand',
    country: 'NZ',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'public' },
    rateLimit: 100
  },
  {
    id: 'pacificguardian',
    name: 'Pacific Guardian',
    country: 'FJ',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'fiji-times',
    name: 'Fiji Times',
    country: 'FJ',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources
  {
    id: 'crikey',
    name: 'Crikey',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.crikey.com.au/feed/',
    rateLimit: 100
  },
  {
    id: 'skynews-au',
    name: 'Sky News Australia',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0.5, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:skynews.com.au+when:1d&hl=en-AU&gl=AU&ceid=AU:en',
    rateLimit: 100
  },
  {
    id: 'pacificjournalism',
    name: 'Asia Pacific Report',
    country: 'NZ',
    region: 'ozeanien',
    language: 'en',
    bias: { political: -0.3, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://asiapacificreport.nz/feed/',
    rateLimit: 100
  },
  {
    id: 'conversation-au',
    name: 'The Conversation (AU)',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://theconversation.com/au/articles.atom',
    rateLimit: 100
  },
  {
    id: 'sbs-news-au',
    name: 'SBS News (Australia)',
    country: 'AU',
    region: 'ozeanien',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'public' },
    apiEndpoint: 'https://www.sbs.com.au/news/feed',
    rateLimit: 100
  },

  // ===== KANADA (10 sources) =====
  {
    id: 'cbc',
    name: 'CBC News',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'public' },
    rateLimit: 100
  },
  {
    id: 'globeandmail',
    name: 'Globe and Mail',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0.1, reliability: 8, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'nationalpost',
    name: 'National Post',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0.3, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'torontostar',
    name: 'Toronto Star',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: -0.2, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'ctv',
    name: 'CTV News',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'thestar',
    name: 'The Star',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: -0.2, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'montrealgazette',
    name: 'Montreal Gazette',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'vancouversun',
    name: 'Vancouver Sun',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'theprovince',
    name: 'The Province',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'cp24',
    name: 'CP24',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources + 1 wire (reuters-canada)
  {
    id: 'thetyee',
    name: 'The Tyee',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://thetyee.ca/rss/',
    rateLimit: 100
  },
  {
    id: 'thecanadiandimension',
    name: 'Canadian Dimension',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: -0.6, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://canadiandimension.com/articles.rss',
    rateLimit: 100
  },
  {
    id: 'therebel',
    name: 'Rebel News',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0.7, reliability: 4, ownership: 'private' },
    apiEndpoint: 'https://www.rebelnews.com/feeds/syndication/all_feeds.rss',
    rateLimit: 100
  },
  {
    id: 'lapresse-ca',
    name: 'La Presse',
    country: 'CA',
    region: 'kanada',
    language: 'fr',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.lapresse.ca/actualites/rss',
    rateLimit: 100
  },
  {
    id: 'maclean-magazine',
    name: "Maclean's",
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.macleans.ca/feed/',
    rateLimit: 100
  },
  {
    id: 'reuters-canada',
    name: 'Reuters Canada',
    country: 'CA',
    region: 'kanada',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=source:Reuters+canada+when:1d&hl=en-CA&gl=CA&ceid=CA:en',
    rateLimit: 100
  },

  // ===== ALTERNATIVE MEDIA (10 sources) =====
  {
    id: 'intercept',
    name: 'The Intercept',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://theintercept.com/feed/?rss',
    rateLimit: 50
  },
  {
    id: 'middleeastmonitor',
    name: 'Middle East Monitor',
    country: 'UK',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.2, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.middleeastmonitor.com/feed/',
    rateLimit: 100
  },
  {
    id: 'electronicintifada',
    name: 'Electronic Intifada',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.6, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://electronicintifada.net/rss.xml',
    rateLimit: 50
  },
  {
    id: 'democracynow',
    name: 'Democracy Now!',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.5, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.democracynow.org/democracynow.rss',
    rateLimit: 100
  },
  {
    id: 'commondreams',
    name: 'Common Dreams',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.6, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.commondreams.org/feeds/feed.rss',
    rateLimit: 100
  },
  {
    id: 'counterpunch',
    name: 'CounterPunch',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.6, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.counterpunch.org/feed/',
    rateLimit: 100
  },
  {
    id: 'consortiumnews',
    name: 'Consortium News',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.5, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'mintpress',
    name: 'MintPress News',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.5, reliability: 5, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'grayzone',
    name: 'The Grayzone',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.5, reliability: 5, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'mondoweiss',
    name: 'Mondoweiss',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.5, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  // Phase 40 (40-02): +5 deepening sources
  {
    id: 'zerohedge',
    name: 'Zero Hedge',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: 0.6, reliability: 4, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:zerohedge.com+when:1d&hl=en-US&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'truthout',
    name: 'Truthout',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.7, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://truthout.org/feed/',
    rateLimit: 100
  },
  {
    id: 'the-canary',
    name: 'The Canary',
    country: 'UK',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.7, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://www.thecanary.co/feed/',
    rateLimit: 100
  },
  {
    id: 'antiwar-com',
    name: 'Antiwar.com',
    country: 'US',
    region: 'alternative',
    language: 'en',
    bias: { political: -0.5, reliability: 5, ownership: 'private' },
    apiEndpoint: 'https://www.antiwar.com/rss.php',
    rateLimit: 100
  },
  {
    id: 'bellingcat',
    name: 'Bellingcat',
    country: 'NL',
    region: 'alternative',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.bellingcat.com/feed/',
    rateLimit: 100
  },

  // ===== SUDOSTASIEN (6 sources) — NEW per Phase 40 D-A2 =====
  {
    id: 'jakartapost',
    name: 'The Jakarta Post',
    country: 'ID',
    region: 'sudostasien',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:thejakartapost.com+when:1d&hl=en-ID&gl=ID&ceid=ID:en',
    rateLimit: 100
  },
  {
    id: 'inquirer',
    name: 'Inquirer.net',
    country: 'PH',
    region: 'sudostasien',
    language: 'en',
    bias: { political: -0.4, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.inquirer.net/fullfeed',
    rateLimit: 100
  },
  {
    id: 'vnexpress',
    name: 'VnExpress International',
    country: 'VN',
    region: 'sudostasien',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'state' },
    apiEndpoint: 'https://e.vnexpress.net/rss/news.rss',
    rateLimit: 100
  },
  {
    id: 'bangkokpost-se',
    name: 'Bangkok Post',
    country: 'TH',
    region: 'sudostasien',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.bangkokpost.com/rss/data/topstories.xml',
    rateLimit: 100
  },
  {
    id: 'channelnewsasia',
    name: 'Channel News Asia',
    country: 'SG',
    region: 'sudostasien',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'state' },
    apiEndpoint: 'https://www.channelnewsasia.com/rssfeeds/8395986',
    rateLimit: 100
  },
  {
    id: 'nikkei-asia',
    name: 'Nikkei Asia',
    country: 'SG',
    region: 'sudostasien',
    language: 'en',
    bias: { political: 0.4, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:asia.nikkei.com+when:1d&hl=en-SG&gl=SG&ceid=SG:en',
    rateLimit: 100
  },

  // ===== NORDEUROPA (6 sources) — NEW per Phase 40 D-A2 =====
  {
    id: 'yle-news',
    name: 'Yle News',
    country: 'FI',
    region: 'nordeuropa',
    language: 'en',
    bias: { political: 0, reliability: 9, ownership: 'public' },
    apiEndpoint: 'https://yle.fi/uutiset/rss/uutiset.rss?osasto=news',
    rateLimit: 100
  },
  {
    id: 'dr-dk',
    name: 'DR Nyheder',
    country: 'DK',
    region: 'nordeuropa',
    language: 'da',
    bias: { political: 0, reliability: 9, ownership: 'public' },
    apiEndpoint: 'https://www.dr.dk/nyheder/service/feeds/allenyheder',
    rateLimit: 100
  },
  {
    id: 'politiken',
    name: 'Politiken',
    country: 'DK',
    region: 'nordeuropa',
    language: 'da',
    bias: { political: -0.4, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://politiken.dk/rss/senestenyt.rss',
    rateLimit: 100
  },
  {
    id: 'nrk',
    name: 'NRK',
    country: 'NO',
    region: 'nordeuropa',
    language: 'nb',
    bias: { political: 0, reliability: 9, ownership: 'public' },
    apiEndpoint: 'https://www.nrk.no/toppsaker.rss',
    rateLimit: 100
  },
  {
    id: 'nettavisen',
    name: 'Nettavisen',
    country: 'NO',
    region: 'nordeuropa',
    language: 'nb',
    bias: { political: 0.4, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.nettavisen.no/rss',
    rateLimit: 100
  },
  {
    id: 'svtnyheter',
    name: 'SVT Nyheter',
    country: 'SE',
    region: 'nordeuropa',
    language: 'sv',
    bias: { political: 0, reliability: 9, ownership: 'public' },
    apiEndpoint: 'https://www.svt.se/nyheter/rss.xml',
    rateLimit: 100
  },

  // ===== SUB-SAHARAN-AFRICA (8 sources) — NEW per Phase 40 D-A2 (6 deepen + 2 wires/think-tanks) =====
  {
    id: 'dailynation',
    name: 'Daily Nation',
    country: 'KE',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://nation.africa/kenya/rss.xml',
    rateLimit: 100
  },
  {
    id: 'punchng',
    name: 'The Punch',
    country: 'NG',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://punchng.com/feed/',
    rateLimit: 100
  },
  {
    id: 'mg-co-za',
    name: 'Mail & Guardian',
    country: 'ZA',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: -0.5, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://mg.co.za/feed/',
    rateLimit: 100
  },
  {
    id: 'addisstandard',
    name: 'Addis Standard',
    country: 'ET',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://addisstandard.com/feed/',
    rateLimit: 100
  },
  {
    id: 'ghanaweb',
    name: 'GhanaWeb',
    country: 'GH',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.ghanaweb.com/GhanaHomePage/rss/news.xml',
    rateLimit: 100
  },
  {
    id: 'businesslive-za',
    name: 'BusinessLIVE (Business Day SA)',
    country: 'ZA',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: 0.4, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://www.businesslive.co.za/bd/rss/',
    rateLimit: 100
  },
  {
    id: 'apa-news',
    name: 'APA News',
    country: 'SN',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://news.google.com/rss/search?q=site:apanews.net+when:1d&hl=en&gl=US&ceid=US:en',
    rateLimit: 100
  },
  {
    id: 'iss-africa',
    name: 'ISS Africa',
    country: 'ZA',
    region: 'sub-saharan-africa',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://issafrica.org/rss/ISS_Today_RSS.xml',
    rateLimit: 100
  },

  // ===== INDIEN (7 sources) — NEW per Phase 40 D-A2 (6 deepen + 1 think-tank wire) =====
  {
    id: 'indianexpress',
    name: 'The Indian Express',
    country: 'IN',
    region: 'indien',
    language: 'en',
    bias: { political: -0.1, reliability: 8, ownership: 'private' },
    apiEndpoint: 'https://indianexpress.com/feed/',
    rateLimit: 100
  },
  {
    id: 'hindustantimes',
    name: 'Hindustan Times',
    country: 'IN',
    region: 'indien',
    language: 'en',
    bias: { political: 0, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
    rateLimit: 100
  },
  {
    id: 'thewireindia',
    name: 'The Wire (India)',
    country: 'IN',
    region: 'indien',
    language: 'en',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://thewire.in/rss',
    rateLimit: 100
  },
  {
    id: 'opindia',
    name: 'OpIndia',
    country: 'IN',
    region: 'indien',
    language: 'en',
    bias: { political: 0.6, reliability: 4, ownership: 'private' },
    apiEndpoint: 'https://www.opindia.com/feed/',
    rateLimit: 100
  },
  {
    id: 'dailystar-bd',
    name: 'The Daily Star',
    country: 'BD',
    region: 'indien',
    language: 'en',
    bias: { political: -0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.thedailystar.net/frontpage/rss.xml',
    rateLimit: 100
  },
  {
    id: 'dailymirror-lk',
    name: 'Daily Mirror',
    country: 'LK',
    region: 'indien',
    language: 'en',
    bias: { political: 0, reliability: 6, ownership: 'private' },
    apiEndpoint: 'https://www.dailymirror.lk/rss',
    rateLimit: 100
  },
  {
    id: 'orfonline',
    name: 'Observer Research Foundation',
    country: 'IN',
    region: 'indien',
    language: 'en',
    bias: { political: 0.2, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.orfonline.org/feed/',
    rateLimit: 100
  },
];

export const getSourceById = (id: string): NewsSource | undefined => {
  return NEWS_SOURCES.find((s) => s.id === id);
};

export const getSourcesByRegion = (region: string): NewsSource[] => {
  return NEWS_SOURCES.filter((s) => s.region === region);
};

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
};
