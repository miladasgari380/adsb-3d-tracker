import { useState, useEffect, useRef } from 'react';

// ADS-B JSON format structure from dump1090/tar1090
export interface FlightData {
  hex: string;         // ICAO 24-bit Hex address
  flight?: string;     // Callsign
  alt_baro?: number;   // Barometric altitude (feet)
  alt_geom?: number;   // Geometric altitude (feet)
  lat?: number;        // Latitude
  lon?: number;        // Longitude
  track?: number;      // True track angle (degrees)
  gs?: number;         // Ground speed (knots)
  category?: string;   // Aircraft category
  seen?: number;       // Time since last update (seconds)
  altitude?: number | string; // Older dump1090 altitude
  speed?: number;      // Older dump1090 speed
}

export interface AdsbResponse {
  now: number;         // Timestamp
  messages: number;
  aircraft: FlightData[];
}

export interface ProcessedFlight extends FlightData {
  id: string;          // Unique ID
  trajectory: [number, number, number][]; // [lon, lat, alt] path history
  lastUpdated: number;
}



// SF Bay area default coordinates
const MOCK_CENTER = { lat: 37.7749, lon: -122.4194 };

// Generates smooth random flight paths around a center point
class MockFlightGenerator {
  flights: ProcessedFlight[] = [];

  constructor(count: number) {
    for (let i = 0; i < count; i++) {
      this.addFlight();
    }
  }

  addFlight() {
    const lat = MOCK_CENTER.lat + (Math.random() - 0.5) * 2;
    const lon = MOCK_CENTER.lon + (Math.random() - 0.5) * 2;
    const alt = 5000 + Math.random() * 30000;
    const track = Math.random() * 360;
    const gs = 200 + Math.random() * 300;
    const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    this.flights.push({
      id: hex,
      hex,
      flight: `FLT${Math.floor(Math.random() * 999)}`,
      lat,
      lon,
      alt_baro: alt,
      track,
      gs,
      trajectory: [[lon, lat, alt]],
      lastUpdated: Date.now()
    });
  }

  update(dt: number) {
    this.flights.forEach(f => {
      if (!f.lat || !f.lon || !f.track || !f.gs || !f.alt_baro) return;

      // Update position based on speed and heading
      // 1 knot = 0.514444 m/s. 1 deg lat = ~111km.
      const distKm = (f.gs * 1.852 * dt) / 3600;

      const radTrack = f.track * Math.PI / 180;
      f.lat += (distKm * Math.cos(radTrack)) / 111;
      f.lon += (distKm * Math.sin(radTrack)) / (111 * Math.cos(f.lat * Math.PI / 180));

      // Slowly change altitude
      f.alt_baro += (Math.random() - 0.5) * 100;

      // Slowly turn
      f.track = (f.track + (Math.random() - 0.5) * 5) % 360;

      // Add to trajectory (keep last 50 points)
      f.trajectory.push([f.lon, f.lat, f.alt_baro]);
      if (f.trajectory.length > 50) {
        f.trajectory.shift();
      }
      f.lastUpdated = Date.now();
    });

    // Randomly remove and add flights to simulate flying in/out of range
    if (Math.random() < 0.05) {
      if (this.flights.length > 0) this.flights.shift();
    }
    if (Math.random() < 0.05) {
      this.addFlight();
    }

    return this.flights;
  }
}

export function useFlightData(url: string, pollIntervalMs: number = 2000) {
  const [flights, setFlights] = useState<Map<string, ProcessedFlight>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const generatorRef = useRef<MockFlightGenerator | null>(null);

  useEffect(() => {
    const shouldUseMock = import.meta.env.VITE_USE_MOCK_DATA === 'true' || !url;

    if (shouldUseMock && !generatorRef.current) {
      generatorRef.current = new MockFlightGenerator(20);
    }

    let isSubscribed = true;

    const fetchData = async () => {
      if (!isSubscribed) return;
      if (shouldUseMock && generatorRef.current) {
        const mockFlights = generatorRef.current.update(pollIntervalMs / 1000);
        setFlights(() => {
          const next = new Map(); // Clear old real flights when switching to mock
          mockFlights.forEach(f => next.set(f.id, { ...f }));
          return next;
        });
        setError(null);
        return;
      }

      if (!url) return;

      try {
        const response = await fetch('http://localhost:3001/api/adsb', {
          headers: { 'x-adsb-target': url }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: AdsbResponse = await response.json();

        setFlights(prev => {
          const next = new Map(prev);
          const now = Date.now();

          // Cleanup stale flights (not seen in > 60s)
          for (const [id, flight] of next.entries()) {
            if (now - flight.lastUpdated > 60000) {
              next.delete(id);
            }
          }

          data.aircraft.forEach(ac => {
            if (!ac.lat || !ac.lon || !ac.hex) return; // Skip invalid data

            const id = ac.hex;
            const existing = next.get(id);

            // Normalize old and new dump1090 field names
            const parsedAlt = ac.alt_baro ?? (typeof ac.altitude === 'number' ? ac.altitude : 0) ?? ac.alt_geom ?? 0;
            const parsedGs = ac.gs ?? ac.speed ?? 0;
            const parsedTrack = ac.track ?? 0;

            const newPos: [number, number, number] = [ac.lon, ac.lat, parsedAlt];

            if (existing) {
              // Only update trajectory if moved significantly to save memory/processing
              const lastPos = existing.trajectory[existing.trajectory.length - 1];
              const movedEnough = lastPos && (Math.abs(lastPos[0] - newPos[0]) > 0.0001 || Math.abs(lastPos[1] - newPos[1]) > 0.0001);

              const newTrajectory = movedEnough
                ? [...existing.trajectory, newPos].slice(-100) // Keep last 100 points
                : existing.trajectory;

              next.set(id, {
                ...existing,
                ...ac,
                alt_baro: parsedAlt,
                gs: parsedGs,
                track: parsedTrack,
                id,
                trajectory: newTrajectory,
                lastUpdated: now
              });
            } else {
              next.set(id, {
                ...ac,
                alt_baro: parsedAlt,
                gs: parsedGs,
                track: parsedTrack,
                id,
                trajectory: [newPos],
                lastUpdated: now
              });
            }
          });

          return next;
        });
        setError(null);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch ADS-B data');
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, pollIntervalMs);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [url, pollIntervalMs]);

  return {
    flights: Array.from(flights.values()),
    error
  };
}
