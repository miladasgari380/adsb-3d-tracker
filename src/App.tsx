import { useState, useEffect } from 'react';
import { useFlightData } from './hooks/useFlightData';
import { FlightMap } from './components/FlightMap';
import { Plane, MapPin, Gauge, Settings, ChevronRight, Activity, AtSign } from 'lucide-react';
import { fetchAircraftDetails } from './services/hexdb';
import type { HexDbAircraft } from './services/hexdb';

const MAP_STYLES = {
  'Dark Matter': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'Positron': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  'Voyager': 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
};

function App() {
  const [url, setUrl] = useState<string>('http://192.168.1.133/dump1090/data/aircraft.json');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES['Dark Matter']);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [mapColor, setMapColor] = useState<string>('#0f172a'); // slate-900 default

  // HexDB API State
  const [hexDetails, setHexDetails] = useState<HexDbAircraft | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Initial View State (San Francisco Bay Area)
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 9,
    pitch: 45,
    bearing: 0
  });

  const { flights, error } = useFlightData(url);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  // Jump camera to flight
  const focusFlight = (id: string) => {
    const flight = flights.find(f => f.id === id);
    if (flight && flight.lon && flight.lat) {
      setViewState({
        ...viewState,
        longitude: flight.lon,
        latitude: flight.lat,
        zoom: 12,
        pitch: 60
      });
      setSelectedFlightId(id);
    }
  };

  // Fetch from HexDB when the selected flight changes
  useEffect(() => {
    if (!selectedFlight) {
      setHexDetails(null);
      return;
    }

    let isMounted = true;
    const fetchEnrichedData = async () => {
      setIsLoadingDetails(true);
      // Reset previous states immediately on flight switch
      setHexDetails(null);

      // Fetch aircraft data by ICAO HEX
      const aircraftResponse = await fetchAircraftDetails(selectedFlight.hex);

      if (isMounted) {
        setHexDetails(aircraftResponse);
        setIsLoadingDetails(false);
      }
    };

    fetchEnrichedData();

    return () => { isMounted = false; }
  }, [selectedFlightId]); // Re-run only when the ID specifically changes

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">

      {/* 3D Map Component */}
      <FlightMap
        flights={flights}
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        selectedFlightId={selectedFlightId}
        onSelectFlight={setSelectedFlightId}
        mapStyle={mapStyle}
        showMap={showMap}
        mapColor={mapColor}
      />

      {/* Top Navigation Bar (Glassmorphism) */}
      <header className="absolute top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-md border-b border-white/10 z-10 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">ADS-B 3D Tracker</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${error ? 'bg-red-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${error ? 'bg-red-500' : 'bg-green-500'}`}></span>
              </span>
              {flights.length} Aircraft Tracked
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
        >
          <Settings className="w-5 h-5 text-slate-300" />
        </button>
      </header>

      {/* Configuration Panel */}
      {isConfigOpen && (
        <div className="absolute top-20 right-6 w-80 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-20">
          <h2 className="text-sm font-semibold mb-4 text-slate-200">Data Source Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Receiver URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="http://192.168.1.100:8080/data/aircraft.json"
              />
              <p className="text-xs text-slate-500 mt-2">
                Leave empty or use VITE_USE_MOCK_DATA=true to use mock data for testing.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Map Style</label>
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                {Object.entries(MAP_STYLES).map(([name, url]) => (
                  <option key={name} value={url}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center justify-between cursor-pointer mt-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showMap}
                    onChange={(e) => setShowMap(e.target.checked)}
                    className="rounded border-white/10 bg-slate-900/50 text-blue-500 focus:ring-blue-500"
                  />
                  Show Base Map
                </div>
              </label>
            </div>

            {!showMap && (
              <div className="pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-medium text-slate-400 mb-1">Custom Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={mapColor}
                    onChange={(e) => setMapColor(e.target.value)}
                    className="h-8 w-14 rounded cursor-pointer bg-slate-900/50 border border-white/10"
                  />
                  <span className="text-sm font-mono text-slate-300">{mapColor.toUpperCase()}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                Connection Error: {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flight Details Side Panel */}
      <div className={`absolute top-20 left-6 bottom-6 w-80 bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-10 transition-transform duration-300 flex flex-col overflow-hidden ${selectedFlightId ? 'translate-x-0' : '-translate-x-[120%]'}`}>
        {selectedFlight && (
          <>
            <div className="p-5 border-b border-white/10 bg-slate-800/50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    {selectedFlight.flight || selectedFlight.hex.toUpperCase()}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">HEX: {selectedFlight.hex.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setSelectedFlightId(null)}
                  className="p-1 hover:bg-white/10 rounded-full"
                >
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Enhanced HexDB Display */}
              {isLoadingDetails ? (
                <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5 animate-pulse flex flex-col gap-3">
                  <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                </div>
              ) : hexDetails ? (
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-4 rounded-xl border border-blue-500/20 shadow-inner">
                  <div className="flex items-center gap-2 text-blue-400 mb-3 border-b border-white/5 pb-2">
                    <AtSign className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Registration Database</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Airline / Owner</div>
                      <div className="text-sm font-medium text-slate-200">{hexDetails.RegisteredOwners || 'Private'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Registration</div>
                      <div className="font-mono text-sm text-slate-200">{hexDetails.Registration || 'Unknown'}</div>
                    </div>
                    <div className="col-span-2 mt-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Aircraft Type</div>
                      <div className="text-sm text-slate-200">
                        {hexDetails.Manufacturer} {hexDetails.Type || hexDetails.ICAOTypeCode}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Telemetry Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium">Altitude</span>
                  </div>
                  <div className="text-xl font-semibold">
                    {Math.round(selectedFlight.alt_baro || 0).toLocaleString()} <span className="text-sm text-slate-500 font-normal">ft</span>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Gauge className="w-4 h-4" />
                    <span className="text-xs font-medium">Speed</span>
                  </div>
                  <div className="text-xl font-semibold">
                    {Math.round(selectedFlight.gs || 0).toLocaleString()} <span className="text-sm text-slate-500 font-normal">kt</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-medium">Coordinates</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {selectedFlight.lat?.toFixed(4)}, {selectedFlight.lon?.toFixed(4)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-400">Heading</div>
                  <div className="font-semibold">{Math.round(selectedFlight.track || 0)}°</div>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-white/10 bg-slate-800/50">
              <button
                onClick={() => focusFlight(selectedFlight.id)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-900/20"
              >
                Focus Camera
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

export default App;
