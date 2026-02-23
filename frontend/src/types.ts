export interface County {
  fips: string;
  name: string;
  state: string;
  full: string;
}

export type LayerType = 'healthcare' | 'food' | 'transit' | 'news';

export interface TractProperties {
  geoid: string;
  name: string;
  gap_score: number;
  vulnerability: number;
  poverty_rate: number;
  age_vulnerability: number;
  no_vehicle_rate: number;
  dist_km: number;
  centroid_lat?: number;
  centroid_lon?: number;
  outlet_density?: number;
  outlet_count?: number;
}

export interface TopTract extends TractProperties {}

export interface GapGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: GeoJSON.Geometry;
    properties: TractProperties;
  }>;
}
