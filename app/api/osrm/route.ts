import { NextRequest, NextResponse } from 'next/server';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toLeafletCoordinates = (coords: [number, number][]): [number, number][] =>
  coords.map(([lng, lat]) => [lat, lng] as [number, number]);

const parseCoordinates = (payload: any): [number, number][] | null => {
  const osrmCoords = payload?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
  if (Array.isArray(osrmCoords)) {
    return toLeafletCoordinates(osrmCoords);
  }

  const orsCoords = payload?.features?.[0]?.geometry?.coordinates as [number, number][] | undefined;
  if (Array.isArray(orsCoords)) {
    return toLeafletCoordinates(orsCoords);
  }

  return null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startLat = Number(searchParams.get('startLat'));
  const startLng = Number(searchParams.get('startLng'));
  const endLat = Number(searchParams.get('endLat'));
  const endLng = Number(searchParams.get('endLng'));

  if ([startLat, startLng, endLat, endLng].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  const osrmMirrorUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  const orsApiKey = process.env.ORS_API_KEY;
  const orsUrl = orsApiKey
    ? `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${encodeURIComponent(orsApiKey)}&start=${startLng},${startLat}&end=${endLng},${endLat}`
    : null;
  const mapboxApiKey = process.env.MAPBOX_API_KEY;
  const mapboxUrl = mapboxApiKey
    ? `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${encodeURIComponent(mapboxApiKey)}`
    : null;
  const fallback = [
    [startLat, startLng],
    [endLat, endLng],
  ];

  // Prefer Mapbox (if available), then OSRM public, then OSM mirror, then ORS.
  const providers = [
    ...(mapboxUrl ? [mapboxUrl] : []),
    osrmUrl,
    osrmMirrorUrl,
    ...(orsUrl ? [orsUrl] : []),
  ];

  let lastError: unknown = null;
  for (const providerUrl of providers) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(providerUrl, {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Ease-Logistics/1.0',
          },
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status} from provider`;
          await sleep(200 * (attempt + 1));
          continue;
        }

        const data = await response.json();
        const coordinates = parseCoordinates(data);
        if (coordinates && coordinates.length > 2) {
          return NextResponse.json({ coordinates, source: 'provider' });
        }

        lastError = 'No route geometry returned by provider';
      } catch (error) {
        lastError = error;
      }

      await sleep(200 * (attempt + 1));
    }
  }

  return NextResponse.json({ coordinates: [], source: 'fallback', error: String(lastError), fallback });
}
