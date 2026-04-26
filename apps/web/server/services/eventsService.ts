import type { NewsArticle, TimelineEvent } from '../../src/types';

type EventCategory = 'military' | 'diplomacy' | 'humanitarian' | 'protest' | 'other';

interface EventExtraction {
  keywords: string[];
  category: EventCategory;
  severityBoost: number;
}

const EVENT_PATTERNS: EventExtraction[] = [
  {
    keywords: ['strike', 'attack', 'bombing', 'raid', 'offensive', 'invasion', 'missile', 'rocket', 'drone', 'airstrike', 'shelling', 'combat', 'battle', 'assault'],
    category: 'military',
    severityBoost: 2,
  },
  {
    keywords: ['ceasefire', 'negotiation', 'talks', 'summit', 'agreement', 'resolution', 'diplomat', 'peace', 'treaty', 'meeting', 'dialogue'],
    category: 'diplomacy',
    severityBoost: 1,
  },
  {
    keywords: ['aid', 'humanitarian', 'refugee', 'evacuation', 'hospital', 'relief', 'rescue', 'shelter', 'medical', 'supplies', 'food', 'water'],
    category: 'humanitarian',
    severityBoost: 1,
  },
  {
    keywords: ['protest', 'demonstration', 'march', 'rally', 'solidarity', 'unrest', 'riot'],
    category: 'protest',
    severityBoost: 0,
  },
];

// Location extraction patterns - Expanded for better coverage
const LOCATION_PATTERNS: Array<{ pattern: RegExp; lat: number; lng: number; name: string }> = [
  // Gaza Strip
  { pattern: /\bgaza\b/i, lat: 31.5, lng: 34.47, name: 'Gaza' },
  { pattern: /\brafah\b/i, lat: 31.2765, lng: 34.2458, name: 'Rafah' },
  { pattern: /\bkhan younis\b/i, lat: 31.3444, lng: 34.3027, name: 'Khan Younis' },
  { pattern: /\bjabalya\b/i, lat: 31.5314, lng: 34.4830, name: 'Jabalya' },
  { pattern: /\bdeir al-balah\b/i, lat: 31.4181, lng: 34.3518, name: 'Deir al-Balah' },

  // Israel
  { pattern: /\bjerusalem\b/i, lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  { pattern: /\btel aviv\b/i, lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  { pattern: /\bhaifa\b/i, lat: 32.7940, lng: 34.9896, name: 'Haifa' },
  { pattern: /\bashkelon\b/i, lat: 31.6690, lng: 34.5663, name: 'Ashkelon' },
  { pattern: /\bashdod\b/i, lat: 31.8044, lng: 34.6553, name: 'Ashdod' },
  { pattern: /\bbeer sheba\b/i, lat: 31.2518, lng: 34.7913, name: 'Beer Sheba' },
  { pattern: /\bnetanya\b/i, lat: 32.3215, lng: 34.8532, name: 'Netanya' },

  // West Bank
  { pattern: /\bwest bank\b/i, lat: 31.9522, lng: 35.2332, name: 'West Bank' },
  { pattern: /\bramallah\b/i, lat: 31.9038, lng: 35.2034, name: 'Ramallah' },
  { pattern: /\bhebron\b/i, lat: 31.5326, lng: 35.0998, name: 'Hebron' },
  { pattern: /\bnablus\b/i, lat: 32.2211, lng: 35.2544, name: 'Nablus' },
  { pattern: /\bjenin\b/i, lat: 32.4600, lng: 35.3000, name: 'Jenin' },
  { pattern: /\bbethlehem\b/i, lat: 31.7054, lng: 35.2024, name: 'Bethlehem' },

  // Lebanon
  { pattern: /\bbeirut\b/i, lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  { pattern: /\btripoli\b/i, lat: 34.4367, lng: 35.8497, name: 'Tripoli' },
  { pattern: /\bsidon\b/i, lat: 33.5593, lng: 35.3689, name: 'Sidon' },
  { pattern: /\btyre\b/i, lat: 33.2704, lng: 35.1943, name: 'Tyre' },
  { pattern: /\bsouth lebanon\b/i, lat: 33.2, lng: 35.3, name: 'South Lebanon' },

  // Syria
  { pattern: /\bdamascus\b/i, lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  { pattern: /\baleppo\b/i, lat: 36.2021, lng: 37.1343, name: 'Aleppo' },
  { pattern: /\bhoms\b/i, lat: 34.7325, lng: 36.7092, name: 'Homs' },
  { pattern: /\blatakia\b/i, lat: 35.5311, lng: 35.7911, name: 'Latakia' },
  { pattern: /\bidlib\b/i, lat: 35.9283, lng: 36.6334, name: 'Idlib' },

  // Egypt
  { pattern: /\bcairo\b/i, lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  { pattern: /\balexandria\b/i, lat: 31.2001, lng: 29.9187, name: 'Alexandria' },
  { pattern: /\bsinai\b/i, lat: 29.5, lng: 34.0, name: 'Sinai' },

  // Jordan
  { pattern: /\bamman\b/i, lat: 31.9454, lng: 35.9284, name: 'Amman' },

  // Qatar
  { pattern: /\bdoha\b/i, lat: 25.2854, lng: 51.5310, name: 'Doha' },

  // Iran
  { pattern: /\bteheran\b/i, lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  { pattern: /\btehran\b/i, lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  { pattern: /\bisrahan\b/i, lat: 32.6546, lng: 51.6680, name: 'Isfahan' },

  // Turkey
  { pattern: /\bankara\b/i, lat: 39.9334, lng: 32.8597, name: 'Ankara' },
  { pattern: /\bistanbul\b/i, lat: 41.0082, lng: 28.9784, name: 'Istanbul' },

  // Iraq
  { pattern: /\bbaghdad\b/i, lat: 33.3152, lng: 44.3661, name: 'Baghdad' },
  { pattern: /\bbasra\b/i, lat: 30.5085, lng: 47.7835, name: 'Basra' },
  { pattern: /\berbil\b/i, lat: 36.1911, lng: 44.0094, name: 'Erbil' },

  // Saudi Arabia
  { pattern: /\briyadh\b/i, lat: 24.7136, lng: 46.6753, name: 'Riyadh' },
  { pattern: /\bjeddah\b/i, lat: 21.5433, lng: 39.1728, name: 'Jeddah' },
  { pattern: /\bmecca\b/i, lat: 21.3891, lng: 39.8579, name: 'Mecca' },

  // Yemen
  { pattern: /\bsana'?a\b/i, lat: 15.3694, lng: 44.1910, name: 'Sanaa' },
  { pattern: /\baden\b/i, lat: 12.8654, lng: 45.0367, name: 'Aden' },

  // UAE
  { pattern: /\bdubai\b/i, lat: 25.2048, lng: 55.2708, name: 'Dubai' },
  { pattern: /\babu dhabi\b/i, lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi' },

  // International (Major Capitals)
  { pattern: /\bwashington\b/i, lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  { pattern: /\bnew york\b/i, lat: 40.7128, lng: -74.0060, name: 'New York' },
  { pattern: /\blondon\b/i, lat: 51.5074, lng: -0.1278, name: 'London' },
  { pattern: /\bparis\b/i, lat: 48.8566, lng: 2.3522, name: 'Paris' },
  { pattern: /\bberlin\b/i, lat: 52.5200, lng: 13.4050, name: 'Berlin' },
  { pattern: /\bmoscow\b/i, lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  { pattern: /\bbeijing\b/i, lat: 39.9042, lng: 116.4074, name: 'Beijing' },

  // === EUROPE (expanded) ===
  // Western Europe
  { pattern: /\bbrussels?\b/i, lat: 50.8503, lng: 4.3517, name: 'Brussels' },
  { pattern: /\bamsterdam\b/i, lat: 52.3676, lng: 4.9041, name: 'Amsterdam' },
  { pattern: /\bvienna\b/i, lat: 48.2082, lng: 16.3738, name: 'Vienna' },
  { pattern: /\bwien\b/i, lat: 48.2082, lng: 16.3738, name: 'Vienna' },
  { pattern: /\bzurich\b/i, lat: 47.3769, lng: 8.5417, name: 'Zurich' },
  { pattern: /\bgeneva\b/i, lat: 46.2044, lng: 6.1432, name: 'Geneva' },
  { pattern: /\bmadrid\b/i, lat: 40.4168, lng: -3.7038, name: 'Madrid' },
  { pattern: /\bbarcelona\b/i, lat: 41.3851, lng: 2.1734, name: 'Barcelona' },
  { pattern: /\brome\b/i, lat: 41.9028, lng: 12.4964, name: 'Rome' },
  { pattern: /\bmilan\b/i, lat: 45.4642, lng: 9.1900, name: 'Milan' },
  { pattern: /\blisbon\b/i, lat: 38.7223, lng: -9.1393, name: 'Lisbon' },
  { pattern: /\bathens\b/i, lat: 37.9838, lng: 23.7275, name: 'Athens' },
  { pattern: /\bstockholm\b/i, lat: 59.3293, lng: 18.0686, name: 'Stockholm' },
  { pattern: /\boslo\b/i, lat: 59.9139, lng: 10.7522, name: 'Oslo' },
  { pattern: /\bcopenhagen\b/i, lat: 55.6761, lng: 12.5683, name: 'Copenhagen' },
  { pattern: /\bhelsinki\b/i, lat: 60.1695, lng: 24.9354, name: 'Helsinki' },
  { pattern: /\bdublin\b/i, lat: 53.3498, lng: -6.2603, name: 'Dublin' },
  { pattern: /\bedinburgh\b/i, lat: 55.9533, lng: -3.1883, name: 'Edinburgh' },
  { pattern: /\bwarsaw\b/i, lat: 52.2297, lng: 21.0122, name: 'Warsaw' },
  { pattern: /\bprague\b/i, lat: 50.0755, lng: 14.4378, name: 'Prague' },
  { pattern: /\bbudapest\b/i, lat: 47.4979, lng: 19.0402, name: 'Budapest' },
  { pattern: /\bbucharest\b/i, lat: 44.4268, lng: 26.1025, name: 'Bucharest' },
  { pattern: /\bsofia\b/i, lat: 42.6977, lng: 23.3219, name: 'Sofia' },
  { pattern: /\bbelgrade\b/i, lat: 44.7866, lng: 20.4489, name: 'Belgrade' },
  { pattern: /\bzagreb\b/i, lat: 45.8150, lng: 15.9819, name: 'Zagreb' },
  { pattern: /\bljubljana\b/i, lat: 46.0569, lng: 14.5058, name: 'Ljubljana' },
  { pattern: /\bsarajevo\b/i, lat: 43.8563, lng: 18.4131, name: 'Sarajevo' },
  { pattern: /\btirana\b/i, lat: 41.3275, lng: 19.8187, name: 'Tirana' },
  { pattern: /\bskopje\b/i, lat: 41.9973, lng: 21.4280, name: 'Skopje' },
  { pattern: /\bpristina\b/i, lat: 42.6629, lng: 21.1655, name: 'Pristina' },

  // Eastern Europe / Russia
  { pattern: /\bkyiv\b/i, lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  { pattern: /\bkiev\b/i, lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  { pattern: /\bkharkiv\b/i, lat: 49.9935, lng: 36.2304, name: 'Kharkiv' },
  { pattern: /\bodesa\b/i, lat: 46.4825, lng: 30.7233, name: 'Odesa' },
  { pattern: /\bodessa\b/i, lat: 46.4825, lng: 30.7233, name: 'Odesa' },
  { pattern: /\bmariupol\b/i, lat: 47.0951, lng: 37.5497, name: 'Mariupol' },
  { pattern: /\bminsk\b/i, lat: 53.9045, lng: 27.5615, name: 'Minsk' },
  { pattern: /\bvilnius\b/i, lat: 54.6872, lng: 25.2797, name: 'Vilnius' },
  { pattern: /\briga\b/i, lat: 56.9496, lng: 24.1052, name: 'Riga' },
  { pattern: /\btallinn\b/i, lat: 59.4370, lng: 24.7536, name: 'Tallinn' },
  { pattern: /\bst\.? petersburg\b/i, lat: 59.9311, lng: 30.3609, name: 'St. Petersburg' },

  // === ASIA (expanded) ===
  // East Asia
  { pattern: /\btokyo\b/i, lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  { pattern: /\bosaka\b/i, lat: 34.6937, lng: 135.5023, name: 'Osaka' },
  { pattern: /\bseoul\b/i, lat: 37.5665, lng: 126.9780, name: 'Seoul' },
  { pattern: /\bpyongyang\b/i, lat: 39.0392, lng: 125.7625, name: 'Pyongyang' },
  { pattern: /\bshanghai\b/i, lat: 31.2304, lng: 121.4737, name: 'Shanghai' },
  { pattern: /\bhong kong\b/i, lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
  { pattern: /\btaipei\b/i, lat: 25.0330, lng: 121.5654, name: 'Taipei' },
  { pattern: /\btaiwan\b/i, lat: 25.0330, lng: 121.5654, name: 'Taiwan' },
  { pattern: /\bmanila\b/i, lat: 14.5995, lng: 120.9842, name: 'Manila' },
  { pattern: /\bjakarta\b/i, lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
  { pattern: /\bsingapore\b/i, lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  { pattern: /\bkuala lumpur\b/i, lat: 3.1390, lng: 101.6869, name: 'Kuala Lumpur' },
  { pattern: /\bbangkok\b/i, lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
  { pattern: /\bhanoi\b/i, lat: 21.0285, lng: 105.8542, name: 'Hanoi' },
  { pattern: /\bho chi minh\b/i, lat: 10.8231, lng: 106.6297, name: 'Ho Chi Minh City' },

  // South Asia
  { pattern: /\bnew delhi\b/i, lat: 28.6139, lng: 77.2090, name: 'New Delhi' },
  { pattern: /\bmumbai\b/i, lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  { pattern: /\bbombay\b/i, lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  { pattern: /\bkolkata\b/i, lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  { pattern: /\bkashmir\b/i, lat: 34.0837, lng: 74.7973, name: 'Kashmir' },
  { pattern: /\bislamabad\b/i, lat: 33.6844, lng: 73.0479, name: 'Islamabad' },
  { pattern: /\bkarachi\b/i, lat: 24.8607, lng: 67.0011, name: 'Karachi' },
  { pattern: /\blahore\b/i, lat: 31.5497, lng: 74.3436, name: 'Lahore' },
  { pattern: /\bdhaka\b/i, lat: 23.8103, lng: 90.4125, name: 'Dhaka' },
  { pattern: /\bcolombo\b/i, lat: 6.9271, lng: 79.8612, name: 'Colombo' },
  { pattern: /\bkathmandu\b/i, lat: 27.7172, lng: 85.3240, name: 'Kathmandu' },
  { pattern: /\bkabul\b/i, lat: 34.5553, lng: 69.2075, name: 'Kabul' },

  // Central Asia
  { pattern: /\btashkent\b/i, lat: 41.2995, lng: 69.2401, name: 'Tashkent' },
  { pattern: /\balmaty\b/i, lat: 43.2220, lng: 76.8512, name: 'Almaty' },
  { pattern: /\bnur-sultan\b/i, lat: 51.1694, lng: 71.4491, name: 'Nur-Sultan' },
  { pattern: /\bastana\b/i, lat: 51.1694, lng: 71.4491, name: 'Nur-Sultan' },
  { pattern: /\bbaku\b/i, lat: 40.4093, lng: 49.8671, name: 'Baku' },
  { pattern: /\btbilisi\b/i, lat: 41.7151, lng: 44.8271, name: 'Tbilisi' },
  { pattern: /\byerevan\b/i, lat: 40.1792, lng: 44.4991, name: 'Yerevan' },

  // === AFRICA (expanded) ===
  { pattern: /\baddis ababa\b/i, lat: 9.0320, lng: 38.7469, name: 'Addis Ababa' },
  { pattern: /\bnairobi\b/i, lat: -1.2921, lng: 36.8219, name: 'Nairobi' },
  { pattern: /\bkhartoum\b/i, lat: 15.5007, lng: 32.5599, name: 'Khartoum' },
  { pattern: /\btripoli libya\b/i, lat: 32.8872, lng: 13.1913, name: 'Tripoli (Libya)' },
  { pattern: /\btunis\b/i, lat: 36.8065, lng: 10.1815, name: 'Tunis' },
  { pattern: /\balgiers\b/i, lat: 36.7538, lng: 3.0588, name: 'Algiers' },
  { pattern: /\brabat\b/i, lat: 34.0209, lng: -6.8416, name: 'Rabat' },
  { pattern: /\bcasablanca\b/i, lat: 33.5731, lng: -7.5898, name: 'Casablanca' },
  { pattern: /\blagos\b/i, lat: 6.5244, lng: 3.3792, name: 'Lagos' },
  { pattern: /\babuja\b/i, lat: 9.0765, lng: 7.3986, name: 'Abuja' },
  { pattern: /\baccra\b/i, lat: 5.6037, lng: -0.1870, name: 'Accra' },
  { pattern: /\bdakar\b/i, lat: 14.7167, lng: -17.4677, name: 'Dakar' },
  { pattern: /\bjohannesburg\b/i, lat: -26.2041, lng: 28.0473, name: 'Johannesburg' },
  { pattern: /\bcape town\b/i, lat: -33.9249, lng: 18.4241, name: 'Cape Town' },
  { pattern: /\bpretoria\b/i, lat: -25.7479, lng: 28.2293, name: 'Pretoria' },
  { pattern: /\bkinshasa\b/i, lat: -4.4419, lng: 15.2663, name: 'Kinshasa' },
  { pattern: /\bluanda\b/i, lat: -8.8390, lng: 13.2894, name: 'Luanda' },
  { pattern: /\bmogadishu\b/i, lat: 2.0469, lng: 45.3182, name: 'Mogadishu' },

  // === AMERICAS (expanded) ===
  // North America
  { pattern: /\blos angeles\b/i, lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
  { pattern: /\bchicago\b/i, lat: 41.8781, lng: -87.6298, name: 'Chicago' },
  { pattern: /\bsan francisco\b/i, lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
  { pattern: /\bhouston\b/i, lat: 29.7604, lng: -95.3698, name: 'Houston' },
  { pattern: /\bmiami\b/i, lat: 25.7617, lng: -80.1918, name: 'Miami' },
  { pattern: /\batlanta\b/i, lat: 33.7490, lng: -84.3880, name: 'Atlanta' },
  { pattern: /\bboston\b/i, lat: 42.3601, lng: -71.0589, name: 'Boston' },
  { pattern: /\bseattle\b/i, lat: 47.6062, lng: -122.3321, name: 'Seattle' },
  { pattern: /\bdetroit\b/i, lat: 42.3314, lng: -83.0458, name: 'Detroit' },
  { pattern: /\btoronto\b/i, lat: 43.6532, lng: -79.3832, name: 'Toronto' },
  { pattern: /\bvancouver\b/i, lat: 49.2827, lng: -123.1207, name: 'Vancouver' },
  { pattern: /\bmontreal\b/i, lat: 45.5017, lng: -73.5673, name: 'Montreal' },
  { pattern: /\bottawa\b/i, lat: 45.4215, lng: -75.6972, name: 'Ottawa' },
  { pattern: /\bmexico city\b/i, lat: 19.4326, lng: -99.1332, name: 'Mexico City' },
  { pattern: /\bguadalajara\b/i, lat: 20.6597, lng: -103.3496, name: 'Guadalajara' },

  // South America
  { pattern: /\bbogota\b/i, lat: 4.7110, lng: -74.0721, name: 'Bogota' },
  { pattern: /\bcaracas\b/i, lat: 10.4806, lng: -66.9036, name: 'Caracas' },
  { pattern: /\bquito\b/i, lat: -0.1807, lng: -78.4678, name: 'Quito' },
  { pattern: /\blima\b/i, lat: -12.0464, lng: -77.0428, name: 'Lima' },
  { pattern: /\bla paz\b/i, lat: -16.4897, lng: -68.1193, name: 'La Paz' },
  { pattern: /\bsantiago\b/i, lat: -33.4489, lng: -70.6693, name: 'Santiago' },
  { pattern: /\bbuenos aires\b/i, lat: -34.6037, lng: -58.3816, name: 'Buenos Aires' },
  { pattern: /\bmontevideo\b/i, lat: -34.9011, lng: -56.1645, name: 'Montevideo' },
  { pattern: /\bsao paulo\b/i, lat: -23.5505, lng: -46.6333, name: 'Sao Paulo' },
  { pattern: /\brio de janeiro\b/i, lat: -22.9068, lng: -43.1729, name: 'Rio de Janeiro' },
  { pattern: /\bbrasilia\b/i, lat: -15.7975, lng: -47.8919, name: 'Brasilia' },
  { pattern: /\bhavana\b/i, lat: 23.1136, lng: -82.3666, name: 'Havana' },
  { pattern: /\bsan juan\b/i, lat: 18.4655, lng: -66.1057, name: 'San Juan' },

  // === OCEANIA (expanded) ===
  { pattern: /\bsydney\b/i, lat: -33.8688, lng: 151.2093, name: 'Sydney' },
  { pattern: /\bmelbourne\b/i, lat: -37.8136, lng: 144.9631, name: 'Melbourne' },
  { pattern: /\bbrisbane\b/i, lat: -27.4698, lng: 153.0251, name: 'Brisbane' },
  { pattern: /\bperth\b/i, lat: -31.9505, lng: 115.8605, name: 'Perth' },
  { pattern: /\bcanberra\b/i, lat: -35.2809, lng: 149.1300, name: 'Canberra' },
  { pattern: /\bauckland\b/i, lat: -36.8485, lng: 174.7633, name: 'Auckland' },
  { pattern: /\bwellington\b/i, lat: -41.2866, lng: 174.7756, name: 'Wellington' },
];

export class EventsService {
  private static instance: EventsService;
  private cache: { events: TimelineEvent[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): EventsService {
    if (!EventsService.instance) {
      EventsService.instance = new EventsService();
    }
    return EventsService.instance;
  }

  extractEventsFromArticles(articles: NewsArticle[]): TimelineEvent[] {
    // Check cache
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.events;
    }

    const eventsMap = new Map<string, TimelineEvent>();

    for (const article of articles) {
      const event = this.extractEvent(article);
      if (event) {
        // Group similar events by date and category
        const key = `${event.date.toISOString().split('T')[0]}-${event.category}-${event.location?.name || 'general'}`;

        if (eventsMap.has(key)) {
          // Merge into existing event
          const existing = eventsMap.get(key)!;
          existing.sources.push(article.source.id);
          existing.relatedArticles.push(article.id);
          // Update severity based on coverage
          existing.severity = Math.min(10, existing.severity + 0.5);
        } else {
          eventsMap.set(key, event);
        }
      }
    }

    // Sort by date (newest first) and severity
    const events = Array.from(eventsMap.values())
      .sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return b.severity - a.severity;
      })
      .slice(0, 100); // Limit to 100 events

    // Cache results
    this.cache = { events, timestamp: Date.now() };

    return events;
  }

  private extractEvent(article: NewsArticle): TimelineEvent | null {
    const text = `${article.title} ${article.content}`.toLowerCase();

    // Determine category
    let category: EventCategory = 'other';
    let severityBoost = 0;

    for (const pattern of EVENT_PATTERNS) {
      if (pattern.keywords.some(kw => text.includes(kw))) {
        category = pattern.category;
        severityBoost = pattern.severityBoost;
        break;
      }
    }

    // Extract location first
    const location = this.extractLocation(text);

    // For map visualization, prioritize articles with locations
    // Skip only if no category match AND no location AND not significant
    if (category === 'other' && !location && !this.isSignificantEvent(text)) {
      return null;
    }

    // Calculate severity based on various factors
    const severity = this.calculateSeverity(article, category, severityBoost);

    return {
      id: `event-${article.id}`,
      date: new Date(article.publishedAt),
      title: this.shortenTitle(article.title),
      description: article.summary || article.content.slice(0, 200),
      category,
      severity,
      sources: [article.source.id],
      location,
      relatedArticles: [article.id],
    };
  }

  private isSignificantEvent(text: string): boolean {
    const significantKeywords = [
      'breaking', 'urgent', 'major', 'historic', 'unprecedented',
      'killed', 'dead', 'casualties', 'explosion', 'emergency',
      'statement', 'announced', 'decision', 'vote', 'sanction',
      'conflict', 'crisis', 'tension', 'escalation', 'threat',
      'warning', 'report', 'forces', 'military', 'security'
    ];
    return significantKeywords.some(kw => text.includes(kw));
  }

  private extractLocation(text: string): { lat: number; lng: number; name: string } | undefined {
    for (const loc of LOCATION_PATTERNS) {
      if (loc.pattern.test(text)) {
        return { lat: loc.lat, lng: loc.lng, name: loc.name };
      }
    }
    return undefined;
  }

  private calculateSeverity(article: NewsArticle, category: EventCategory, boost: number): number {
    let severity = 5 + boost;

    // Adjust based on sentiment
    if (article.sentiment === 'negative') {
      severity += 1;
    }

    // Adjust based on source reliability
    if (article.source.bias.reliability >= 8) {
      severity += 0.5;
    }

    // Military events are generally more severe
    if (category === 'military') {
      severity += 1;
    }

    // Check for high-impact keywords
    const highImpactWords = ['death', 'killed', 'massacre', 'invasion', 'war'];
    const text = `${article.title} ${article.content}`.toLowerCase();
    if (highImpactWords.some(w => text.includes(w))) {
      severity += 1;
    }

    return Math.min(10, Math.max(1, Math.round(severity)));
  }

  private shortenTitle(title: string): string {
    // Remove source prefixes like "[Reuters]"
    let clean = title.replace(/^\[.*?\]\s*/, '');

    // Truncate if too long
    if (clean.length > 80) {
      clean = clean.slice(0, 77) + '...';
    }

    return clean;
  }

  getEventsByCategory(events: TimelineEvent[], category: EventCategory): TimelineEvent[] {
    return events.filter(e => e.category === category);
  }

  getEventsByDateRange(events: TimelineEvent[], start: Date, end: Date): TimelineEvent[] {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= start && eventDate <= end;
    });
  }

  clearCache(): void {
    this.cache = null;
  }
}
