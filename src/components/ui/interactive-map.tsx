import React, { useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color = 'blue', size = 'medium') => {
  const sizes: Record<string, [number, number]> = {
    small: [20, 32],
    medium: [25, 41],
    large: [30, 50]
  };

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: sizes[size],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Map event handler component
const MapEvents = ({ onMapClick, onLocationFound }: any) => {
  const map = useMapEvents({
    click: (e) => {
      onMapClick && onMapClick(e.latlng);
    },
    locationfound: (e) => {
      onLocationFound && onLocationFound(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return null;
};

// Custom control component
const CustomControls = ({ onLocate, onChangeBaseLayer, activeBaseLayer }: any) => {
  const map = useMap();

  useEffect(() => {
    const CustomControl = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create('div', 'custom-controls');
        // Styles for the dropdown effect
        const containerStyle = `
          background: white; 
          padding: 8px; 
          border-radius: 8px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
          min-width: 140px;
          transition: all 0.3s ease;
          overflow: hidden;
          height: 32px; /* Collapsed height */
        `;

        const expandedStyle = `
          height: auto;
        `;

        div.innerHTML = `
          <div id="controls-container" style="${containerStyle}">
            <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding-bottom: 4px;">
              <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Visualização</div>
              <div style="font-size: 10px; color: #64748b;">▼</div>
            </div>
            
            <div id="layer-options" style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
              <button id="btn-osm" class="map-layer-btn" style="text-align: left; padding: 6px 8px; border: none; border-radius: 4px; cursor: pointer; background: ${activeBaseLayer === 'osm' ? '#eff6ff' : 'transparent'}; color: ${activeBaseLayer === 'osm' ? '#2563eb' : '#334155'}; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                🗺️ Padrão (OSM)
              </button>
              
              <button id="btn-google-streets" class="map-layer-btn" style="text-align: left; padding: 6px 8px; border: none; border-radius: 4px; cursor: pointer; background: ${activeBaseLayer === 'google-streets' ? '#eff6ff' : 'transparent'}; color: ${activeBaseLayer === 'google-streets' ? '#2563eb' : '#334155'}; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                📍 Google Maps
              </button>

              <button id="btn-google-hybrid" class="map-layer-btn" style="text-align: left; padding: 6px 8px; border: none; border-radius: 4px; cursor: pointer; background: ${activeBaseLayer === 'google-hybrid' ? '#eff6ff' : 'transparent'}; color: ${activeBaseLayer === 'google-hybrid' ? '#2563eb' : '#334155'}; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                🛰️ Google Híbrido
              </button>
            </div>
          </div>
        `;

        L.DomEvent.disableClickPropagation(div);

        const container = div.querySelector('#controls-container');
        const btnOsm = div.querySelector('#btn-osm');
        const btnGoogleStreets = div.querySelector('#btn-google-streets');
        const btnGoogleHybrid = div.querySelector('#btn-google-hybrid');

        // Hover events to expand/collapse
        if (container) {
          const htmlContainer = container as HTMLElement;
          htmlContainer.addEventListener('mouseenter', () => {
            htmlContainer.style.height = 'auto';
          });
          htmlContainer.addEventListener('mouseleave', () => {
            htmlContainer.style.height = '32px';
          });
        }

        const handleLayerClick = (layer: string) => {
          onChangeBaseLayer(layer);
        };

        if (btnOsm) btnOsm.addEventListener('click', () => handleLayerClick('osm'));
        if (btnGoogleStreets) btnGoogleStreets.addEventListener('click', () => handleLayerClick('google-streets'));
        if (btnGoogleHybrid) btnGoogleHybrid.addEventListener('click', () => handleLayerClick('google-hybrid'));

        return div;
      }
    });

    const control = new CustomControl({ position: 'topright' });
    control.addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, onChangeBaseLayer, activeBaseLayer]);

  return null;
};

// Search component
const SearchControl = ({ onSearch }: any) => {
  const [query, setQuery] = useState('');
  const map = useMap();

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const results = await response.json();

      if (results.length > 0) {
        const { lat, lon, display_name } = results[0];
        const latLng: [number, number] = [parseFloat(lat), parseFloat(lon)];
        map.flyTo(latLng, 13);
        onSearch && onSearch({ latLng, name: display_name });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    const SearchControlClass = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create('div', 'search-control');
        div.innerHTML = `
          <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); display: flex; gap: 5px;">
            <input 
              id="search-input" 
              type="text" 
              placeholder="Buscar lugares..." 
              style="padding: 8px; border: 1px solid #ddd; border-radius: 3px; width: 200px;"
            />
            <button 
              id="search-btn" 
              style="padding: 8px 12px; border: none; border-radius: 3px; cursor: pointer; background: #007bff; color: white;"
            >
              🔍
            </button>
          </div>
        `;

        L.DomEvent.disableClickPropagation(div);

        const input = div.querySelector('#search-input') as HTMLInputElement;
        const button = div.querySelector('#search-btn');

        if (input) {
          input.addEventListener('input', (e) => setQuery((e.target as HTMLInputElement).value));
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
          });
        }
        if (button) button.addEventListener('click', handleSearch);

        return div;
      }
    });

    const control = new SearchControlClass({ position: 'topleft' });
    control.addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, query]);

  return null;
};

export interface MarkerData {
  id?: string | number;
  position: [number, number];
  color?: string;
  size?: string;
  icon?: L.Icon;
  popup?: {
    title: string;
    content: string;
    image?: string;
  };
}

export interface PolygonData {
  id?: string | number;
  positions: [number, number][];
  style?: L.PathOptions;
  popup?: string;
}

export interface CircleData {
  id?: string | number;
  center: [number, number];
  radius: number;
  style?: L.PathOptions;
  popup?: string;
}

export interface PolylineData {
  id?: string | number;
  positions: [number, number][];
  style?: L.PathOptions;
  popup?: string;
}

export interface AdvancedMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  polygons?: PolygonData[];
  circles?: CircleData[];
  polylines?: PolylineData[];
  onMarkerClick?: (marker: MarkerData) => void;
  onMapClick?: (latlng: L.LatLng) => void;
  enableClustering?: boolean;
  enableSearch?: boolean;
  enableControls?: boolean;
  enableDrawing?: boolean;
  className?: string;
  initialLayer?: 'osm' | 'google-streets' | 'google-hybrid';
  style?: React.CSSProperties;
}

// Component to handle automatic recentering
const RecenterAutomatically = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, {
      animate: true,
      duration: 1.5
    });
  }, [center, zoom, map]);

  return null;
};

// Main AdvancedMap component
export const AdvancedMap = ({
  center = [-15.7801, -47.9292], // Centro do Brasil (Brasília)
  zoom = 5,
  markers = [],
  polygons = [],
  circles = [],
  polylines = [],
  onMarkerClick,
  onMapClick,
  enableClustering = true,
  enableSearch = true,
  enableControls = true,
  enableDrawing = false,
  className = '',
  initialLayer = 'google-hybrid',
  style = { height: '500px', width: '100%' }
}: AdvancedMapProps) => {
  const [activeBaseLayer, setActiveBaseLayer] = useState<'osm' | 'google-streets' | 'google-hybrid'>(initialLayer);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchResult, setSearchResult] = useState<{ latLng: [number, number]; name: string } | null>(null);
  const [clickedLocation, setClickedLocation] = useState<L.LatLng | null>(null);

  // Handle layer toggling
  const handleChangeBaseLayer = useCallback((layer: 'osm' | 'google-streets' | 'google-hybrid') => {
    setActiveBaseLayer(layer);
  }, []);

  // Handle geolocation
  const handleLocate = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Handle map click
  const handleMapClick = useCallback((latlng: L.LatLng) => {
    setClickedLocation(latlng);
    onMapClick && onMapClick(latlng);
  }, [onMapClick]);

  // Handle search results
  const handleSearch = useCallback((result: { latLng: [number, number]; name: string }) => {
    setSearchResult(result);
  }, []);

  return (
    <div className={`advanced-map ${className}`} style={style}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <RecenterAutomatically center={center} zoom={zoom} />

        {/* Base tile layers */}
        {activeBaseLayer === 'osm' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {activeBaseLayer === 'google-streets' && (
          <TileLayer
            attribution='&copy; Google'
            url="http://mt0.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}"
            maxZoom={20}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
        )}

        {activeBaseLayer === 'google-hybrid' && (
          <TileLayer
            attribution='&copy; Google'
            url="http://mt0.google.com/vt/lyrs=y&hl=pt-BR&x={x}&y={y}&z={z}"
            maxZoom={20}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
        )}

        {/* Map events */}
        <MapEvents
          onMapClick={handleMapClick}
          onLocationFound={setUserLocation}
        />

        {/* Search control */}
        {enableSearch && <SearchControl onSearch={handleSearch} />}

        {/* Custom controls */}
        {enableControls && (
          <CustomControls
            onLocate={handleLocate}
            onChangeBaseLayer={handleChangeBaseLayer}
            activeBaseLayer={activeBaseLayer}
          />
        )}

        {/* Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={marker.id || index}
            position={marker.position}
            icon={marker.icon || createCustomIcon(marker.color, marker.size)}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(marker)
            }}
          >
            {marker.popup && (
              <Popup>
                <div>
                  <h3 className="font-semibold">{marker.popup.title}</h3>
                  <p className="text-sm">{marker.popup.content}</p>
                  {marker.popup.image && (
                    <img
                      src={marker.popup.image}
                      alt={marker.popup.title}
                      style={{ maxWidth: '200px', height: 'auto' }}
                    />
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        ))}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={createCustomIcon('red', 'medium')}
          >
            <Popup>Sua localização atual</Popup>
          </Marker>
        )}

        {/* Search result marker */}
        {searchResult && (
          <Marker
            position={searchResult.latLng}
            icon={createCustomIcon('green', 'large')}
          >
            <Popup>{searchResult.name}</Popup>
          </Marker>
        )}

        {/* Clicked location marker */}
        {clickedLocation && (
          <Marker
            position={[clickedLocation.lat, clickedLocation.lng]}
            icon={createCustomIcon('orange', 'small')}
          >
            <Popup>
              Lat: {clickedLocation.lat.toFixed(6)}<br />
              Lng: {clickedLocation.lng.toFixed(6)}
            </Popup>
          </Marker>
        )}

        {/* Polygons */}
        {polygons.map((polygon, index) => (
          <Polygon
            key={polygon.id || index}
            positions={polygon.positions}
            pathOptions={polygon.style || { color: 'purple', weight: 2, fillOpacity: 0.3 }}
          >
            {polygon.popup && <Popup>{polygon.popup}</Popup>}
          </Polygon>
        ))}

        {/* Circles */}
        {circles.map((circle, index) => (
          <Circle
            key={circle.id || index}
            center={circle.center}
            radius={circle.radius}
            pathOptions={circle.style || { color: 'blue', weight: 2, fillOpacity: 0.2 }}
          >
            {circle.popup && <Popup>{circle.popup}</Popup>}
          </Circle>
        ))}

        {/* Polylines */}
        {polylines.map((polyline, index) => (
          <Polyline
            key={polyline.id || index}
            positions={polyline.positions}
            pathOptions={polyline.style || { color: 'red', weight: 3 }}
          >
            {polyline.popup && <Popup>{polyline.popup}</Popup>}
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
};