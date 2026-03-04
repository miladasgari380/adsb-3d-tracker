import React, { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { PathLayer } from '@deck.gl/layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { GLTFLoader } from '@loaders.gl/gltf';
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ProcessedFlight } from '../hooks/useFlightData';

interface FlightMapProps {
    flights: ProcessedFlight[];
    viewState: any;
    onViewStateChange: (e: any) => void;
    selectedFlightId: string | null;
    onSelectFlight: (id: string | null) => void;
}

// Mapbox dark style (using maplibre as a free alternative)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// GLB Model of an Airplane
const AIRPLANE_MODEL = '/models/airplane.glb';

// Lighting config for the 3D models
const ambientLight = new AmbientLight({
    color: [255, 255, 255],
    intensity: 1.0
});

const directionalLight = new DirectionalLight({
    color: [255, 255, 255],
    intensity: 2.0,
    direction: [-3, -1, -5]
});

const lightingEffect = new LightingEffect({ ambientLight, directionalLight });

export const FlightMap: React.FC<FlightMapProps> = ({
    flights,
    viewState,
    onViewStateChange,
    selectedFlightId,
    onSelectFlight
}) => {
    // Convert altitude to color (Warmer = higher)
    const getAltitudeColor = (alt: number): [number, number, number, number] => {
        const maxAlt = 40000;
        const ratio = Math.max(0, Math.min(1, alt / maxAlt));
        return [
            Math.floor(255 * ratio),          // R: increases with altitude
            Math.floor(255 * (1 - Math.abs(ratio - 0.5) * 2)), // G: peaks in middle
            Math.floor(255 * (1 - ratio)),    // B: decreases with altitude
            255
        ];
    };

    const layers = useMemo(() => {
        return [
            // Draw trails behind the planes
            new PathLayer({
                id: 'flight-paths',
                data: flights,
                pickable: true,
                widthScale: 20,
                widthMinPixels: 2,
                getPath: d => d.trajectory,
                getColor: d => {
                    const color = getAltitudeColor(d.alt_baro || 0);
                    return d.id === selectedFlightId ? [255, 255, 0, 255] : color;
                },
                getWidth: d => d.id === selectedFlightId ? 5 : 2,
            }),

            // Draw the 3D plane models
            new ScenegraphLayer({
                id: 'flight-models',
                data: flights,
                pickable: true,
                scenegraph: AIRPLANE_MODEL,
                _lighting: 'pbr', // Use Physcially Based Rendering for the 3D model
                loaders: [GLTFLoader],
                sizeScale: Math.pow(2, 15 - (viewState.zoom || 9)),
                getPosition: d => [d.lon || 0, d.lat || 0, d.alt_baro || 0],
                getOrientation: d => [0, -d.track || 0, 90], // [pitch, yaw, roll] adjusting for true north
                getColor: d => {
                    if (d.id === selectedFlightId) return [255, 255, 0, 255]; // Yellow if selected
                    return getAltitudeColor(d.alt_baro || 0); // Color by alt
                },
                onClick: ({ object }) => {
                    if (object) onSelectFlight(object.id);
                }
            })
        ];
    }, [flights, selectedFlightId]);

    return (
        <div className="absolute inset-0 w-full h-full bg-slate-900">
            <DeckGL
                layers={layers}
                viewState={viewState}
                onViewStateChange={onViewStateChange}
                controller={true}
                getTooltip={({ object }) => object && (object.flight || object.hex)}
                effects={[lightingEffect]}
            >
                <Map
                    reuseMaps
                    mapStyle={MAP_STYLE}
                    attributionControl={false}
                />
            </DeckGL>
        </div>
    );
};
