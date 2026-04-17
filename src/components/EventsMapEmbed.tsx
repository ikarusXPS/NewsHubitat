import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { AlertTriangle, Clock } from 'lucide-react';
import type { GeoEvent } from '../types';
import { cn } from '../lib/utils';

// Severity colors matching Monitor page
const SEVERITY_COLORS = {
  critical: '#ff0044',
  high: '#ff6600',
  medium: '#ffee00',
  low: '#00ff88',
};

interface EventsMapEmbedProps {
  events: GeoEvent[];
}

// Set map bounds component
function MapBounds() {
  const map = useMap();
  useEffect(() => {
    map.setView([32, 35], 4);
  }, [map]);
  return null;
}

export function EventsMapEmbed({ events }: EventsMapEmbedProps) {
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

        {/* Event markers */}
        {events.map((event) => {
          const color = SEVERITY_COLORS[event.severity];
          const radius = event.severity === 'critical' ? 15 : event.severity === 'high' ? 12 : 10;

          return (
            <CircleMarker
              key={event.id}
              center={[event.location.lat, event.location.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.4,
                weight: 2,
                className: event.severity === 'critical' ? 'marker-pulse' : '',
              }}
            >
              <Popup className="cyber-popup">
                <div className="min-w-[200px] font-mono text-sm">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                    <AlertTriangle className="h-4 w-4" style={{ color }} />
                    <strong className="text-white">{event.title}</strong>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 mb-2">
                    <span className="text-gray-500">Location:</span> {event.location.name}
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold',
                      event.severity === 'critical' && 'bg-[#ff0044]/20 text-[#ff0044]',
                      event.severity === 'high' && 'bg-[#ff6600]/20 text-[#ff6600]',
                      event.severity === 'medium' && 'bg-[#ffee00]/20 text-[#ffee00]',
                      event.severity === 'low' && 'bg-[#00ff88]/20 text-[#00ff88]'
                    )}
                  >
                    {event.severity} • {event.category}
                  </span>

                  {event.description && (
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {event.sourceArticles.length > 0 && (
                    <div className="text-[10px] text-gray-500 mt-2">
                      {event.sourceArticles.length} source{event.sourceArticles.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel rounded-lg p-3">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
          Severity
        </div>
        <div className="space-y-1">
          {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
            <div key={severity} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono text-gray-400 capitalize">
                {severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
