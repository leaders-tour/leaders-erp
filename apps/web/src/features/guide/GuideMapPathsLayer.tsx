import { useEffect, useRef } from 'react';
import {
  buildGuideMapPathLayerKey,
  buildGuidePathPolylineOptions,
  canDrawGuidePath,
  simplifyGuideMapPath,
  type GuideMapLatLng,
} from './guide-location-map-utils';

export interface GuideMapPathLayer {
  guideId: string;
  path: GuideMapLatLng[];
  color: string;
  focused: boolean;
  dimmed: boolean;
}

interface StoredPolyline {
  polyline: google.maps.Polyline;
}

export function GuideMapPathsLayer({
  map,
  layers,
}: {
  map: google.maps.Map | null;
  layers: GuideMapPathLayer[];
}): null {
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const polylinesRef = useRef<Map<string, StoredPolyline>>(new Map());
  const layersKey = buildGuideMapPathLayerKey(layers);

  useEffect(() => {
    if (!map) {
      return;
    }

    const activeGuideIds = new Set<string>();

    for (const layer of layersRef.current) {
      if (!canDrawGuidePath(layer.path)) {
        continue;
      }

      activeGuideIds.add(layer.guideId);
      const existing = polylinesRef.current.get(layer.guideId);
      if (existing) {
        existing.polyline.setMap(null);
      }

      polylinesRef.current.set(layer.guideId, {
        polyline: new google.maps.Polyline({
          ...buildGuidePathPolylineOptions(layer),
          path: simplifyGuideMapPath(layer.path),
          map,
        }),
      });
    }

    for (const [guideId, stored] of polylinesRef.current) {
      if (!activeGuideIds.has(guideId)) {
        stored.polyline.setMap(null);
        polylinesRef.current.delete(guideId);
      }
    }
  }, [map, layersKey]);

  useEffect(() => {
    return () => {
      for (const stored of polylinesRef.current.values()) {
        stored.polyline.setMap(null);
      }
      polylinesRef.current.clear();
    };
  }, []);

  return null;
}
