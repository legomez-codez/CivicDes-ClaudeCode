import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { GapGeoJSON } from '../../types';
import { buildFillColorExpression } from '../../lib/colors';

const SOURCE_ID = 'gap-tracts';
const FILL_LAYER = 'gap-fill';
const LINE_LAYER = 'gap-outline';
const POPUP_LAYER = FILL_LAYER;

interface Props {
  map: mapboxgl.Map;
  data: GapGeoJSON | null;
}

export function useChoroplethLayer({ map, data }: Props) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map || !data) return;

    // Remove existing layers/source
    [FILL_LAYER, LINE_LAYER].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    // Add source
    map.addSource(SOURCE_ID, { type: 'geojson', data });

    // Fill layer
    map.addLayer({
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': buildFillColorExpression(),
        'fill-opacity': 0.75,
      },
    });

    // Outline layer
    map.addLayer({
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#ffffff',
        'line-width': 0.5,
        'line-opacity': 0.6,
      },
    });

    // Hover popup
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });
    popupRef.current = popup;

    map.on('mousemove', POPUP_LAYER, (e) => {
      if (!e.features?.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties!;
      const isNews = props.outlet_count !== undefined && props.outlet_count !== null;
      const accessLine = isNews
        ? `<p>News outlets: <strong>${props.outlet_count}</strong> (${Number(props.outlet_density).toFixed(2)}/100k)</p>`
        : `<p>Dist to service: ${Number(props.dist_km).toFixed(2)}km</p>`;
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div>
            <p class="font-semibold">${props.name || props.geoid}</p>
            <p>Gap score: <strong>${Number(props.gap_score).toFixed(1)}</strong></p>
            <p>Poverty: ${(Number(props.poverty_rate) * 100).toFixed(1)}%</p>
            <p>Age 65+: ${(Number(props.age_vulnerability) * 100).toFixed(1)}%</p>
            <p>No vehicle: ${(Number(props.no_vehicle_rate) * 100).toFixed(1)}%</p>
            ${accessLine}
          </div>`
        )
        .addTo(map);
    });

    map.on('mouseleave', POPUP_LAYER, () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    return () => {
      popup.remove();
      map.off('mousemove', POPUP_LAYER, () => {});
      map.off('mouseleave', POPUP_LAYER, () => {});
      [FILL_LAYER, LINE_LAYER].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, data]);
}
