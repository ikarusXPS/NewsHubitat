import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe2, Filter } from 'lucide-react';
import { GlobeView } from '../components/GlobeView';
import { cn } from '../lib/utils';

import type { GeoEvent } from '../types';

interface ConflictPoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  intensity: number;
  type: 'military' | 'humanitarian' | 'diplomatic' | 'protest';
  description: string;
  articleCount: number;
}

const EVENT_TYPES = [
  { id: 'all', label: 'Alle', color: 'gray' },
  { id: 'military', label: 'Militärisch', color: 'red' },
  { id: 'humanitarian', label: 'Humanitär', color: 'green' },
  { id: 'diplomatic', label: 'Diplomatisch', color: 'blue' },
  { id: 'protest', label: 'Proteste', color: 'yellow' },
];

export function Globe() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPoint, setSelectedPoint] = useState<ConflictPoint | null>(null);

  const handlePointClick = (point: GeoEvent) => {
    // Convert GeoEvent to ConflictPoint for display
    const conflictPoint: ConflictPoint = {
      id: point.id,
      lat: point.location.lat,
      lng: point.location.lng,
      name: point.location.name,
      intensity: point.severity === 'critical' ? 10 : point.severity === 'high' ? 7 : point.severity === 'medium' ? 5 : 3,
      type: point.category as 'military' | 'humanitarian' | 'diplomatic' | 'protest',
      description: point.description,
      articleCount: point.sourceArticles?.length || 0,
    };
    setSelectedPoint(conflictPoint);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe2 className="h-7 w-7 text-blue-400" />
            3D Konflikt-Heatmap
          </h1>
          <p className="text-gray-400 mt-1">
            Interaktive Visualisierung der Konfliktzonen im Nahen Osten
          </p>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          {EVENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                selectedType === type.id
                  ? type.id === 'military' ? 'bg-red-600 text-white' :
                    type.id === 'humanitarian' ? 'bg-green-600 text-white' :
                    type.id === 'diplomatic' ? 'bg-blue-600 text-white' :
                    type.id === 'protest' ? 'bg-yellow-600 text-white' :
                    'bg-gray-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Globe */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-[500px] rounded-2xl overflow-hidden border border-gray-700/50"
      >
        <GlobeView
          onPointClick={handlePointClick}
          className="h-full w-full"
        />
      </motion.div>

      {/* Info panel */}
      {selectedPoint && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-white">{selectedPoint.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{selectedPoint.description}</p>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-gray-400 hover:text-white p-1"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              <strong className="text-white">{selectedPoint.articleCount}</strong> verwandte Artikel
            </span>
            <span className="text-gray-400">
              Intensität: <strong className="text-white">{selectedPoint.intensity}/10</strong>
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
