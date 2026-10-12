import { useEffect, useRef } from 'react';
import {
  buildGuidePathPolylineOptions,
  canDrawGuidePath,
  type GuideMapLatLng,
} from './guide-location-map-utils';

export interface GuideMapPathLayer {
  guideId: string;
  path: GuideMapLatLng[];
  color: string;
  focused: boolean;
  dimmed: boolean;
  arrows?: boolean;
}

interface StoredPolyline {
  polyline: google.maps.Polyline;
  color: string;
  focused: boolean;
  dimmed: boolean;
}

export function GuideMapPathsLayer({
  map,
  layers,
}: {
  map: google.maps.Map | null;
  layers: GuideMapPathLayer[];
}): null {
  const polylinesRef = useRef<Map<string, StoredPolyline>>(new Map());

  useEffect(() => {
    if (!map) {
      return;
    }

    const activeGuideIds = new Set<string>();

    for (const layer of layers) {
      if (!canDrawGuidePath(layer.path)) {
        const stale = polylinesRef.current.get(layer.guideId);
        if (stale) {
          stale.polyline.setMap(null);
          polylinesRef.current.delete(layer.guideId);
        }
        continue;
      }

      activeGuideIds.add(layer.guideId);
      const existing = polylinesRef.current.get(layer.guideId);
      const options = buildGuidePathPolylineOptions(layer);
      if (layer.arrows === false) {
        options.icons = [];
      }

      if (existing) {
        existing.polyline.setPath(layer.path);
        if (
          existing.color !== layer.color ||
          existing.focused !== layer.focused ||
          existing.dimmed !== layer.dimmed
        ) {
          existing.polyline.setOptions(options);
          existing.color = layer.color;
          existing.focused = layer.focused;
          existing.dimmed = layer.dimmed;
        }
        continue;
      }

      polylinesRef.current.set(layer.guideId, {
        polyline: new google.maps.Polyline({
          ...options,
          path: layer.path,
          map,
        }),
        color: layer.color,
        focused: layer.focused,
        dimmed: layer.dimmed,
      });
    }

    for (const [guideId, stored] of polylinesRef.current) {
      if (!activeGuideIds.has(guideId)) {
        stored.polyline.setMap(null);
        polylinesRef.current.delete(guideId);
      }
    }
  }, [map, layers]);

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
