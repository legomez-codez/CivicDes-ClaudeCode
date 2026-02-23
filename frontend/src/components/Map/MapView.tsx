import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { County, GapGeoJSON } from '../../types';
import { MAPBOX_TOKEN, MAPBOX_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from '../../lib/mapbox';
import { useChoroplethLayer } from './ChoroplethLayer';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface Props {
  selectedCounty: County | null;
  gapData: GapGeoJSON | null;
}

export function MapView({ selectedCounty, gapData }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapReadyRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    map.on('load', () => {
      mapReadyRef.current = true;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
    };
  }, []);

  // Fly to county when selected
  useEffect(() => {
    if (!selectedCounty?.fips || !mapRef.current) return;

    const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
    fetch(`${API_BASE}/api/counties/${selectedCounty.fips}/boundary`)
      .then((r) => r.json())
      .then((geojson) => {
        if (!mapRef.current || !geojson.features?.length) return;
        const coords = geojson.features[0].geometry;
        // Compute bbox from GeoJSON
        const bounds = new mapboxgl.LngLatBounds();
        const addCoords = (coords: number[][] | number[][][]) => {
          if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
            (coords as number[][][]).forEach((ring) => ring.forEach(([lng, lat]) => bounds.extend([lng, lat])));
          } else if (Array.isArray(coords[0])) {
            (coords as number[][]).forEach(([lng, lat]) => bounds.extend([lng, lat]));
          }
        };
        if (coords.type === 'Polygon') addCoords(coords.coordinates[0]);
        else if (coords.type === 'MultiPolygon') {
          coords.coordinates.forEach((poly: number[][][]) => addCoords(poly[0]));
        }
        if (!bounds.isEmpty()) {
          mapRef.current.fitBounds(bounds, { padding: 40, duration: 1200 });
        }
      })
      .catch(() => {});
  }, [selectedCounty]);

  // Choropleth layer — must wait for map load
  const [mapReady, setMapReady] = React.useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.loaded()) {
      setMapReady(true);
      return;
    }
    const onLoad = () => setMapReady(true);
    map.on('load', onLoad);
    return () => { map.off('load', onLoad); };
  }, []);

  useChoroplethLayer({
    map: mapReady ? mapRef.current! : null as unknown as mapboxgl.Map,
    data: mapReady ? gapData : null,
  });

  return (
    <div ref={containerRef} className="flex-1 h-full" />
  );
}
