import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Radio, AlertTriangle, ExternalLink } from 'lucide-react';
import type { NewsArticle, NewsSource, PerspectiveRegion, ApiResponse } from '../types';
import { cn } from '../lib/utils';

// Country coordinates
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  UK: { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
  US: { lat: 38.9072, lng: -77.0369, name: 'United States' },
  DE: { lat: 52.5200, lng: 13.4050, name: 'Germany' },
  IL: { lat: 31.7683, lng: 35.2137, name: 'Israel' },
  PS: { lat: 31.9522, lng: 35.2332, name: 'Palestine' },
  QA: { lat: 25.2854, lng: 51.5310, name: 'Qatar' },
  IR: { lat: 35.6892, lng: 51.3890, name: 'Iran' },
  EG: { lat: 30.0444, lng: 31.2357, name: 'Egypt' },
  LB: { lat: 33.8938, lng: 35.5018, name: 'Lebanon' },
  TR: { lat: 39.9334, lng: 32.8597, name: 'Turkey' },
  RU: { lat: 55.7558, lng: 37.6173, name: 'Russia' },
  CN: { lat: 39.9042, lng: 116.4074, name: 'China' },
  HK: { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
};

// Conflict zones with neon colors
const CONFLICT_LOCATIONS = [
  { lat: 31.5, lng: 34.47, name: 'Gaza', type: 'critical', severity: '#ff0044' },
  { lat: 33.8547, lng: 35.8623, name: 'Beirut', type: 'high', severity: '#ff6600' },
  { lat: 33.5138, lng: 36.2765, name: 'Damascus', type: 'high', severity: '#ff6600' },
  { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv', type: 'medium', severity: '#ffee00' },
  { lat: 31.7683, lng: 35.2137, name: 'Jerusalem', type: 'medium', severity: '#ffee00' },
];

// Neon perspective colors
const REGION_COLORS: Record<PerspectiveRegion, string> = {
  usa: '#00f0ff',
  europa: '#bf00ff',
  deutschland: '#000000',
  nahost: '#ff6600',
  tuerkei: '#ff0044',
  russland: '#dc2626',
  china: '#ffee00',
  asien: '#06b6d4',
  afrika: '#84cc16',
  lateinamerika: '#f59e0b',
  ozeanien: '#14b8a6',
  kanada: '#ef4444',
  alternative: '#00ff88',
};

interface CountryData {
  country: string;
  coords: { lat: number; lng: number; name: string };
  articleCount: number;
  sources: NewsSource[];
  regions: Set<PerspectiveRegion>;
  recentArticles: NewsArticle[];
}

async function fetchNews(): Promise<ApiResponse<NewsArticle[]>> {
  const response = await fetch('/api/news?limit=200');
  if (!response.ok) throw new Error('Failed to fetch news');
  return response.json();
}

async function fetchSources(): Promise<ApiResponse<NewsSource[]>> {
  const response = await fetch('/api/news/sources');
  if (!response.ok) throw new Error('Failed to fetch sources');
  return response.json();
}

// Set map bounds component
function MapBounds() {
  const map = useMap();
  useEffect(() => {
    map.setView([32, 35], 4);
  }, [map]);
  return null;
}

export function LeafletMapEmbed() {
  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['map-news'],
    queryFn: fetchNews,
    staleTime: 2 * 60 * 1000,
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: fetchSources,
    staleTime: 10 * 60 * 1000,
  });

  const countryData = useMemo(() => {
    if (!newsData?.data || !sourcesData?.data) return [];

    const dataByCountry = new Map<string, CountryData>();

    for (const source of sourcesData.data) {
      const coords = COUNTRY_COORDS[source.country];
      if (!coords) continue;

      if (!dataByCountry.has(source.country)) {
        dataByCountry.set(source.country, {
          country: source.country,
          coords,
          articleCount: 0,
          sources: [],
          regions: new Set(),
          recentArticles: [],
        });
      }

      const existing = dataByCountry.get(source.country)!;
      dataByCountry.set(source.country, {
        ...existing,
        sources: [...existing.sources, source],
        regions: new Set([...existing.regions, source.region]),
      });
    }

    for (const article of newsData.data) {
      const country = article.source.country;
      if (dataByCountry.has(country)) {
        const existing = dataByCountry.get(country)!;
        dataByCountry.set(country, {
          ...existing,
          articleCount: existing.articleCount + 1,
          recentArticles:
            existing.recentArticles.length < 3
              ? [...existing.recentArticles, article]
              : existing.recentArticles,
        });
      }
    }

    return Array.from(dataByCountry.values()).filter((d) => d.articleCount > 0);
  }, [newsData, sourcesData]);

  const isLoading = newsLoading || sourcesLoading;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center">
          <Radio className="h-10 w-10 text-[#00f0ff] mx-auto mb-4 animate-pulse" />
          <p className="text-sm font-mono text-[#00f0ff]/50 uppercase tracking-widest">
            Loading map data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative" style={{ backgroundColor: '#0a0e1a' }}>
      <MapContainer
        center={[32, 35]}
        zoom={4}
        style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
        className="z-0 leaflet-cyber"
      >
        {/* Dark cyber-style tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        />
        <MapBounds />

        {/* Conflict zone markers with pulsing effect */}
        {CONFLICT_LOCATIONS.map((loc) => (
          <CircleMarker
            key={loc.name}
            center={[loc.lat, loc.lng]}
            radius={loc.type === 'critical' ? 15 : 10}
            pathOptions={{
              color: loc.severity,
              fillColor: loc.severity,
              fillOpacity: 0.4,
              weight: 2,
              className: loc.type === 'critical' ? 'marker-pulse' : '',
            }}
          >
            <Popup className="cyber-popup">
              <div className="font-mono text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" style={{ color: loc.severity }} />
                  <strong className="text-white">{loc.name}</strong>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold',
                    loc.type === 'critical' && 'bg-[#ff0044]/20 text-[#ff0044]',
                    loc.type === 'high' && 'bg-[#ff6600]/20 text-[#ff6600]',
                    loc.type === 'medium' && 'bg-[#ffee00]/20 text-[#ffee00]'
                  )}
                >
                  {loc.type} Zone
                </span>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* News source markers */}
        {countryData.map((data) => {
          const primaryRegion = Array.from(data.regions)[0];
          const color = REGION_COLORS[primaryRegion];
          const radius = Math.min(8 + Math.sqrt(data.articleCount) * 2, 25);

          return (
            <CircleMarker
              key={data.country}
              center={[data.coords.lat, data.coords.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.5,
                weight: 2,
              }}
            >
              <Popup className="cyber-popup">
                <div className="min-w-[200px] font-mono text-sm">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                    <strong className="text-white">{data.coords.name}</strong>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${color}30`, color }}
                    >
                      {data.articleCount} signals
                    </span>
                  </div>

                  <div className="text-gray-400 text-xs mb-2">
                    <span className="text-gray-500">Sources:</span> {data.sources.map((s) => s.name).join(', ')}
                  </div>

                  {data.recentArticles.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Latest:</p>
                      {data.recentArticles.map((article) => (
                        <a
                          key={article.id}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs hover:text-[#00f0ff] transition-colors"
                          style={{ color }}
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{article.title.slice(0, 50)}...</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map overlay with legend */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel rounded-lg p-3">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Perspectives</div>
        <div className="space-y-1">
          {Object.entries(REGION_COLORS).map(([region, color]) => {
            const labels: Record<string, string> = {
              usa: 'USA',
              europa: 'Europa',
              deutschland: 'Deutschland',
              nahost: 'Nahost',
              tuerkei: 'Türkei',
              russland: 'Russland',
              china: 'China',
              asien: 'Asien',
              afrika: 'Afrika',
              lateinamerika: 'Lateinamerika',
              ozeanien: 'Ozeanien',
              kanada: 'Kanada',
              alternative: 'Alternative',
            };
            return (
              <div key={region} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-mono text-gray-400">
                  {labels[region] || region}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
