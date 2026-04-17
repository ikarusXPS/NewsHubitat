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

  // ===== RUSSLAND (10 sources) =====
  {
    id: 'tass',
    name: 'TASS',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    apiEndpoint: 'https://tass.com/rss/v2.xml',
    rateLimit: 100
  },
  {
    id: 'rt',
    name: 'RT',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.6, reliability: 3, ownership: 'state' },
    apiEndpoint: 'https://www.rt.com/rss/news/',
    rateLimit: 100
  },
  {
    id: 'sputnik',
    name: 'Sputnik',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.6, reliability: 3, ownership: 'state' },
    rateLimit: 100
  },
  {
    id: 'interfax',
    name: 'Interfax',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.4, reliability: 5, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'moscowtimes',
    name: 'The Moscow Times',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: -0.3, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.themoscowtimes.com/rss/news',
    rateLimit: 100
  },
  {
    id: 'meduza',
    name: 'Meduza',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: -0.4, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'novayagazeta',
    name: 'Novaya Gazeta Europe',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: -0.5, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'rbc',
    name: 'RBC News',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.1, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'kommersant',
    name: 'Kommersant English',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'russiabeyond',
    name: 'Russia Beyond',
    country: 'RU',
    region: 'russland',
    language: 'en',
    bias: { political: 0.4, reliability: 5, ownership: 'state' },
    rateLimit: 100
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
    rateLimit: 100
  },
  {
    id: 'globaltimes',
    name: 'Global Times',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    apiEndpoint: 'https://www.globaltimes.cn/rss/outbrain.xml',
    rateLimit: 100
  },
  {
    id: 'cgtn',
    name: 'CGTN',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 4, ownership: 'state' },
    rateLimit: 100
  },
  {
    id: 'scmp',
    name: 'South China Morning Post',
    country: 'HK',
    region: 'china',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    apiEndpoint: 'https://www.scmp.com/rss/91/feed',
    rateLimit: 100
  },
  {
    id: 'chinadaily',
    name: 'China Daily',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    apiEndpoint: 'http://www.chinadaily.com.cn/rss/world_rss.xml',
    rateLimit: 100
  },
  {
    id: 'peopledaily',
    name: "People's Daily",
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.5, reliability: 4, ownership: 'state' },
    rateLimit: 100
  },
  {
    id: 'chinaorg',
    name: 'China.org.cn',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 4, ownership: 'state' },
    rateLimit: 100
  },
  {
    id: 'sixthtone',
    name: 'Sixth Tone',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.2, reliability: 6, ownership: 'state' },
    rateLimit: 100
  },
  {
    id: 'caixin',
    name: 'Caixin Global',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.1, reliability: 7, ownership: 'private' },
    rateLimit: 100
  },
  {
    id: 'shanghaidaily',
    name: 'Shanghai Daily',
    country: 'CN',
    region: 'china',
    language: 'en',
    bias: { political: 0.4, reliability: 5, ownership: 'state' },
    rateLimit: 100
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
