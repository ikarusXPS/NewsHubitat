import type { TimelineEvent } from '../../src/types';

/**
 * Historical Events Database for Middle East Conflict
 *
 * Covers major events from 1948 to present, focusing on:
 * - Israel-Palestine conflict
 * - Regional wars and conflicts
 * - Peace negotiations and agreements
 * - Humanitarian crises
 * - Diplomatic developments
 */
export const HISTORICAL_EVENTS: Omit<TimelineEvent, 'id' | 'sources' | 'relatedArticles'>[] = [
  // 1948-1950: Israeli Independence & Nakba
  {
    date: new Date('1948-05-14'),
    title: 'Gründung des Staates Israel',
    description: 'David Ben-Gurion proklamiert die Unabhängigkeit Israels. Beginn des arabisch-israelischen Konflikts.',
    category: 'diplomacy',
    severity: 10,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('1948-05-15'),
    title: 'Erster Arabisch-Israelischer Krieg beginnt',
    description: 'Ägypten, Syrien, Jordanien, Libanon und Irak greifen Israel an. Über 700.000 Palästinenser fliehen.',
    category: 'military',
    severity: 10,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('1949-02-24'),
    title: 'Waffenstillstandsabkommen Israel-Ägypten',
    description: 'Erstes Waffenstillstandsabkommen nach dem Unabhängigkeitskrieg auf Rhodos unterzeichnet.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },

  // 1950s: Suez Crisis
  {
    date: new Date('1956-10-29'),
    title: 'Suez-Krise beginnt',
    description: 'Israel, Großbritannien und Frankreich greifen Ägypten an nach Nassers Verstaatlichung des Suezkanals.',
    category: 'military',
    severity: 9,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },

  // 1960s: Six-Day War
  {
    date: new Date('1967-06-05'),
    title: 'Sechstagekrieg beginnt',
    description: 'Israel greift Ägypten, Jordanien und Syrien präventiv an. Eroberung von Sinai, Westjordanland, Golanhöhen.',
    category: 'military',
    severity: 10,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('1967-06-07'),
    title: 'Eroberung Ost-Jerusalems',
    description: 'Israelische Truppen erobern Ost-Jerusalem und die Altstadt mit Tempelberg/Haram al-Sharif.',
    category: 'military',
    severity: 10,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('1967-11-22'),
    title: 'UN-Resolution 242',
    description: 'Sicherheitsrat fordert israelischen Rückzug aus besetzten Gebieten und Anerkennung aller Staaten.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 40.7128, lng: -74.0060, name: 'New York' },
  },

  // 1970s: Yom Kippur War & Camp David
  {
    date: new Date('1973-10-06'),
    title: 'Jom-Kippur-Krieg beginnt',
    description: 'Ägypten und Syrien überraschen Israel mit koordiniertem Angriff am höchsten jüdischen Feiertag.',
    category: 'military',
    severity: 10,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('1978-09-17'),
    title: 'Camp-David-Abkommen',
    description: 'Begin und Sadat unterzeichnen Friedensrahmenabkommen unter Vermittlung von US-Präsident Carter.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1979-03-26'),
    title: 'Ägyptisch-Israelischer Friedensvertrag',
    description: 'Erster Friedensvertrag zwischen Israel und einem arabischen Staat. Israel gibt Sinai zurück.',
    category: 'diplomacy',
    severity: 9,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },

  // 1980s: Lebanon Wars & First Intifada
  {
    date: new Date('1982-06-06'),
    title: 'Israelische Invasion im Libanon',
    description: 'Israel greift PLO im Libanon an ("Operation Frieden für Galiläa"). Beginn des Libanonkriegs.',
    category: 'military',
    severity: 9,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('1982-09-16'),
    title: 'Massaker von Sabra und Schatila',
    description: 'Christliche Milizen töten hunderte palästinensische Zivilisten in Flüchtlingslagern. Israel kritisiert.',
    category: 'humanitarian',
    severity: 10,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('1987-12-09'),
    title: 'Erste Intifada beginnt',
    description: 'Palästinensischer Aufstand in Gaza und Westjordanland. Steinwürfe gegen israelische Soldaten.',
    category: 'protest',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('1988-11-15'),
    title: 'Palästinensische Unabhängigkeitserklärung',
    description: 'PLO erklärt Staat Palästina in Algier. Arafat akzeptiert implizit Zweistaatenlösung.',
    category: 'diplomacy',
    severity: 8,
  },

  // 1990s: Oslo Peace Process
  {
    date: new Date('1993-09-13'),
    title: 'Oslo-Abkommen unterzeichnet',
    description: 'Rabin und Arafat unterzeichnen Oslo I in Washington. Gegenseitige Anerkennung Israel-PLO.',
    category: 'diplomacy',
    severity: 9,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1994-10-26'),
    title: 'Israelisch-Jordanischer Friedensvertrag',
    description: 'Zweiter arabischer Staat schließt Frieden mit Israel. Ende des Kriegszustands.',
    category: 'diplomacy',
    severity: 8,
  },
  {
    date: new Date('1995-09-28'),
    title: 'Oslo II unterzeichnet',
    description: 'Westjordanland wird in Zonen A, B, C aufgeteilt. Palästinensische Autonomiebehörde erhält Kontrolle.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1995-11-04'),
    title: 'Ermordung Yitzhak Rabins',
    description: 'Israelischer Premierminister von jüdischem Extremisten bei Friedenskundgebung erschossen.',
    category: 'other',
    severity: 9,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },

  // 2000s: Second Intifada & Gaza Withdrawal
  {
    date: new Date('2000-07-25'),
    title: 'Camp David II scheitert',
    description: 'Verhandlungen zwischen Barak und Arafat scheitern. Keine Einigung über Jerusalem und Rückkehrrecht.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2000-09-28'),
    title: 'Zweite Intifada beginnt',
    description: 'Sharons Besuch auf Tempelberg löst gewaltsame Aufstände aus. Al-Aqsa-Intifada beginnt.',
    category: 'protest',
    severity: 9,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('2002-03-29'),
    title: 'Arabische Friedensinitiative',
    description: 'Arabische Liga bietet Israel Normalisierung gegen Rückzug auf Grenzen von 1967 an.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2002-06-24'),
    title: 'Beginn des Sperrwallbaus',
    description: 'Israel beginnt Bau der Sperranlagen im Westjordanland. International umstritten.',
    category: 'other',
    severity: 7,
    location: { lat: 31.9522, lng: 35.2332, name: 'West Bank' },
  },
  {
    date: new Date('2004-11-11'),
    title: 'Tod Yasser Arafats',
    description: 'PLO-Führer stirbt in Paris. Nachfolge durch Mahmud Abbas (Abu Mazen).',
    category: 'other',
    severity: 8,
    location: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
  },
  {
    date: new Date('2005-08-15'),
    title: 'Israelischer Abzug aus Gaza',
    description: 'Israel räumt alle Siedlungen im Gazastreifen. 8.000 Siedler werden evakuiert.',
    category: 'other',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2006-01-25'),
    title: 'Hamas gewinnt Parlamentswahlen',
    description: 'Hamas gewinnt palästinensische Wahlen. Internationale Gemeinschaft isoliert Hamas-Regierung.',
    category: 'other',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2006-07-12'),
    title: 'Zweiter Libanonkrieg beginnt',
    description: 'Hisbollah entführt zwei israelische Soldaten. Israel startet Militäroffensive im Libanon.',
    category: 'military',
    severity: 9,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2007-06-14'),
    title: 'Hamas übernimmt Kontrolle in Gaza',
    description: 'Hamas vertreibt Fatah gewaltsam aus Gaza. Spaltung zwischen Gaza und Westjordanland.',
    category: 'other',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },

  // 2008-2009: Gaza War
  {
    date: new Date('2008-12-27'),
    title: 'Operation Cast Lead beginnt',
    description: 'Israel startet Luftangriffe auf Gaza nach Raketenbeschuss. 22-tägiger Krieg.',
    category: 'military',
    severity: 9,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },

  // 2010s: Arab Spring & Multiple Gaza Conflicts
  {
    date: new Date('2010-12-17'),
    title: 'Arabischer Frühling beginnt',
    description: 'Selbstverbrennung in Tunesien löst Protestwelle im Nahen Osten aus.',
    category: 'protest',
    severity: 8,
  },
  {
    date: new Date('2011-03-15'),
    title: 'Syrischer Bürgerkrieg beginnt',
    description: 'Proteste in Syrien eskalieren zum Bürgerkrieg. Regionaler Konflikt entsteht.',
    category: 'military',
    severity: 10,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2012-11-14'),
    title: 'Operation Pillar of Defense',
    description: 'Achttägiger Konflikt zwischen Israel und Hamas. Ägypten vermittelt Waffenstillstand.',
    category: 'military',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2014-07-08'),
    title: 'Operation Protective Edge beginnt',
    description: '50-tägiger Gaza-Krieg. Über 2.100 Tote, hauptsächlich Palästinenser.',
    category: 'military',
    severity: 9,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2015-09-30'),
    title: 'Russische Intervention in Syrien',
    description: 'Russland beginnt Luftangriffe zur Unterstützung Assad-Regimes.',
    category: 'military',
    severity: 9,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2017-12-06'),
    title: 'USA erkennen Jerusalem als Hauptstadt an',
    description: 'Trump erkennt Jerusalem als israelische Hauptstadt an. Arabische Welt protestiert.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2018-05-14'),
    title: 'US-Botschaft nach Jerusalem verlegt',
    description: 'USA verlegen Botschaft von Tel Aviv nach Jerusalem. Proteste in Gaza.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },

  // 2020s: Abraham Accords & Recent Escalations
  {
    date: new Date('2020-08-13'),
    title: 'Abraham-Abkommen angekündigt',
    description: 'VAE normalisieren Beziehungen zu Israel. Erste Golf-Staat-Normalisierung seit Jahrzehnten.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi' },
  },
  {
    date: new Date('2020-09-15'),
    title: 'Abraham-Abkommen unterzeichnet',
    description: 'Israel, VAE und Bahrain unterzeichnen Normalisierungsabkommen im Weißen Haus.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2020-12-10'),
    title: 'Marokko normalisiert Beziehungen',
    description: 'Marokko als viertes arabisches Land normalisiert Beziehungen zu Israel.',
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2021-05-10'),
    title: 'Gaza-Israel Konflikt Mai 2021',
    description: 'Elftägiger Konflikt nach Spannungen in Sheikh Jarrah und auf Tempelberg.',
    category: 'military',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2022-08-05'),
    title: 'Operation Breaking Dawn',
    description: 'Dreitägige militärische Auseinandersetzung zwischen Israel und Islamischem Dschihad.',
    category: 'military',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-03-09'),
    title: 'Justizreform-Proteste in Israel',
    description: 'Massenproteste gegen Netanyahus Justizreform. Gesellschaftliche Spaltung.',
    category: 'protest',
    severity: 6,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2023-10-07'),
    title: 'Hamas-Angriff auf Israel',
    description: 'Überraschungsangriff der Hamas. Über 1.200 Israelis getötet, 240 entführt. Größter Angriff seit 1973.',
    category: 'military',
    severity: 10,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-10-08'),
    title: 'Israel erklärt Kriegszustand',
    description: 'Israel erklärt offiziell Krieg und beginnt Mobilisierung von Reservisten.',
    category: 'military',
    severity: 10,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2023-10-27'),
    title: 'Israelische Bodenoffensive in Gaza',
    description: 'IDF beginnt Bodenoperationen im Gazastreifen nach drei Wochen Luftangriffen.',
    category: 'military',
    severity: 10,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-11-24'),
    title: 'Erste Waffenruhe und Geiselfreilassung',
    description: 'Viertägige humanitäre Waffenruhe. Hamas lässt 105 Geiseln frei, Israel 240 Palästinenser.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-12-01'),
    title: 'Kämpfe werden fortgesetzt',
    description: 'Nach Ende der Waffenruhe werden Kämpfe intensiviert. Fokus auf Südgaza.',
    category: 'military',
    severity: 9,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2024-01-26'),
    title: 'ICJ-Urteil zu Völkermord-Vorwürfen',
    description: 'Internationaler Gerichtshof fordert Israel auf, Völkermord in Gaza zu verhindern.',
    category: 'diplomacy',
    severity: 8,
  },
  {
    date: new Date('2024-02-12'),
    title: 'Rafah-Offensive angekündigt',
    description: 'Israel plant Offensive auf Rafah trotz 1,4 Millionen Zivilisten dort.',
    category: 'military',
    severity: 9,
    location: { lat: 31.2765, lng: 34.2458, name: 'Rafah' },
  },
  {
    date: new Date('2024-04-01'),
    title: 'Iranischer Angriff auf israelische Botschaft',
    description: 'Israel bombardiert iranisches Konsulat in Damaskus. Sieben Militärberater getötet.',
    category: 'military',
    severity: 8,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2024-04-13'),
    title: 'Iran greift Israel direkt an',
    description: 'Erstmals direkter iranischer Angriff auf Israel mit über 300 Drohnen und Raketen.',
    category: 'military',
    severity: 9,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2024-05-07'),
    title: 'Rafah-Offensive beginnt',
    description: 'Israel startet Bodenoffensive in Rafah trotz internationaler Kritik.',
    category: 'military',
    severity: 9,
    location: { lat: 31.2765, lng: 34.2458, name: 'Rafah' },
  },
  {
    date: new Date('2024-05-20'),
    title: 'ICC beantragt Haftbefehle',
    description: 'Internationaler Strafgerichtshof beantragt Haftbefehle gegen Netanyahu und Hamas-Führer.',
    category: 'diplomacy',
    severity: 8,
  },
  {
    date: new Date('2024-07-31'),
    title: 'Ismail Haniyeh in Teheran getötet',
    description: 'Hamas-Führer bei mutmaßlichem israelischem Angriff in Iran getötet.',
    category: 'military',
    severity: 9,
    location: { lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  },
  {
    date: new Date('2024-09-17'),
    title: 'Pager-Angriffe im Libanon',
    description: 'Tausende Pager von Hisbollah-Mitgliedern explodieren. Israelische Operation vermutet.',
    category: 'military',
    severity: 8,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2024-09-27'),
    title: 'Hassan Nasrallah getötet',
    description: 'Hisbollah-Führer bei israelischem Luftangriff in Beirut getötet.',
    category: 'military',
    severity: 9,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2024-10-01'),
    title: 'Iranische Raketenoffensive auf Israel',
    description: 'Iran feuert über 180 ballistische Raketen auf Israel als Vergeltung.',
    category: 'military',
    severity: 9,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2024-10-26'),
    title: 'Israelische Vergeltungsschläge gegen Iran',
    description: 'Israel greift militärische Ziele im Iran an. Regionaler Konflikt eskaliert.',
    category: 'military',
    severity: 9,
    location: { lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  },
  {
    date: new Date('2024-11-27'),
    title: 'Waffenruhe Israel-Hisbollah',
    description: '60-tägige Waffenruhe zwischen Israel und Hisbollah vereinbart.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2024-12-08'),
    title: 'Sturz Assad-Regimes in Syrien',
    description: 'Rebellenallianz erobert Damaskus. Assad flieht nach Russland. Ende 54-jähriger Herrschaft.',
    category: 'other',
    severity: 10,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2025-01-15'),
    title: 'Gaza-Waffenruhe und Geiselabkommen',
    description: 'Waffenruhe zwischen Israel und Hamas. Schrittweise Freilassung von 33 Geiseln gegen palästinensische Gefangene.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2025-01-19'),
    title: 'Waffenruhe tritt in Kraft',
    description: 'Nach 15 Monaten Krieg beginnt erste Phase der Waffenruhe. Humanitäre Hilfe erreicht Gaza.',
    category: 'diplomacy',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },

  // Additional key diplomatic moments
  {
    date: new Date('1964-05-28'),
    title: 'Gründung der PLO',
    description: 'Palästinensische Befreiungsorganisation in Kairo gegründet.',
    category: 'other',
    severity: 7,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },
  {
    date: new Date('1970-09-16'),
    title: 'Schwarzer September in Jordanien',
    description: 'Jordanien vertreibt PLO gewaltsam. Tausende Tote.',
    category: 'military',
    severity: 8,
    location: { lat: 31.9454, lng: 35.9284, name: 'Amman' },
  },
  {
    date: new Date('1974-10-28'),
    title: 'PLO als Vertretung anerkannt',
    description: 'Arabische Liga erkennt PLO als alleinige legitime Vertretung des palästinensischen Volkes an.',
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('1981-10-06'),
    title: 'Ermordung Anwar Sadats',
    description: 'Ägyptischer Präsident von Islamisten bei Militärparade erschossen.',
    category: 'other',
    severity: 9,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },
  {
    date: new Date('1991-10-30'),
    title: 'Madrid Friedenskonferenz',
    description: 'Erste direkte Verhandlungen zwischen Israel und Palästinensern, Syrien, Libanon, Jordanien.',
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2000-05-24'),
    title: 'Israelischer Rückzug aus Südlibanon',
    description: 'Israel beendet 22-jährige Besatzung Südlibanons. Hisbollah erklärt Sieg.',
    category: 'military',
    severity: 7,
    location: { lat: 33.2, lng: 35.3, name: 'South Lebanon' },
  },
  {
    date: new Date('2003-03-20'),
    title: 'US-Invasion im Irak',
    description: 'USA beginnen Invasion zur Sturz von Saddam Hussein. Regionaler Machtbalance ändert sich.',
    category: 'military',
    severity: 9,
    location: { lat: 33.3152, lng: 44.3661, name: 'Baghdad' },
  },
  {
    date: new Date('2003-04-30'),
    title: 'Road Map for Peace',
    description: 'Quartett (USA, EU, UN, Russland) präsentiert Friedensplan für Zweistaatenlösung.',
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2008-06-19'),
    title: 'Ägyptisch vermittelte Waffenruhe Gaza',
    description: 'Sechsmonatige Waffenruhe zwischen Israel und Hamas. Endet im Dezember.',
    category: 'diplomacy',
    severity: 6,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2009-09-24'),
    title: 'Goldstone-Bericht veröffentlicht',
    description: 'UN-Untersuchung wirft Israel und Hamas Kriegsverbrechen in Gaza vor.',
    category: 'other',
    severity: 7,
  },
  {
    date: new Date('2011-10-18'),
    title: 'Gilad Shalit freigelassen',
    description: 'Israelischer Soldat nach 5 Jahren Hamas-Gefangenschaft gegen 1.027 Palästinenser ausgetauscht.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2012-11-29'),
    title: 'Palästina erhält UN-Beobachterstatus',
    description: 'UN-Vollversammlung erkennt Palästina als Beobachterstaat an. Israel protestiert.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 40.7128, lng: -74.0060, name: 'New York' },
  },
  {
    date: new Date('2013-07-29'),
    title: 'Kerry-Initiative für Friedensgespräche',
    description: 'US-Außenminister Kerry vermittelt Wiederaufnahme direkter Verhandlungen.',
    category: 'diplomacy',
    severity: 6,
  },
  {
    date: new Date('2014-04-23'),
    title: 'Fatah-Hamas Versöhnungsabkommen',
    description: 'Fatah und Hamas vereinbaren Bildung einer Einheitsregierung. Scheitert später.',
    category: 'diplomacy',
    severity: 6,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2016-12-23'),
    title: 'UN-Resolution 2334 gegen Siedlungen',
    description: 'Sicherheitsrat verurteilt israelische Siedlungen. USA enthalten sich erstmals.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 40.7128, lng: -74.0060, name: 'New York' },
  },
  {
    date: new Date('2018-03-30'),
    title: 'Großer Rückkehrmarsch beginnt',
    description: 'Wöchentliche Proteste an Gaza-Grenze für Rückkehrrecht. Über 200 Tote bis Ende 2019.',
    category: 'protest',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2019-03-25'),
    title: 'Trump erkennt Golanhöhen als israelisch an',
    description: 'USA erkennen als erstes Land israelische Souveränität über Golanhöhen an.',
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2020-01-28'),
    title: 'Trump präsentiert Friedensplan',
    description: '"Deal des Jahrhunderts" ohne palästinensische Beteiligung. Von Palästinensern abgelehnt.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2021-05-21'),
    title: 'Waffenruhe nach Mai-Konflikt',
    description: 'Ägypten vermittelt Waffenruhe nach elftägigem Konflikt.',
    category: 'diplomacy',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2021-08-26'),
    title: 'Bennett trifft Biden',
    description: 'Erster offizieller Besuch des neuen israelischen Premierministers in USA.',
    category: 'diplomacy',
    severity: 5,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2022-03-27'),
    title: 'Negev-Gipfel',
    description: 'Außenminister von Israel, USA, VAE, Bahrain, Marokko, Ägypten treffen sich.',
    category: 'diplomacy',
    severity: 6,
  },
  {
    date: new Date('2022-08-05'),
    title: 'Operation Breaking Dawn beendet',
    description: 'Dreitägiger Konflikt endet mit ägyptisch vermittelter Waffenruhe.',
    category: 'diplomacy',
    severity: 6,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-01-26'),
    title: 'Jenin-Razzia',
    description: 'Israelische Razzia in Jenin-Flüchtlingslager. Neun Palästinenser getötet.',
    category: 'military',
    severity: 7,
    location: { lat: 32.4600, lng: 35.3000, name: 'Jenin' },
  },
  {
    date: new Date('2023-03-15'),
    title: 'Israel-Saudi-Arabien Annäherung',
    description: 'Berichte über Fortschritte bei Normalisierungsverhandlungen zwischen Israel und Saudi-Arabien.',
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2023-05-09'),
    title: 'Operation Shield and Arrow',
    description: 'Fünftägiger Konflikt zwischen Israel und Islamischem Dschihad in Gaza.',
    category: 'military',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
];

/**
 * Get historical events sorted by date (newest first)
 */
export function getHistoricalEvents(): TimelineEvent[] {
  return HISTORICAL_EVENTS.map((event, index) => ({
    ...event,
    id: `historical-${index}`,
    sources: [],
    relatedArticles: [],
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get events within a specific date range
 */
export function getHistoricalEventsByDateRange(start: Date, end: Date): TimelineEvent[] {
  return getHistoricalEvents().filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= start && eventDate <= end;
  });
}

/**
 * Get events by category
 */
export function getHistoricalEventsByCategory(category: 'military' | 'diplomacy' | 'humanitarian' | 'protest' | 'other'): TimelineEvent[] {
  return getHistoricalEvents().filter((event) => event.category === category);
}

/**
 * Get most severe events (severity >= 8)
 */
export function getCriticalHistoricalEvents(): TimelineEvent[] {
  return getHistoricalEvents().filter((event) => event.severity >= 8);
}

/**
 * Search events by keyword in title or description
 */
export function searchHistoricalEvents(query: string): TimelineEvent[] {
  const lowerQuery = query.toLowerCase();
  return getHistoricalEvents().filter(
    (event) =>
      event.title.toLowerCase().includes(lowerQuery) ||
      event.description.toLowerCase().includes(lowerQuery)
  );
}
