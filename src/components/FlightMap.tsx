import React, { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { PathLayer } from '@deck.gl/layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { GLTFLoader } from '@loaders.gl/gltf';
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';
import { FlyToInterpolator } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import { Plus, Minus, Compass, RotateCcw, RotateCw } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ProcessedFlight } from '../hooks/useFlightData';

interface FlightMapProps {
    flights: ProcessedFlight[];
    viewState: any;
    onViewStateChange: (e: any) => void;
    selectedFlightId: string | null;
    onSelectFlight: (id: string | null) => void;
    mapStyle: string;
    showMap: boolean;
    mapColor: string;
}

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
    onSelectFlight,
    mapStyle,
    showMap,
    mapColor
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
        <div
            className="absolute inset-0 w-full h-full transition-colors duration-500"
            style={{ backgroundColor: showMap ? '#0f172a' : mapColor }}
        >
            <DeckGL
                layers={layers}
                viewState={viewState}
                onViewStateChange={onViewStateChange}
                controller={{
                    touchRotate: true,
                    dragRotate: true,
                    scrollZoom: true,
                    dragPan: true,
                    doubleClickZoom: true,
                    keyboard: true
                }}
                getTooltip={({ object }) => object && (object.flight || object.hex)}
                effects={[lightingEffect]}
            >
                <Map
                    reuseMaps
                    mapStyle={showMap ? mapStyle : { version: 8, sources: {}, layers: [] }}
                    attributionControl={false}
                    onMove={(e) => onViewStateChange({ viewState: e.viewState })}
                />
            </DeckGL>

            {/* Custom DeckGL Navigation Controls */}
            <div className="absolute bottom-10 right-6 flex flex-col z-20 bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <button
                    className="p-3 hover:bg-white/10 transition-colors border-b border-white/5 disabled:opacity-50"
                    onClick={() => onViewStateChange({
                        viewState: {
                            ...viewState,
                            zoom: Math.min((viewState.zoom || 9) + 1, 20),
                            transitionDuration: 300,
                            transitionInterpolator: new FlyToInterpolator()
                        }
                    })}
                >
                    <Plus className="w-5 h-5 text-slate-300" />
                </button>
                <button
                    className="p-3 hover:bg-white/10 transition-colors border-b border-white/5 disabled:opacity-50"
                    onClick={() => onViewStateChange({
                        viewState: {
                            ...viewState,
                            zoom: Math.max((viewState.zoom || 9) - 1, 1),
                            transitionDuration: 300,
                            transitionInterpolator: new FlyToInterpolator()
                        }
                    })}
                >
                    <Minus className="w-5 h-5 text-slate-300" />
                </button>
                <button
                    className="p-3 hover:bg-white/10 transition-colors border-b border-white/5 disabled:opacity-50 tooltip peer group relative"
                    onClick={() => onViewStateChange({
                        viewState: {
                            ...viewState,
                            bearing: (viewState.bearing || 0) - 45,
                            transitionDuration: 300,
                            transitionInterpolator: new FlyToInterpolator()
                        }
                    })}
                >
                    <RotateCcw className="w-5 h-5 text-slate-300" />
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Rotate Left
                    </div>
                </button>
                <button
                    className="p-3 hover:bg-white/10 transition-colors border-b border-white/5 disabled:opacity-50 tooltip peer group relative"
                    onClick={() => onViewStateChange({
                        viewState: {
                            ...viewState,
                            bearing: (viewState.bearing || 0) + 45,
                            transitionDuration: 300,
                            transitionInterpolator: new FlyToInterpolator()
                        }
                    })}
                >
                    <RotateCw className="w-5 h-5 text-slate-300" />
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Rotate Right
                    </div>
                </button>
                <button
                    className="p-3 hover:bg-white/10 transition-colors tooltip peer group relative"
                    onClick={() => onViewStateChange({
                        viewState: {
                            ...viewState,
                            bearing: 0,
                            pitch: 0,
                            transitionDuration: 800,
                            transitionInterpolator: new FlyToInterpolator()
                        }
                    })}
                >
                    <Compass
                        className="w-5 h-5 text-slate-300 transition-transform duration-200"
                        style={{ transform: `rotate(${-viewState.bearing || 0}deg)` }}
                    />
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Reset Bearing & Pitch
                    </div>
                </button>
            </div>
        </div>
    );
};
