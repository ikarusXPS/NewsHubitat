import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { NewsArticle, NewsSource, PerspectiveRegion, ApiResponse } from '../types';
import { cn } from '../lib/utils';
import { useMapCenter } from '../hooks/useMapCenter';

// Country coordinates for news source countries
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  // Western
  UK: { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
  US: { lat: 38.9072, lng: -77.0369, name: 'United States' },
  DE: { lat: 52.5200, lng: 13.4050, name: 'Germany' },
  // Middle East
  IL: { lat: 31.7683, lng: 35.2137, name: 'Israel' },
  PS: { lat: 31.9522, lng: 35.2332, name: 'Palestine' },
  QA: { lat: 25.2854, lng: 51.5310, name: 'Qatar' },
  IR: { lat: 35.6892, lng: 51.3890, name: 'Iran' },
  EG: { lat: 30.0444, lng: 31.2357, name: 'Egypt' },
  LB: { lat: 33.8938, lng: 35.5018, name: 'Lebanon' },
  // Turkish
  TR: { lat: 39.9334, lng: 32.8597, name: 'Turkey' },
  // Russian
  RU: { lat: 55.7558, lng: 37.6173, name: 'Russia' },
  // Chinese
  CN: { lat: 39.9042, lng: 116.4074, name: 'China' },
  HK: { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
};

// Region colors matching the CSS theme
const REGION_COLORS: Record<PerspectiveRegion, string> = {
  usa: '#3b82f6',
  europa: '#8b5cf6',
  deutschland: '#000000',
  nahost: '#f97316',
  tuerkei: '#ef4444',
  russland: '#dc2626',
  china: '#eab308',
  asien: '#06b6d4',
  afrika: '#84cc16',
  lateinamerika: '#f59e0b',
  ozeanien: '#14b8a6',
  kanada: '#ef4444',
  alternative: '#22c55e',
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

// Component to set map bounds dynamically based on active focus
function MapBounds() {
  const map = useMap();
  const mapCenter = useMapCenter();

  useEffect(() => {
    map.setView([mapCenter.lat, mapCenter.lng], mapCenter.zoom);
  }, [map, mapCenter]);

  return null;
}

export function MapView() {
  const mapCenter = useMapCenter();

  const { data: newsData, isLoading: newsLoading, error: newsError, refetch } = useQuery({
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

    // Initialize with sources
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

    // Count articles by source country
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
  const error = newsError;

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Konflikt-Karte</h1>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-400">Fehler beim Laden der Karte</p>
          <button
            onClick={() => refetch()}
            className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Konflikt-Karte</h1>
          <p className="text-gray-400">
            Geografische Visualisierung der Nachrichtenquellen und Ereignisse.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Aktualisieren
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <span className="text-sm text-gray-400">Perspektiven:</span>
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
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-300">
                {labels[region] || region}
              </span>
            </div>
          );
        })}
      </div>

      {/* Map Container */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex h-[500px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapCenter.zoom}
            style={{ height: '500px', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            />
            <MapBounds />

            {/* Country markers with article counts */}
            {countryData.map((data) => {
              const primaryRegion = Array.from(data.regions)[0];
              const color = REGION_COLORS[primaryRegion];
              const radius = Math.min(8 + Math.sqrt(data.articleCount) * 3, 30);

              return (
                <CircleMarker
                  key={data.country}
                  center={[data.coords.lat, data.coords.lng]}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.6,
                    weight: 2,
                  }}
                >
                  <Popup className="dark-popup">
                    <div className="min-w-48 text-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <strong className="text-base">{data.coords.name}</strong>
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium">
                          {data.articleCount} Artikel
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-gray-500">Quellen: </span>
                        <span>{data.sources.map((s) => s.name).join(', ')}</span>
                      </div>

                      {data.recentArticles.length > 0 && (
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <p className="text-xs text-gray-500 mb-1">Neueste Meldungen:</p>
                          <ul className="space-y-1">
                            {data.recentArticles.map((article) => (
                              <li key={article.id} className="text-xs truncate">
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {article.title.slice(0, 60)}...
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { region: 'usa' as PerspectiveRegion, label: 'USA' },
          { region: 'europa' as PerspectiveRegion, label: 'Europa' },
          { region: 'nahost' as PerspectiveRegion, label: 'Nahost' },
          { region: 'deutschland' as PerspectiveRegion, label: 'Deutschland' },
        ].map(({ region, label }) => {
          const count = countryData
            .filter((d) => d.regions.has(region))
            .reduce((sum, d) => sum + d.articleCount, 0);

          return (
            <div
              key={region}
              className="rounded-lg border border-gray-700 bg-gray-800 p-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: REGION_COLORS[region] }}
                />
                <span className="text-sm text-gray-400">{label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-gray-500">Artikel</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
