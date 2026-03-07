export interface HexDbAircraft {
    ModeS: string;
    Registration: string;
    Manufacturer: string;
    ICAOTypeCode: string;
    Type: string;
    RegisteredOwners: string;
    OperatorFlagCode: string;
}

/**
 * Fetches aircraft manufacturer, registration, and owner details from Hexdb.io
 * @param hex The 24-bit ICAO Hex address (e.g. '4010ee')
 */
export async function fetchAircraftDetails(hex: string): Promise<HexDbAircraft | null> {
    if (!hex) return null;

    try {
        const response = await fetch(`https://hexdb.io/api/v1/aircraft/${hex}`);
        if (!response.ok) {
            if (response.status === 404) return null; // Not found in their DB
            throw new Error(`HexDB Aircraft API Error: ${response.status}`);
        }

        // HexDB returns empty objects {} instead of 404 sometimes when data is missing
        const data = await response.json();
        if (!data || Object.keys(data).length === 0 || !data.Registration) {
            return null;
        }

        return data as HexDbAircraft;
    } catch (error) {
        console.error('Failed to fetch aircraft details from HexDB:', error);
        return null;
    }
}
