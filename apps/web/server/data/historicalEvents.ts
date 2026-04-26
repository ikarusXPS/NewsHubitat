import type { TimelineEvent, TimelineEventI18n } from '../../src/types';

/**
 * Historical Events Database - Global Scope (1900+)
 *
 * Covers major events from 1914 to present, focusing on:
 * - World Wars and their aftermath
 * - Cold War milestones
 * - Middle East conflicts
 * - Regional wars and conflicts
 * - Peace negotiations and agreements
 * - Humanitarian crises
 * - Diplomatic developments
 *
 * All events have bilingual DE/EN support.
 */
export const HISTORICAL_EVENTS: Omit<TimelineEventI18n, 'id' | 'sources' | 'relatedArticles'>[] = [
  // ============================================
  // WWI Era (1914-1918)
  // ============================================
  {
    date: new Date('1914-06-28'),
    title: {
      de: 'Attentat von Sarajevo',
      en: 'Assassination of Archduke Franz Ferdinand',
    },
    description: {
      de: 'Ermordung des österreichischen Thronfolgers löst den Ersten Weltkrieg aus.',
      en: 'Assassination of Austrian heir triggers World War I.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 43.8563, lng: 18.4131, name: 'Sarajevo' },
  },
  {
    date: new Date('1914-07-28'),
    title: {
      de: 'Beginn des Ersten Weltkriegs',
      en: 'World War I Begins',
    },
    description: {
      de: 'Österreich-Ungarn erklärt Serbien den Krieg. Kettenreaktion der Bündnisse.',
      en: 'Austria-Hungary declares war on Serbia. Chain reaction of alliances.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 48.2082, lng: 16.3738, name: 'Vienna' },
  },
  {
    date: new Date('1917-04-06'),
    title: {
      de: 'USA treten in Ersten Weltkrieg ein',
      en: 'United States Enters World War I',
    },
    description: {
      de: 'US-Kongress erklärt Deutschland den Krieg nach uneingeschränktem U-Boot-Krieg.',
      en: 'US Congress declares war on Germany after unrestricted submarine warfare.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1917-11-07'),
    title: {
      de: 'Russische Oktoberrevolution',
      en: 'Russian October Revolution',
    },
    description: {
      de: 'Bolschewiki unter Lenin stürzen provisorische Regierung. Beginn der Sowjetherrschaft.',
      en: 'Bolsheviks under Lenin overthrow provisional government. Start of Soviet rule.',
    },
    category: 'other',
    severity: 10,
    location: { lat: 59.9311, lng: 30.3609, name: 'St. Petersburg' },
  },
  {
    date: new Date('1918-11-11'),
    title: {
      de: 'Waffenstillstand - Ende des Ersten Weltkriegs',
      en: 'Armistice - End of World War I',
    },
    description: {
      de: 'Waffenstillstand beendet Kampfhandlungen. Über 17 Millionen Tote.',
      en: 'Armistice ends combat. Over 17 million dead.',
    },
    category: 'diplomacy',
    severity: 10,
    location: { lat: 49.4358, lng: 2.9044, name: 'Compiegne' },
  },
  {
    date: new Date('1919-06-28'),
    title: {
      de: 'Vertrag von Versailles',
      en: 'Treaty of Versailles',
    },
    description: {
      de: 'Friedensvertrag beendet offiziell WWI. Deutschland akzeptiert Kriegsschuld.',
      en: 'Peace treaty officially ends WWI. Germany accepts war guilt.',
    },
    category: 'diplomacy',
    severity: 9,
    location: { lat: 48.8049, lng: 2.1204, name: 'Versailles' },
  },

  // ============================================
  // Interwar Period (1919-1939)
  // ============================================
  {
    date: new Date('1929-10-29'),
    title: {
      de: 'Schwarzer Dienstag - Börsencrash',
      en: 'Black Tuesday - Stock Market Crash',
    },
    description: {
      de: 'Wall Street Crash löst Weltwirtschaftskrise aus.',
      en: 'Wall Street Crash triggers Great Depression worldwide.',
    },
    category: 'economic',
    severity: 10,
    location: { lat: 40.7128, lng: -74.0060, name: 'New York' },
  },
  {
    date: new Date('1933-01-30'),
    title: {
      de: 'Hitler wird Reichskanzler',
      en: 'Hitler Becomes Chancellor',
    },
    description: {
      de: 'Adolf Hitler wird zum Reichskanzler ernannt. Beginn der NS-Diktatur.',
      en: 'Adolf Hitler appointed Chancellor. Start of Nazi dictatorship.',
    },
    category: 'other',
    severity: 10,
    location: { lat: 52.5200, lng: 13.4050, name: 'Berlin' },
  },

  // ============================================
  // WWII Era (1939-1945)
  // ============================================
  {
    date: new Date('1939-09-01'),
    title: {
      de: 'Beginn des Zweiten Weltkriegs',
      en: 'World War II Begins',
    },
    description: {
      de: 'Deutschland überfällt Polen. Beginn des Zweiten Weltkriegs.',
      en: 'Germany invades Poland. World War II begins.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 52.2297, lng: 21.0122, name: 'Warsaw' },
  },
  {
    date: new Date('1941-12-07'),
    title: {
      de: 'Angriff auf Pearl Harbor',
      en: 'Attack on Pearl Harbor',
    },
    description: {
      de: 'Japan greift US-Marinebasis an. USA treten in WWII ein.',
      en: 'Japan attacks US naval base. USA enters WWII.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 21.3545, lng: -157.9761, name: 'Pearl Harbor' },
  },
  {
    date: new Date('1944-06-06'),
    title: {
      de: 'D-Day - Landung in der Normandie',
      en: 'D-Day - Normandy Landings',
    },
    description: {
      de: 'Alliierte Invasion in Normandie. Beginn der Befreiung Westeuropas.',
      en: 'Allied invasion of Normandy. Start of Western Europe liberation.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 49.3497, lng: -0.8773, name: 'Normandy' },
  },
  {
    date: new Date('1945-05-08'),
    title: {
      de: 'VE-Day - Ende des Krieges in Europa',
      en: 'VE Day - End of War in Europe',
    },
    description: {
      de: 'Deutschland kapituliert bedingungslos. Ende des Krieges in Europa.',
      en: 'Germany surrenders unconditionally. End of war in Europe.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 52.5200, lng: 13.4050, name: 'Berlin' },
  },
  {
    date: new Date('1945-08-06'),
    title: {
      de: 'Atombombe auf Hiroshima',
      en: 'Atomic Bomb on Hiroshima',
    },
    description: {
      de: 'USA werfen erste Atombombe auf japanische Stadt. 80.000 sofort tot.',
      en: 'USA drops first atomic bomb on Japanese city. 80,000 killed instantly.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 34.3853, lng: 132.4553, name: 'Hiroshima' },
  },
  {
    date: new Date('1945-09-02'),
    title: {
      de: 'Ende des Zweiten Weltkriegs',
      en: 'End of World War II',
    },
    description: {
      de: 'Japan unterzeichnet Kapitulation. WWII endet nach 60 Millionen Toten.',
      en: 'Japan signs surrender. WWII ends after 60 million deaths.',
    },
    category: 'diplomacy',
    severity: 10,
    location: { lat: 35.4437, lng: 139.6380, name: 'Tokyo Bay' },
  },

  // ============================================
  // Cold War Era & Post-WWII (1945-1991)
  // ============================================
  {
    date: new Date('1945-10-24'),
    title: {
      de: 'Gründung der Vereinten Nationen',
      en: 'United Nations Founded',
    },
    description: {
      de: 'UN-Charta tritt in Kraft. 51 Gründungsmitglieder.',
      en: 'UN Charter enters into force. 51 founding members.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 40.7489, lng: -73.9680, name: 'New York' },
  },
  {
    date: new Date('1947-03-12'),
    title: {
      de: 'Truman-Doktrin verkündet',
      en: 'Truman Doctrine Announced',
    },
    description: {
      de: 'USA verkünden Politik der Eindämmung des Kommunismus.',
      en: 'USA announces policy of containment of communism.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1948-04-04'),
    title: {
      de: 'Marshallplan tritt in Kraft',
      en: 'Marshall Plan Takes Effect',
    },
    description: {
      de: 'Amerikanisches Wiederaufbauprogramm für Europa beginnt.',
      en: 'American reconstruction program for Europe begins.',
    },
    category: 'economic',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1949-04-04'),
    title: {
      de: 'NATO-Gründung',
      en: 'NATO Founded',
    },
    description: {
      de: 'Nordatlantikvertrag unterzeichnet. Westliches Verteidigungsbündnis.',
      en: 'North Atlantic Treaty signed. Western defense alliance.',
    },
    category: 'diplomacy',
    severity: 9,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1949-10-01'),
    title: {
      de: 'Volksrepublik China ausgerufen',
      en: "People's Republic of China Proclaimed",
    },
    description: {
      de: 'Mao Zedong proklamiert Volksrepublik. Nationalisten fliehen nach Taiwan.',
      en: "Mao Zedong proclaims People's Republic. Nationalists flee to Taiwan.",
    },
    category: 'other',
    severity: 10,
    location: { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
  },
  {
    date: new Date('1950-06-25'),
    title: {
      de: 'Beginn des Koreakriegs',
      en: 'Korean War Begins',
    },
    description: {
      de: 'Nordkorea überschreitet 38. Breitengrad. UN-Intervention unter US-Führung.',
      en: 'North Korea crosses 38th parallel. UN intervention under US leadership.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 37.5665, lng: 126.9780, name: 'Seoul' },
  },
  {
    date: new Date('1961-08-13'),
    title: {
      de: 'Bau der Berliner Mauer',
      en: 'Berlin Wall Construction Begins',
    },
    description: {
      de: 'DDR beginnt Mauerbau. Symbol des Kalten Krieges.',
      en: 'East Germany begins wall construction. Symbol of Cold War.',
    },
    category: 'other',
    severity: 9,
    location: { lat: 52.5200, lng: 13.4050, name: 'Berlin' },
  },
  {
    date: new Date('1962-10-16'),
    title: {
      de: 'Kubakrise beginnt',
      en: 'Cuban Missile Crisis Begins',
    },
    description: {
      de: 'USA entdecken sowjetische Raketen auf Kuba. Welt am Rand des Atomkriegs.',
      en: 'USA discovers Soviet missiles in Cuba. World on brink of nuclear war.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 23.1136, lng: -82.3666, name: 'Havana' },
  },
  {
    date: new Date('1969-07-20'),
    title: {
      de: 'Erste Mondlandung',
      en: 'First Moon Landing',
    },
    description: {
      de: 'Apollo 11: Neil Armstrong betritt als erster Mensch den Mond.',
      en: 'Apollo 11: Neil Armstrong becomes first human on Moon.',
    },
    category: 'other',
    severity: 8,
    location: { lat: 28.5728, lng: -80.6490, name: 'Cape Canaveral' },
  },
  {
    date: new Date('1975-04-30'),
    title: {
      de: 'Fall von Saigon',
      en: 'Fall of Saigon',
    },
    description: {
      de: 'Nordvietnam erobert Saigon. Ende des Vietnamkriegs.',
      en: 'North Vietnam captures Saigon. End of Vietnam War.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 10.8231, lng: 106.6297, name: 'Saigon' },
  },
  {
    date: new Date('1989-11-09'),
    title: {
      de: 'Fall der Berliner Mauer',
      en: 'Fall of the Berlin Wall',
    },
    description: {
      de: 'DDR öffnet Grenzen. Symbol für Ende des Kalten Krieges.',
      en: 'East Germany opens borders. Symbol of Cold War ending.',
    },
    category: 'other',
    severity: 10,
    location: { lat: 52.5200, lng: 13.4050, name: 'Berlin' },
  },
  {
    date: new Date('1991-12-25'),
    title: {
      de: 'Auflösung der Sowjetunion',
      en: 'Dissolution of the Soviet Union',
    },
    description: {
      de: 'Gorbatschow tritt zurück. UdSSR zerfällt in 15 unabhängige Staaten.',
      en: 'Gorbachev resigns. USSR dissolves into 15 independent states.',
    },
    category: 'diplomacy',
    severity: 10,
    location: { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  },

  // ============================================
  // Middle East: 1948-1950 Israeli Independence & Nakba
  // ============================================
  {
    date: new Date('1948-05-14'),
    title: {
      de: 'Gründung des Staates Israel',
      en: 'Foundation of the State of Israel',
    },
    description: {
      de: 'David Ben-Gurion proklamiert die Unabhängigkeit Israels. Beginn des arabisch-israelischen Konflikts.',
      en: 'David Ben-Gurion proclaims Israeli independence. Beginning of the Arab-Israeli conflict.',
    },
    category: 'diplomacy',
    severity: 10,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('1948-05-15'),
    title: {
      de: 'Erster Arabisch-Israelischer Krieg beginnt',
      en: 'First Arab-Israeli War Begins',
    },
    description: {
      de: 'Ägypten, Syrien, Jordanien, Libanon und Irak greifen Israel an. Über 700.000 Palästinenser fliehen.',
      en: 'Egypt, Syria, Jordan, Lebanon and Iraq attack Israel. Over 700,000 Palestinians flee.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('1949-02-24'),
    title: {
      de: 'Waffenstillstandsabkommen Israel-Ägypten',
      en: 'Israel-Egypt Armistice Agreement',
    },
    description: {
      de: 'Erstes Waffenstillstandsabkommen nach dem Unabhängigkeitskrieg auf Rhodos unterzeichnet.',
      en: 'First armistice agreement after the Independence War signed in Rhodes.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },

  // ============================================
  // Middle East: 1950s Suez Crisis
  // ============================================
  {
    date: new Date('1956-10-29'),
    title: {
      de: 'Suez-Krise beginnt',
      en: 'Suez Crisis Begins',
    },
    description: {
      de: 'Israel, Großbritannien und Frankreich greifen Ägypten an nach Nassers Verstaatlichung des Suezkanals.',
      en: 'Israel, Britain and France attack Egypt after Nasser nationalizes the Suez Canal.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },

  // ============================================
  // Middle East: 1960s Six-Day War
  // ============================================
  {
    date: new Date('1964-05-28'),
    title: {
      de: 'Gründung der PLO',
      en: 'PLO Founded',
    },
    description: {
      de: 'Palästinensische Befreiungsorganisation in Kairo gegründet.',
      en: 'Palestine Liberation Organization founded in Cairo.',
    },
    category: 'other',
    severity: 7,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },
  {
    date: new Date('1967-06-05'),
    title: {
      de: 'Sechstagekrieg beginnt',
      en: 'Six-Day War Begins',
    },
    description: {
      de: 'Israel greift Ägypten, Jordanien und Syrien präventiv an. Eroberung von Sinai, Westjordanland, Golanhöhen.',
      en: 'Israel launches preemptive strikes on Egypt, Jordan and Syria. Captures Sinai, West Bank, Golan Heights.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('1967-06-07'),
    title: {
      de: 'Eroberung Ost-Jerusalems',
      en: 'Capture of East Jerusalem',
    },
    description: {
      de: 'Israelische Truppen erobern Ost-Jerusalem und die Altstadt mit Tempelberg/Haram al-Sharif.',
      en: 'Israeli forces capture East Jerusalem and Old City with Temple Mount/Haram al-Sharif.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('1967-11-22'),
    title: {
      de: 'UN-Resolution 242',
      en: 'UN Resolution 242',
    },
    description: {
      de: 'Sicherheitsrat fordert israelischen Rückzug aus besetzten Gebieten und Anerkennung aller Staaten.',
      en: 'Security Council demands Israeli withdrawal from occupied territories and recognition of all states.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 40.7128, lng: -74.0060, name: 'New York' },
  },

  // ============================================
  // Middle East: 1970s Yom Kippur War & Camp David
  // ============================================
  {
    date: new Date('1970-09-16'),
    title: {
      de: 'Schwarzer September in Jordanien',
      en: 'Black September in Jordan',
    },
    description: {
      de: 'Jordanien vertreibt PLO gewaltsam. Tausende Tote.',
      en: 'Jordan forcibly expels PLO. Thousands killed.',
    },
    category: 'military',
    severity: 8,
    location: { lat: 31.9454, lng: 35.9284, name: 'Amman' },
  },
  {
    date: new Date('1973-10-06'),
    title: {
      de: 'Jom-Kippur-Krieg beginnt',
      en: 'Yom Kippur War Begins',
    },
    description: {
      de: 'Ägypten und Syrien überraschen Israel mit koordiniertem Angriff am höchsten jüdischen Feiertag.',
      en: 'Egypt and Syria launch surprise coordinated attack on the holiest Jewish holiday.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('1974-10-28'),
    title: {
      de: 'PLO als Vertretung anerkannt',
      en: 'PLO Recognized as Representative',
    },
    description: {
      de: 'Arabische Liga erkennt PLO als alleinige legitime Vertretung des palästinensischen Volkes an.',
      en: 'Arab League recognizes PLO as sole legitimate representative of the Palestinian people.',
    },
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('1978-09-17'),
    title: {
      de: 'Camp-David-Abkommen',
      en: 'Camp David Accords',
    },
    description: {
      de: 'Begin und Sadat unterzeichnen Friedensrahmenabkommen unter Vermittlung von US-Präsident Carter.',
      en: 'Begin and Sadat sign peace framework under mediation of US President Carter.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1979-03-26'),
    title: {
      de: 'Ägyptisch-Israelischer Friedensvertrag',
      en: 'Egypt-Israel Peace Treaty',
    },
    description: {
      de: 'Erster Friedensvertrag zwischen Israel und einem arabischen Staat. Israel gibt Sinai zurück.',
      en: 'First peace treaty between Israel and an Arab state. Israel returns Sinai.',
    },
    category: 'diplomacy',
    severity: 9,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },

  // ============================================
  // Middle East: 1980s Lebanon Wars & First Intifada
  // ============================================
  {
    date: new Date('1981-10-06'),
    title: {
      de: 'Ermordung Anwar Sadats',
      en: 'Assassination of Anwar Sadat',
    },
    description: {
      de: 'Ägyptischer Präsident von Islamisten bei Militärparade erschossen.',
      en: 'Egyptian President assassinated by Islamists during military parade.',
    },
    category: 'other',
    severity: 9,
    location: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  },
  {
    date: new Date('1982-06-06'),
    title: {
      de: 'Israelische Invasion im Libanon',
      en: 'Israeli Invasion of Lebanon',
    },
    description: {
      de: 'Israel greift PLO im Libanon an ("Operation Frieden für Galiläa"). Beginn des Libanonkriegs.',
      en: 'Israel attacks PLO in Lebanon ("Operation Peace for Galilee"). Start of Lebanon War.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('1982-09-16'),
    title: {
      de: 'Massaker von Sabra und Schatila',
      en: 'Sabra and Shatila Massacre',
    },
    description: {
      de: 'Christliche Milizen töten hunderte palästinensische Zivilisten in Flüchtlingslagern. Israel kritisiert.',
      en: 'Christian militias kill hundreds of Palestinian civilians in refugee camps. Israel criticized.',
    },
    category: 'humanitarian',
    severity: 10,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('1987-12-09'),
    title: {
      de: 'Erste Intifada beginnt',
      en: 'First Intifada Begins',
    },
    description: {
      de: 'Palästinensischer Aufstand in Gaza und Westjordanland. Steinwürfe gegen israelische Soldaten.',
      en: 'Palestinian uprising in Gaza and West Bank. Stone throwing against Israeli soldiers.',
    },
    category: 'protest',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('1988-11-15'),
    title: {
      de: 'Palästinensische Unabhängigkeitserklärung',
      en: 'Palestinian Declaration of Independence',
    },
    description: {
      de: 'PLO erklärt Staat Palästina in Algier. Arafat akzeptiert implizit Zweistaatenlösung.',
      en: 'PLO declares State of Palestine in Algiers. Arafat implicitly accepts two-state solution.',
    },
    category: 'diplomacy',
    severity: 8,
  },

  // ============================================
  // Middle East: 1990s Oslo Peace Process
  // ============================================
  {
    date: new Date('1991-10-30'),
    title: {
      de: 'Madrid Friedenskonferenz',
      en: 'Madrid Peace Conference',
    },
    description: {
      de: 'Erste direkte Verhandlungen zwischen Israel und Palästinensern, Syrien, Libanon, Jordanien.',
      en: 'First direct negotiations between Israel and Palestinians, Syria, Lebanon, Jordan.',
    },
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('1993-09-13'),
    title: {
      de: 'Oslo-Abkommen unterzeichnet',
      en: 'Oslo Accords Signed',
    },
    description: {
      de: 'Rabin und Arafat unterzeichnen Oslo I in Washington. Gegenseitige Anerkennung Israel-PLO.',
      en: 'Rabin and Arafat sign Oslo I in Washington. Mutual recognition Israel-PLO.',
    },
    category: 'diplomacy',
    severity: 9,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1994-10-26'),
    title: {
      de: 'Israelisch-Jordanischer Friedensvertrag',
      en: 'Israel-Jordan Peace Treaty',
    },
    description: {
      de: 'Zweiter arabischer Staat schließt Frieden mit Israel. Ende des Kriegszustands.',
      en: 'Second Arab state makes peace with Israel. End of state of war.',
    },
    category: 'diplomacy',
    severity: 8,
  },
  {
    date: new Date('1995-09-28'),
    title: {
      de: 'Oslo II unterzeichnet',
      en: 'Oslo II Signed',
    },
    description: {
      de: 'Westjordanland wird in Zonen A, B, C aufgeteilt. Palästinensische Autonomiebehörde erhält Kontrolle.',
      en: 'West Bank divided into Areas A, B, C. Palestinian Authority gains control.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('1995-11-04'),
    title: {
      de: 'Ermordung Yitzhak Rabins',
      en: 'Assassination of Yitzhak Rabin',
    },
    description: {
      de: 'Israelischer Premierminister von jüdischem Extremisten bei Friedenskundgebung erschossen.',
      en: 'Israeli Prime Minister shot by Jewish extremist at peace rally.',
    },
    category: 'other',
    severity: 9,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },

  // ============================================
  // Middle East: 2000s Second Intifada & Gaza Withdrawal
  // ============================================
  {
    date: new Date('2000-05-24'),
    title: {
      de: 'Israelischer Rückzug aus Südlibanon',
      en: 'Israeli Withdrawal from South Lebanon',
    },
    description: {
      de: 'Israel beendet 22-jährige Besatzung Südlibanons. Hisbollah erklärt Sieg.',
      en: 'Israel ends 22-year occupation of South Lebanon. Hezbollah declares victory.',
    },
    category: 'military',
    severity: 7,
    location: { lat: 33.2, lng: 35.3, name: 'South Lebanon' },
  },
  {
    date: new Date('2000-07-25'),
    title: {
      de: 'Camp David II scheitert',
      en: 'Camp David II Fails',
    },
    description: {
      de: 'Verhandlungen zwischen Barak und Arafat scheitern. Keine Einigung über Jerusalem und Rückkehrrecht.',
      en: 'Negotiations between Barak and Arafat fail. No agreement on Jerusalem and right of return.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2000-09-28'),
    title: {
      de: 'Zweite Intifada beginnt',
      en: 'Second Intifada Begins',
    },
    description: {
      de: 'Sharons Besuch auf Tempelberg löst gewaltsame Aufstände aus. Al-Aqsa-Intifada beginnt.',
      en: "Sharon's visit to Temple Mount triggers violent uprisings. Al-Aqsa Intifada begins.",
    },
    category: 'protest',
    severity: 9,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('2002-03-29'),
    title: {
      de: 'Arabische Friedensinitiative',
      en: 'Arab Peace Initiative',
    },
    description: {
      de: 'Arabische Liga bietet Israel Normalisierung gegen Rückzug auf Grenzen von 1967 an.',
      en: 'Arab League offers Israel normalization in exchange for withdrawal to 1967 borders.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2002-06-24'),
    title: {
      de: 'Beginn des Sperrwallbaus',
      en: 'Construction of Separation Barrier Begins',
    },
    description: {
      de: 'Israel beginnt Bau der Sperranlagen im Westjordanland. International umstritten.',
      en: 'Israel begins construction of barrier in West Bank. Internationally controversial.',
    },
    category: 'other',
    severity: 7,
    location: { lat: 31.9522, lng: 35.2332, name: 'West Bank' },
  },
  {
    date: new Date('2003-03-20'),
    title: {
      de: 'US-Invasion im Irak',
      en: 'US Invasion of Iraq',
    },
    description: {
      de: 'USA beginnen Invasion zur Sturz von Saddam Hussein. Regionaler Machtbalance ändert sich.',
      en: 'USA begins invasion to overthrow Saddam Hussein. Regional power balance shifts.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 33.3152, lng: 44.3661, name: 'Baghdad' },
  },
  {
    date: new Date('2003-04-30'),
    title: {
      de: 'Road Map for Peace',
      en: 'Road Map for Peace',
    },
    description: {
      de: 'Quartett (USA, EU, UN, Russland) präsentiert Friedensplan für Zweistaatenlösung.',
      en: 'Quartet (USA, EU, UN, Russia) presents peace plan for two-state solution.',
    },
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2004-11-11'),
    title: {
      de: 'Tod Yasser Arafats',
      en: 'Death of Yasser Arafat',
    },
    description: {
      de: 'PLO-Führer stirbt in Paris. Nachfolge durch Mahmud Abbas (Abu Mazen).',
      en: 'PLO leader dies in Paris. Succession by Mahmoud Abbas (Abu Mazen).',
    },
    category: 'other',
    severity: 8,
    location: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
  },
  {
    date: new Date('2005-08-15'),
    title: {
      de: 'Israelischer Abzug aus Gaza',
      en: 'Israeli Withdrawal from Gaza',
    },
    description: {
      de: 'Israel räumt alle Siedlungen im Gazastreifen. 8.000 Siedler werden evakuiert.',
      en: 'Israel evacuates all settlements in Gaza Strip. 8,000 settlers evacuated.',
    },
    category: 'other',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2006-01-25'),
    title: {
      de: 'Hamas gewinnt Parlamentswahlen',
      en: 'Hamas Wins Parliamentary Elections',
    },
    description: {
      de: 'Hamas gewinnt palästinensische Wahlen. Internationale Gemeinschaft isoliert Hamas-Regierung.',
      en: 'Hamas wins Palestinian elections. International community isolates Hamas government.',
    },
    category: 'other',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2006-07-12'),
    title: {
      de: 'Zweiter Libanonkrieg beginnt',
      en: 'Second Lebanon War Begins',
    },
    description: {
      de: 'Hisbollah entführt zwei israelische Soldaten. Israel startet Militäroffensive im Libanon.',
      en: 'Hezbollah kidnaps two Israeli soldiers. Israel launches military offensive in Lebanon.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2007-06-14'),
    title: {
      de: 'Hamas übernimmt Kontrolle in Gaza',
      en: 'Hamas Takes Control of Gaza',
    },
    description: {
      de: 'Hamas vertreibt Fatah gewaltsam aus Gaza. Spaltung zwischen Gaza und Westjordanland.',
      en: 'Hamas forcibly expels Fatah from Gaza. Split between Gaza and West Bank.',
    },
    category: 'other',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },

  // ============================================
  // Middle East: 2008-2009 Gaza War
  // ============================================
  {
    date: new Date('2008-06-19'),
    title: {
      de: 'Ägyptisch vermittelte Waffenruhe Gaza',
      en: 'Egypt-Mediated Gaza Ceasefire',
    },
    description: {
      de: 'Sechsmonatige Waffenruhe zwischen Israel und Hamas. Endet im Dezember.',
      en: 'Six-month ceasefire between Israel and Hamas. Ends in December.',
    },
    category: 'diplomacy',
    severity: 6,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2008-12-27'),
    title: {
      de: 'Operation Cast Lead beginnt',
      en: 'Operation Cast Lead Begins',
    },
    description: {
      de: 'Israel startet Luftangriffe auf Gaza nach Raketenbeschuss. 22-tägiger Krieg.',
      en: 'Israel launches airstrikes on Gaza after rocket fire. 22-day war.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2009-09-24'),
    title: {
      de: 'Goldstone-Bericht veröffentlicht',
      en: 'Goldstone Report Published',
    },
    description: {
      de: 'UN-Untersuchung wirft Israel und Hamas Kriegsverbrechen in Gaza vor.',
      en: 'UN investigation accuses Israel and Hamas of war crimes in Gaza.',
    },
    category: 'other',
    severity: 7,
  },

  // ============================================
  // Middle East: 2010s Arab Spring & Multiple Gaza Conflicts
  // ============================================
  {
    date: new Date('2010-12-17'),
    title: {
      de: 'Arabischer Frühling beginnt',
      en: 'Arab Spring Begins',
    },
    description: {
      de: 'Selbstverbrennung in Tunesien löst Protestwelle im Nahen Osten aus.',
      en: 'Self-immolation in Tunisia triggers wave of protests across Middle East.',
    },
    category: 'protest',
    severity: 8,
  },
  {
    date: new Date('2011-03-15'),
    title: {
      de: 'Syrischer Bürgerkrieg beginnt',
      en: 'Syrian Civil War Begins',
    },
    description: {
      de: 'Proteste in Syrien eskalieren zum Bürgerkrieg. Regionaler Konflikt entsteht.',
      en: 'Protests in Syria escalate into civil war. Regional conflict emerges.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2011-10-18'),
    title: {
      de: 'Gilad Shalit freigelassen',
      en: 'Gilad Shalit Released',
    },
    description: {
      de: 'Israelischer Soldat nach 5 Jahren Hamas-Gefangenschaft gegen 1.027 Palästinenser ausgetauscht.',
      en: 'Israeli soldier exchanged for 1,027 Palestinians after 5 years in Hamas captivity.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2012-11-14'),
    title: {
      de: 'Operation Pillar of Defense',
      en: 'Operation Pillar of Defense',
    },
    description: {
      de: 'Achttägiger Konflikt zwischen Israel und Hamas. Ägypten vermittelt Waffenstillstand.',
      en: 'Eight-day conflict between Israel and Hamas. Egypt mediates ceasefire.',
    },
    category: 'military',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2012-11-29'),
    title: {
      de: 'Palästina erhält UN-Beobachterstatus',
      en: 'Palestine Granted UN Observer Status',
    },
    description: {
      de: 'UN-Vollversammlung erkennt Palästina als Beobachterstaat an. Israel protestiert.',
      en: 'UN General Assembly recognizes Palestine as observer state. Israel protests.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 40.7128, lng: -74.0060, name: 'New York' },
  },
  {
    date: new Date('2013-07-29'),
    title: {
      de: 'Kerry-Initiative für Friedensgespräche',
      en: 'Kerry Initiative for Peace Talks',
    },
    description: {
      de: 'US-Außenminister Kerry vermittelt Wiederaufnahme direkter Verhandlungen.',
      en: 'US Secretary of State Kerry mediates resumption of direct negotiations.',
    },
    category: 'diplomacy',
    severity: 6,
  },
  {
    date: new Date('2014-04-23'),
    title: {
      de: 'Fatah-Hamas Versöhnungsabkommen',
      en: 'Fatah-Hamas Reconciliation Agreement',
    },
    description: {
      de: 'Fatah und Hamas vereinbaren Bildung einer Einheitsregierung. Scheitert später.',
      en: 'Fatah and Hamas agree to form unity government. Later fails.',
    },
    category: 'diplomacy',
    severity: 6,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2014-07-08'),
    title: {
      de: 'Operation Protective Edge beginnt',
      en: 'Operation Protective Edge Begins',
    },
    description: {
      de: '50-tägiger Gaza-Krieg. Über 2.100 Tote, hauptsächlich Palästinenser.',
      en: '50-day Gaza war. Over 2,100 dead, mostly Palestinians.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2015-09-30'),
    title: {
      de: 'Russische Intervention in Syrien',
      en: 'Russian Intervention in Syria',
    },
    description: {
      de: 'Russland beginnt Luftangriffe zur Unterstützung Assad-Regimes.',
      en: 'Russia begins airstrikes in support of Assad regime.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2016-12-23'),
    title: {
      de: 'UN-Resolution 2334 gegen Siedlungen',
      en: 'UN Resolution 2334 Against Settlements',
    },
    description: {
      de: 'Sicherheitsrat verurteilt israelische Siedlungen. USA enthalten sich erstmals.',
      en: 'Security Council condemns Israeli settlements. USA abstains for first time.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 40.7128, lng: -74.0060, name: 'New York' },
  },
  {
    date: new Date('2017-12-06'),
    title: {
      de: 'USA erkennen Jerusalem als Hauptstadt an',
      en: 'USA Recognizes Jerusalem as Capital',
    },
    description: {
      de: 'Trump erkennt Jerusalem als israelische Hauptstadt an. Arabische Welt protestiert.',
      en: 'Trump recognizes Jerusalem as Israeli capital. Arab world protests.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2018-03-30'),
    title: {
      de: 'Großer Rückkehrmarsch beginnt',
      en: 'Great March of Return Begins',
    },
    description: {
      de: 'Wöchentliche Proteste an Gaza-Grenze für Rückkehrrecht. Über 200 Tote bis Ende 2019.',
      en: 'Weekly protests at Gaza border for right of return. Over 200 dead by end of 2019.',
    },
    category: 'protest',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2018-05-14'),
    title: {
      de: 'US-Botschaft nach Jerusalem verlegt',
      en: 'US Embassy Moved to Jerusalem',
    },
    description: {
      de: 'USA verlegen Botschaft von Tel Aviv nach Jerusalem. Proteste in Gaza.',
      en: 'USA relocates embassy from Tel Aviv to Jerusalem. Protests in Gaza.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  },
  {
    date: new Date('2019-03-25'),
    title: {
      de: 'Trump erkennt Golanhöhen als israelisch an',
      en: 'Trump Recognizes Golan Heights as Israeli',
    },
    description: {
      de: 'USA erkennen als erstes Land israelische Souveränität über Golanhöhen an.',
      en: 'USA becomes first country to recognize Israeli sovereignty over Golan Heights.',
    },
    category: 'diplomacy',
    severity: 7,
  },

  // ============================================
  // Middle East: 2020s Abraham Accords & Recent Escalations
  // ============================================
  {
    date: new Date('2020-01-28'),
    title: {
      de: 'Trump präsentiert Friedensplan',
      en: 'Trump Presents Peace Plan',
    },
    description: {
      de: '"Deal des Jahrhunderts" ohne palästinensische Beteiligung. Von Palästinensern abgelehnt.',
      en: '"Deal of the Century" without Palestinian participation. Rejected by Palestinians.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2020-08-13'),
    title: {
      de: 'Abraham-Abkommen angekündigt',
      en: 'Abraham Accords Announced',
    },
    description: {
      de: 'VAE normalisieren Beziehungen zu Israel. Erste Golf-Staat-Normalisierung seit Jahrzehnten.',
      en: 'UAE normalizes relations with Israel. First Gulf state normalization in decades.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi' },
  },
  {
    date: new Date('2020-09-15'),
    title: {
      de: 'Abraham-Abkommen unterzeichnet',
      en: 'Abraham Accords Signed',
    },
    description: {
      de: 'Israel, VAE und Bahrain unterzeichnen Normalisierungsabkommen im Weißen Haus.',
      en: 'Israel, UAE and Bahrain sign normalization agreements at White House.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2020-12-10'),
    title: {
      de: 'Marokko normalisiert Beziehungen',
      en: 'Morocco Normalizes Relations',
    },
    description: {
      de: 'Marokko als viertes arabisches Land normalisiert Beziehungen zu Israel.',
      en: 'Morocco becomes fourth Arab country to normalize relations with Israel.',
    },
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2021-05-10'),
    title: {
      de: 'Gaza-Israel Konflikt Mai 2021',
      en: 'Gaza-Israel Conflict May 2021',
    },
    description: {
      de: 'Elftägiger Konflikt nach Spannungen in Sheikh Jarrah und auf Tempelberg.',
      en: 'Eleven-day conflict after tensions in Sheikh Jarrah and Temple Mount.',
    },
    category: 'military',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2021-05-21'),
    title: {
      de: 'Waffenruhe nach Mai-Konflikt',
      en: 'Ceasefire After May Conflict',
    },
    description: {
      de: 'Ägypten vermittelt Waffenruhe nach elftägigem Konflikt.',
      en: 'Egypt mediates ceasefire after eleven-day conflict.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2021-08-26'),
    title: {
      de: 'Bennett trifft Biden',
      en: 'Bennett Meets Biden',
    },
    description: {
      de: 'Erster offizieller Besuch des neuen israelischen Premierministers in USA.',
      en: 'First official visit of new Israeli Prime Minister to USA.',
    },
    category: 'diplomacy',
    severity: 5,
    location: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  },
  {
    date: new Date('2022-03-27'),
    title: {
      de: 'Negev-Gipfel',
      en: 'Negev Summit',
    },
    description: {
      de: 'Außenminister von Israel, USA, VAE, Bahrain, Marokko, Ägypten treffen sich.',
      en: 'Foreign ministers of Israel, USA, UAE, Bahrain, Morocco, Egypt meet.',
    },
    category: 'diplomacy',
    severity: 6,
  },
  {
    date: new Date('2022-08-05'),
    title: {
      de: 'Operation Breaking Dawn',
      en: 'Operation Breaking Dawn',
    },
    description: {
      de: 'Dreitägige militärische Auseinandersetzung zwischen Israel und Islamischem Dschihad.',
      en: 'Three-day military confrontation between Israel and Islamic Jihad.',
    },
    category: 'military',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-01-26'),
    title: {
      de: 'Jenin-Razzia',
      en: 'Jenin Raid',
    },
    description: {
      de: 'Israelische Razzia in Jenin-Flüchtlingslager. Neun Palästinenser getötet.',
      en: 'Israeli raid on Jenin refugee camp. Nine Palestinians killed.',
    },
    category: 'military',
    severity: 7,
    location: { lat: 32.4600, lng: 35.3000, name: 'Jenin' },
  },
  {
    date: new Date('2023-03-09'),
    title: {
      de: 'Justizreform-Proteste in Israel',
      en: 'Judicial Reform Protests in Israel',
    },
    description: {
      de: 'Massenproteste gegen Netanyahus Justizreform. Gesellschaftliche Spaltung.',
      en: "Mass protests against Netanyahu's judicial reform. Social division.",
    },
    category: 'protest',
    severity: 6,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2023-03-15'),
    title: {
      de: 'Israel-Saudi-Arabien Annäherung',
      en: 'Israel-Saudi Arabia Rapprochement',
    },
    description: {
      de: 'Berichte über Fortschritte bei Normalisierungsverhandlungen zwischen Israel und Saudi-Arabien.',
      en: 'Reports of progress in normalization negotiations between Israel and Saudi Arabia.',
    },
    category: 'diplomacy',
    severity: 7,
  },
  {
    date: new Date('2023-05-09'),
    title: {
      de: 'Operation Shield and Arrow',
      en: 'Operation Shield and Arrow',
    },
    description: {
      de: 'Fünftägiger Konflikt zwischen Israel und Islamischem Dschihad in Gaza.',
      en: 'Five-day conflict between Israel and Islamic Jihad in Gaza.',
    },
    category: 'military',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-10-07'),
    title: {
      de: 'Hamas-Angriff auf Israel',
      en: 'Hamas Attack on Israel',
    },
    description: {
      de: 'Überraschungsangriff der Hamas. Über 1.200 Israelis getötet, 240 entführt. Größter Angriff seit 1973.',
      en: 'Surprise Hamas attack. Over 1,200 Israelis killed, 240 kidnapped. Largest attack since 1973.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-10-08'),
    title: {
      de: 'Israel erklärt Kriegszustand',
      en: 'Israel Declares State of War',
    },
    description: {
      de: 'Israel erklärt offiziell Krieg und beginnt Mobilisierung von Reservisten.',
      en: 'Israel officially declares war and begins mobilizing reserves.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2023-10-27'),
    title: {
      de: 'Israelische Bodenoffensive in Gaza',
      en: 'Israeli Ground Offensive in Gaza',
    },
    description: {
      de: 'IDF beginnt Bodenoperationen im Gazastreifen nach drei Wochen Luftangriffen.',
      en: 'IDF begins ground operations in Gaza Strip after three weeks of airstrikes.',
    },
    category: 'military',
    severity: 10,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-11-24'),
    title: {
      de: 'Erste Waffenruhe und Geiselfreilassung',
      en: 'First Ceasefire and Hostage Release',
    },
    description: {
      de: 'Viertägige humanitäre Waffenruhe. Hamas lässt 105 Geiseln frei, Israel 240 Palästinenser.',
      en: 'Four-day humanitarian ceasefire. Hamas releases 105 hostages, Israel 240 Palestinians.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2023-12-01'),
    title: {
      de: 'Kämpfe werden fortgesetzt',
      en: 'Fighting Resumes',
    },
    description: {
      de: 'Nach Ende der Waffenruhe werden Kämpfe intensiviert. Fokus auf Südgaza.',
      en: 'After ceasefire ends, fighting intensifies. Focus on southern Gaza.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2024-01-26'),
    title: {
      de: 'ICJ-Urteil zu Völkermord-Vorwürfen',
      en: 'ICJ Ruling on Genocide Allegations',
    },
    description: {
      de: 'Internationaler Gerichtshof fordert Israel auf, Völkermord in Gaza zu verhindern.',
      en: 'International Court of Justice orders Israel to prevent genocide in Gaza.',
    },
    category: 'diplomacy',
    severity: 8,
  },
  {
    date: new Date('2024-02-12'),
    title: {
      de: 'Rafah-Offensive angekündigt',
      en: 'Rafah Offensive Announced',
    },
    description: {
      de: 'Israel plant Offensive auf Rafah trotz 1,4 Millionen Zivilisten dort.',
      en: 'Israel plans offensive on Rafah despite 1.4 million civilians there.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 31.2765, lng: 34.2458, name: 'Rafah' },
  },
  {
    date: new Date('2024-04-01'),
    title: {
      de: 'Iranischer Angriff auf israelische Botschaft',
      en: 'Strike on Iranian Consulate',
    },
    description: {
      de: 'Israel bombardiert iranisches Konsulat in Damaskus. Sieben Militärberater getötet.',
      en: 'Israel bombs Iranian consulate in Damascus. Seven military advisors killed.',
    },
    category: 'military',
    severity: 8,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2024-04-13'),
    title: {
      de: 'Iran greift Israel direkt an',
      en: 'Iran Directly Attacks Israel',
    },
    description: {
      de: 'Erstmals direkter iranischer Angriff auf Israel mit über 300 Drohnen und Raketen.',
      en: 'First direct Iranian attack on Israel with over 300 drones and missiles.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2024-05-07'),
    title: {
      de: 'Rafah-Offensive beginnt',
      en: 'Rafah Offensive Begins',
    },
    description: {
      de: 'Israel startet Bodenoffensive in Rafah trotz internationaler Kritik.',
      en: 'Israel launches ground offensive in Rafah despite international criticism.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 31.2765, lng: 34.2458, name: 'Rafah' },
  },
  {
    date: new Date('2024-05-20'),
    title: {
      de: 'ICC beantragt Haftbefehle',
      en: 'ICC Requests Arrest Warrants',
    },
    description: {
      de: 'Internationaler Strafgerichtshof beantragt Haftbefehle gegen Netanyahu und Hamas-Führer.',
      en: 'International Criminal Court requests arrest warrants for Netanyahu and Hamas leaders.',
    },
    category: 'diplomacy',
    severity: 8,
  },
  {
    date: new Date('2024-07-31'),
    title: {
      de: 'Ismail Haniyeh in Teheran getötet',
      en: 'Ismail Haniyeh Killed in Tehran',
    },
    description: {
      de: 'Hamas-Führer bei mutmaßlichem israelischem Angriff in Iran getötet.',
      en: 'Hamas leader killed in suspected Israeli attack in Iran.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  },
  {
    date: new Date('2024-09-17'),
    title: {
      de: 'Pager-Angriffe im Libanon',
      en: 'Pager Attacks in Lebanon',
    },
    description: {
      de: 'Tausende Pager von Hisbollah-Mitgliedern explodieren. Israelische Operation vermutet.',
      en: 'Thousands of Hezbollah pagers explode. Israeli operation suspected.',
    },
    category: 'military',
    severity: 8,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2024-09-27'),
    title: {
      de: 'Hassan Nasrallah getötet',
      en: 'Hassan Nasrallah Killed',
    },
    description: {
      de: 'Hisbollah-Führer bei israelischem Luftangriff in Beirut getötet.',
      en: 'Hezbollah leader killed in Israeli airstrike in Beirut.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2024-10-01'),
    title: {
      de: 'Iranische Raketenoffensive auf Israel',
      en: 'Iranian Missile Offensive on Israel',
    },
    description: {
      de: 'Iran feuert über 180 ballistische Raketen auf Israel als Vergeltung.',
      en: 'Iran fires over 180 ballistic missiles at Israel in retaliation.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  },
  {
    date: new Date('2024-10-26'),
    title: {
      de: 'Israelische Vergeltungsschläge gegen Iran',
      en: 'Israeli Retaliatory Strikes on Iran',
    },
    description: {
      de: 'Israel greift militärische Ziele im Iran an. Regionaler Konflikt eskaliert.',
      en: 'Israel strikes military targets in Iran. Regional conflict escalates.',
    },
    category: 'military',
    severity: 9,
    location: { lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  },
  {
    date: new Date('2024-11-27'),
    title: {
      de: 'Waffenruhe Israel-Hisbollah',
      en: 'Israel-Hezbollah Ceasefire',
    },
    description: {
      de: '60-tägige Waffenruhe zwischen Israel und Hisbollah vereinbart.',
      en: '60-day ceasefire between Israel and Hezbollah agreed.',
    },
    category: 'diplomacy',
    severity: 7,
    location: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  },
  {
    date: new Date('2024-12-08'),
    title: {
      de: 'Sturz Assad-Regimes in Syrien',
      en: 'Fall of Assad Regime in Syria',
    },
    description: {
      de: 'Rebellenallianz erobert Damaskus. Assad flieht nach Russland. Ende 54-jähriger Herrschaft.',
      en: 'Rebel alliance captures Damascus. Assad flees to Russia. End of 54-year rule.',
    },
    category: 'other',
    severity: 10,
    location: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  },
  {
    date: new Date('2025-01-15'),
    title: {
      de: 'Gaza-Waffenruhe und Geiselabkommen',
      en: 'Gaza Ceasefire and Hostage Deal',
    },
    description: {
      de: 'Waffenruhe zwischen Israel und Hamas. Schrittweise Freilassung von 33 Geiseln gegen palästinensische Gefangene.',
      en: 'Ceasefire between Israel and Hamas. Gradual release of 33 hostages for Palestinian prisoners.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
  {
    date: new Date('2025-01-19'),
    title: {
      de: 'Waffenruhe tritt in Kraft',
      en: 'Ceasefire Takes Effect',
    },
    description: {
      de: 'Nach 15 Monaten Krieg beginnt erste Phase der Waffenruhe. Humanitäre Hilfe erreicht Gaza.',
      en: 'After 15 months of war, first phase of ceasefire begins. Humanitarian aid reaches Gaza.',
    },
    category: 'diplomacy',
    severity: 8,
    location: { lat: 31.5, lng: 34.47, name: 'Gaza' },
  },
];

/**
 * Get historical events sorted by date (newest first)
 * Returns legacy TimelineEvent format (German text as default)
 */
export function getHistoricalEvents(): TimelineEvent[] {
  return HISTORICAL_EVENTS.map((event, index) => ({
    ...event,
    id: `historical-${index}`,
    // Convert i18n to legacy format (German as default)
    title: typeof event.title === 'object' ? event.title.de : event.title,
    description: typeof event.description === 'object' ? event.description.de : event.description,
    sources: [],
    relatedArticles: [],
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get historical events with full i18n support
 * Returns TimelineEventI18n format with both DE and EN text
 */
export function getHistoricalEventsI18n(): TimelineEventI18n[] {
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
export function getHistoricalEventsByCategory(category: 'military' | 'diplomacy' | 'humanitarian' | 'protest' | 'other' | 'economic'): TimelineEvent[] {
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
