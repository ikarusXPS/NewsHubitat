import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import * as THREE from 'three';
import { useMapCenter } from '../hooks/useMapCenter';
import type { GeoEvent } from '../types';
import { logger } from '../lib/logger';

interface GlobeViewProps {
  points?: GeoEvent[];                    // Optional: external data (keeps backward compat)
  onPointClick?: (point: GeoEvent) => void;
  className?: string;
  isLoading?: boolean;                    // Optional: external loading state
  focusEventId?: string | null;           // External control to zoom to specific event
  useInternalQuery?: boolean;             // NEW: when true, fetch data internally
}

// Cyber-styled colors matching the UI theme - Based on EventCategory
const CATEGORY_COLORS: Record<string, string> = {
  conflict: '#ff0044',     // Critical red (was military)
  military: '#ff0044',     // Critical red
  humanitarian: '#ff6600', // Warning orange
  political: '#00f0ff',    // Cyber blue (was diplomatic)
  diplomatic: '#00f0ff',   // Cyber blue
  economic: '#bf00ff',     // Purple
  protest: '#00ff88',      // Success green
};

export function GlobeView({
  points: externalPoints,
  onPointClick,
  className,
  isLoading: externalLoading = false,
  focusEventId,
  useInternalQuery = false,
}: GlobeViewProps) {
  const mapCenter = useMapCenter();

  // Internal query for independent data fetching
  const { data: internalData, isLoading: internalLoading } = useQuery({
    queryKey: ['geo-events'],
    queryFn: async () => {
      const res = await fetch('/api/events/geo');
      if (!res.ok) throw new Error('Failed to fetch geo events');
      const json = await res.json();
      return json.data as GeoEvent[];
    },
    enabled: useInternalQuery,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });

  // Use internal data if useInternalQuery, otherwise use external props
  const points = useMemo(
    () => useInternalQuery ? (internalData ?? []) : (externalPoints ?? []),
    [useInternalQuery, internalData, externalPoints]
  );
  const isLoading = useInternalQuery ? internalLoading : externalLoading;
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globe.gl returns complex untyped object
  const globeRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<GeoEvent | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GeoEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [autoRotate, setAutoRotate] = useState(false); // No auto-rotation by default
  const cameraAltitudeRef = useRef(2.5); // Use ref to avoid re-renders

  // Helper: Convert severity to intensity (1-10 scale)
  const getIntensity = (severity: string): number => {
    switch (severity) {
      case 'critical': return 10;
      case 'high': return 7;
      case 'medium': return 5;
      case 'low': return 3;
      default: return 5;
    }
  };

  // LOD: Get geometry detail based on camera distance
  const getLODGeometry = (altitude: number) => {
    // High detail when zoomed in (altitude < 1.5)
    if (altitude < 1.5) {
      return {
        cylinderSegments: 32,
        sphereSegments: 16,
        ringSegments: 32,
      };
    }
    // Medium detail (1.5 <= altitude < 3)
    if (altitude < 3) {
      return {
        cylinderSegments: 16,
        sphereSegments: 12,
        ringSegments: 24,
      };
    }
    // Low detail when zoomed out (altitude >= 3)
    return {
      cylinderSegments: 8,
      sphereSegments: 8,
      ringSegments: 16,
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Capture ref value for cleanup
    const container = containerRef.current;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globe.gl returns complex untyped object
    let globe: any = null;
    let animationFrameId: number;
    let clickHandler: ((event: MouseEvent) => void) | null = null;
    let mouseMoveHandler: ((event: MouseEvent) => void) | null = null;

    const initGlobe = async () => {
      try {
        // Expose THREE to window for globe.gl compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).THREE = THREE;

        const GlobeGL = (await import('globe.gl')).default;

        globe = new GlobeGL(containerRef.current!)
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg') // Night view like worldmonitor
          .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
          .showAtmosphere(true)
          .atmosphereColor('#00f0ff')
          .atmosphereAltitude(0.15)
          .enablePointerInteraction(true)
          // 3D Custom Objects - Standing markers
          .customLayerData(points as object[])
          .customThreeObject((d: object) => {
            const point = d as GeoEvent;
            const intensity = getIntensity(point.severity);
            const color = CATEGORY_COLORS[point.category] || CATEGORY_COLORS.political;
            const lod = getLODGeometry(cameraAltitudeRef.current);

            // Create a group for the entire marker
            const group = new THREE.Group();

            // 1. Base cylinder (pin base) - LOD segments
            const baseHeight = 0.05 + (intensity * 0.02);
            const baseRadius = 0.15;
            const baseGeometry = new THREE.CylinderGeometry(
              baseRadius,
              baseRadius * 1.2,
              baseHeight,
              lod.cylinderSegments
            );
            const baseMaterial = new THREE.MeshPhongMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.3,
              transparent: true,
              opacity: 0.9,
            });
            const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
            baseMesh.position.y = baseHeight / 2;
            group.add(baseMesh);

            // 2. Pin stem (vertical line) - LOD segments
            const stemHeight = 0.2 + (intensity * 0.05);
            const stemGeometry = new THREE.CylinderGeometry(
              0.03,
              0.03,
              stemHeight,
              Math.max(8, lod.cylinderSegments / 2)
            );
            const stemMaterial = new THREE.MeshPhongMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.5,
              transparent: true,
              opacity: 0.85,
            });
            const stemMesh = new THREE.Mesh(stemGeometry, stemMaterial);
            stemMesh.position.y = baseHeight + stemHeight / 2;
            group.add(stemMesh);

            // 3. Top marker (sphere) - LOD segments
            const topSize = 0.08 + (intensity * 0.02);
            const topGeometry = new THREE.SphereGeometry(
              topSize,
              lod.sphereSegments,
              lod.sphereSegments
            );
            const topMaterial = new THREE.MeshPhongMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.8,
              transparent: true,
              opacity: 1,
            });
            const topMesh = new THREE.Mesh(topGeometry, topMaterial);
            topMesh.position.y = baseHeight + stemHeight;
            group.add(topMesh);

            // 4. Pulsing glow ring around base - LOD segments
            const ringGeometry = new THREE.RingGeometry(
              baseRadius * 1.5,
              baseRadius * 1.8,
              lod.ringSegments
            );
            const ringMaterial = new THREE.MeshBasicMaterial({
              color,
              transparent: true,
              opacity: 0.4,
              side: THREE.DoubleSide,
            });
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.position.y = 0.01;
            group.add(ringMesh);

            // 5. Add text label (floating above marker) - Only at high/medium LOD
            if (cameraAltitudeRef.current < 3) {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              canvas.width = 512;
              canvas.height = 128;
              context.fillStyle = color;
              context.font = 'bold 48px monospace';
              context.textAlign = 'center';
              context.fillText(point.location.name, 256, 64);

              const texture = new THREE.CanvasTexture(canvas);
              const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
              });
              const sprite = new THREE.Sprite(spriteMaterial);
              sprite.scale.set(0.8, 0.2, 1);
              sprite.position.y = baseHeight + stemHeight + 0.3;
              group.add(sprite);
            }

            // Store the event data directly on the group for raycasting
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Custom property on THREE.Group
            (group as any).__eventData = point;
            return group;
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globe.gl callback signature
          .customThreeObjectUpdate((obj: any, d: object) => {
            // Update stored event data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (obj as any).__eventData = d;
            if (obj.__globeObjData) {
              Object.assign(obj.__globeObjData, d);
            }
          })
          .width(containerRef.current!.clientWidth)
          .height(containerRef.current!.clientHeight);

        // Add pulsing rings - ONLY for critical and high severity events (performance optimization)
        const highPriorityEvents = points.filter(p =>
          p.severity === 'critical' || p.severity === 'high'
        );

        globe
          .ringsData(highPriorityEvents as object[])
          .ringLat((d: object) => (d as GeoEvent).location.lat)
          .ringLng((d: object) => (d as GeoEvent).location.lng)
          .ringAltitude(0.001)
          .ringMaxRadius((d: object) => {
            const intensity = getIntensity((d as GeoEvent).severity);
            return 1.5 + (intensity * 0.2); // Larger rings
          })
          .ringPropagationSpeed((d: object) => {
            const intensity = getIntensity((d as GeoEvent).severity);
            return 2 + (intensity * 0.3); // Faster propagation
          })
          .ringRepeatPeriod((d: object) => {
            const intensity = getIntensity((d as GeoEvent).severity);
            return 1500 - (intensity * 100); // More frequent
          })
          .ringColor((d: object) => {
            const color = CATEGORY_COLORS[(d as GeoEvent).category] || CATEGORY_COLORS.political;
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return (t: number) => `rgba(${r}, ${g}, ${b}, ${(1 - t) * 0.6})`;
          });

        // Arcs removed - too confusing for users
        globe.arcsData([]);

        // Add hex grid overlay (worldmonitor.app style) - Only when zoomed out for performance
        const hexData = cameraAltitudeRef.current > 1.8 ? points : [];
        globe
          .hexBinPointsData(hexData as object[])
          .hexBinPointLat((d: object) => (d as GeoEvent).location.lat)
          .hexBinPointLng((d: object) => (d as GeoEvent).location.lng)
          .hexBinPointWeight((d: object) => getIntensity((d as GeoEvent).severity))
          .hexAltitude(0.001)
          .hexBinResolution(4)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globe.gl hex callback
          .hexTopColor((d: any) => {
            const avgCategory = d.points[0].category;
            const color = CATEGORY_COLORS[avgCategory] || CATEGORY_COLORS.political;
            return `${color}40`; // Transparent hex
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globe.gl hex callback
          .hexSideColor((d: any) => {
            const avgCategory = d.points[0].category;
            const color = CATEGORY_COLORS[avgCategory] || CATEGORY_COLORS.political;
            return `${color}20`;
          })
          .hexBinMerge(true)
          .enablePointerInteraction(true);

        // Click handler for custom objects
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        clickHandler = (event: MouseEvent) => {
          const canvas = containerRef.current?.querySelector('canvas');
          if (!canvas) return;

          const rect = canvas.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, globe.camera());

          // Find custom objects with event data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- THREE.Object3D with custom props
          const customObjects = globe.scene().children.filter((obj: any) => {
            const data = obj.__globeObjData || obj.__eventData;
            return data && points.some(p => p.id === data.id);
          });

          const intersects = raycaster.intersectObjects(customObjects, true);

          if (intersects.length > 0) {
            const clickedObj = intersects[0].object;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- THREE.Object3D with custom props
            let parent: any = clickedObj;
            // Traverse up to find parent with event data
            while (parent && !parent.__globeObjData && !parent.__eventData) {
              parent = parent.parent;
            }

            const eventData = parent?.__globeObjData || parent?.__eventData;
            if (eventData) {
              const point = eventData as GeoEvent;
              setSelectedPoint(point);
              onPointClick?.(point);
              globe.pointOfView({ lat: point.location.lat, lng: point.location.lng, altitude: 1.5 }, 1000);
            }
          }
        };

        containerRef.current?.addEventListener('click', clickHandler);

        // Hover handler for tooltips
        mouseMoveHandler = (event: MouseEvent) => {
          const canvas = containerRef.current?.querySelector('canvas');
          if (!canvas) return;

          const rect = canvas.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, globe.camera());

          // Find custom objects with event data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- THREE.Object3D with custom props
          const customObjects = globe.scene().children.filter((obj: any) => {
            const data = obj.__globeObjData || obj.__eventData;
            return data && points.some(p => p.id === data.id);
          });

          const intersects = raycaster.intersectObjects(customObjects, true);

          if (intersects.length > 0) {
            const hoveredObj = intersects[0].object;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- THREE.Object3D with custom props
            let parent: any = hoveredObj;
            // Traverse up to find parent with event data
            while (parent && !parent.__globeObjData && !parent.__eventData) {
              parent = parent.parent;
            }

            const eventData = parent?.__globeObjData || parent?.__eventData;
            if (eventData) {
              const point = eventData as GeoEvent;
              setHoveredPoint(point);
              setTooltipPosition({ x: event.clientX, y: event.clientY });
              document.body.style.cursor = 'pointer';
            }
          } else {
            setHoveredPoint(null);
            setTooltipPosition(null);
            document.body.style.cursor = 'default';
          }
        };

        containerRef.current?.addEventListener('mousemove', mouseMoveHandler);

        // Set initial view based on active focus
        globe.pointOfView({ lat: mapCenter.lat, lng: mapCenter.lng, altitude: 2.5 }, 1000);

        // Configure controls
        const controls = globe.controls();
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 0.5;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.0;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.minDistance = 101; // Prevent getting too close (globe radius is 100)
        controls.maxDistance = 500; // Prevent getting too far

        globeRef.current = globe;
        setIsInitializing(false);

        // LOD: Monitor camera altitude and update markers when LOD level changes
        let lastLODLevel = 1; // 0=high, 1=medium, 2=low
        const getLODLevel = (altitude: number) => {
          if (altitude < 1.5) return 0;
          if (altitude < 3) return 1;
          return 2;
        };

        const updateLoop = () => {
          if (globe) {
            const pov = globe.pointOfView();
            const currentAltitude = pov.altitude || 2.5;
            const currentLODLevel = getLODLevel(currentAltitude);

            // Update altitude ref
            cameraAltitudeRef.current = currentAltitude;

            // Recreate markers if LOD level changed
            if (currentLODLevel !== lastLODLevel) {
              lastLODLevel = currentLODLevel;
              globe.customLayerData(globe.customLayerData()); // Trigger re-render
            }
          }
          animationFrameId = requestAnimationFrame(updateLoop);
        };

        updateLoop();
      } catch (error) {
        logger.error('Failed to initialize globe:', error);
        setIsInitializing(false);
      }
    };

    initGlobe();

    // Handle resize
    const handleResize = () => {
      if (globeRef.current && containerRef.current) {
        globeRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (clickHandler) {
        container?.removeEventListener('click', clickHandler);
      }
      if (mouseMoveHandler) {
        container?.removeEventListener('mousemove', mouseMoveHandler);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (globe) {
        globe._destructor?.();
      }
    };
  }, [points, onPointClick, autoRotate, mapCenter]);

  // Effect to handle external focus event (e.g., clicking Recent Events)
  useEffect(() => {
    if (focusEventId && globeRef.current && points.length > 0) {
      const event = points.find(p => p.id === focusEventId);
      if (event) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- External event trigger requires state update
        setSelectedPoint(event);
        globeRef.current.pointOfView(
          { lat: event.location.lat, lng: event.location.lng, altitude: 1.5 },
          1000
        );
        onPointClick?.(event);
      }
    }
  }, [focusEventId, points, onPointClick]);

  const handleZoomIn = () => {
    if (globeRef.current) {
      const currentPov = globeRef.current.pointOfView();
      globeRef.current.pointOfView({ ...currentPov, altitude: currentPov.altitude * 0.7 }, 500);
    }
  };

  const handleZoomOut = () => {
    if (globeRef.current) {
      const currentPov = globeRef.current.pointOfView();
      globeRef.current.pointOfView({ ...currentPov, altitude: currentPov.altitude * 1.4 }, 500);
    }
  };

  const handleReset = () => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: mapCenter.lat, lng: mapCenter.lng, altitude: 2.5 }, 1000);
      setSelectedPoint(null);
    }
  };

  const toggleAutoRotate = () => {
    setAutoRotate((prev) => {
      if (globeRef.current) {
        globeRef.current.controls().autoRotate = !prev;
      }
      return !prev;
    });
  };

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-gray-900', className)}>
      {/* Globe container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading overlay - Cyber styled */}
      {(isInitializing || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
            <span className="text-sm font-mono text-[#00f0ff]/70 uppercase tracking-wider">
              {isLoading ? 'Loading Events...' : 'Loading Globe...'}
            </span>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredPoint && tooltipPosition && !selectedPoint && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 15}px`,
            top: `${tooltipPosition.y + 15}px`,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg bg-[#0a0e1a]/95 border border-[#00f0ff]/30 p-2.5 backdrop-blur-sm max-w-xs"
            style={{ boxShadow: '0 0 15px rgba(0,240,255,0.2)' }}
          >
            <h5 className="text-xs font-mono font-medium text-white mb-1">{hoveredPoint.title}</h5>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400">
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: CATEGORY_COLORS[hoveredPoint.category],
                  boxShadow: `0 0 4px ${CATEGORY_COLORS[hoveredPoint.category]}`,
                }}
              />
              <span className="uppercase">{hoveredPoint.severity}</span>
              <span className="text-gray-600">•</span>
              <span>{hoveredPoint.location.name}</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Controls - Cyber styled */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute right-4 top-4 flex flex-col gap-1.5"
      >
        <button
          onClick={handleZoomIn}
          className="rounded-md bg-[#0a0e1a]/90 border border-[#00f0ff]/30 p-2 text-[#00f0ff]/70 backdrop-blur-sm hover:border-[#00f0ff] hover:text-[#00f0ff] transition-all"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="rounded-md bg-[#0a0e1a]/90 border border-[#00f0ff]/30 p-2 text-[#00f0ff]/70 backdrop-blur-sm hover:border-[#00f0ff] hover:text-[#00f0ff] transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="rounded-md bg-[#0a0e1a]/90 border border-[#00f0ff]/30 p-2 text-[#00f0ff]/70 backdrop-blur-sm hover:border-[#00f0ff] hover:text-[#00f0ff] transition-all"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={toggleAutoRotate}
          className={cn(
            'rounded-md p-2 backdrop-blur-sm transition-all border',
            autoRotate
              ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
              : 'bg-[#0a0e1a]/90 border-[#00f0ff]/30 text-[#00f0ff]/70 hover:border-[#00f0ff] hover:text-[#00f0ff]'
          )}
          title={autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
        >
          <RotateCcw className={cn('h-4 w-4', autoRotate && 'animate-spin')} style={{ animationDuration: '3s' }} />
        </button>
      </motion.div>

      {/* Legend - Cyber styled */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-4 rounded-lg bg-[#0a0e1a]/90 border border-[#00f0ff]/20 p-3 backdrop-blur-sm"
      >
        <h4 className="mb-2 text-[10px] font-mono text-[#00f0ff]/70 uppercase tracking-wider">Event Categories</h4>
        <div className="space-y-1">
          {(['conflict', 'humanitarian', 'political', 'economic', 'protest'] as const).map((category) => (
            <div key={category} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[category], boxShadow: `0 0 6px ${CATEGORY_COLORS[category]}` }}
              />
              <span className="text-[10px] font-mono text-gray-400 capitalize">
                {category}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Selected point info - Cyber styled */}
      {selectedPoint && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute left-4 top-4 max-w-xs rounded-lg bg-[#0a0e1a]/95 border border-[#00f0ff]/30 p-4 backdrop-blur-sm"
          style={{ boxShadow: '0 0 20px rgba(0,240,255,0.1)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-mono font-medium text-white">{selectedPoint.title}</h4>
              <p className="mt-1 text-xs font-mono text-gray-400">{selectedPoint.description}</p>
              <p className="mt-1 text-xs font-mono text-[#00f0ff]/70">{selectedPoint.location.name}</p>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-gray-500 hover:text-[#ff0044] transition-colors text-lg"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-mono uppercase border"
              style={{
                backgroundColor: `${CATEGORY_COLORS[selectedPoint.category]}15`,
                color: CATEGORY_COLORS[selectedPoint.category],
                borderColor: `${CATEGORY_COLORS[selectedPoint.category]}40`
              }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[selectedPoint.category], boxShadow: `0 0 4px ${CATEGORY_COLORS[selectedPoint.category]}` }}
              />
              {selectedPoint.category}
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {selectedPoint.sourceArticles.length} sources
            </span>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] font-mono text-gray-500">
              <span>Severity</span>
              <span style={{ color: CATEGORY_COLORS[selectedPoint.category] }} className="uppercase">{selectedPoint.severity}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${getIntensity(selectedPoint.severity) * 10}%`,
                  backgroundColor: CATEGORY_COLORS[selectedPoint.category],
                  boxShadow: `0 0 8px ${CATEGORY_COLORS[selectedPoint.category]}`
                }}
              />
            </div>
          </div>
        </motion.div>
      )}


      {/* Globe tooltip styles - Cyber themed */}
      <style>{`
        .globe-tooltip {
          background: rgba(10, 14, 26, 0.95);
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(0, 240, 255, 0.3);
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: white;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
        }
        .globe-tooltip strong {
          color: #00f0ff;
        }
        .globe-tooltip small {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
