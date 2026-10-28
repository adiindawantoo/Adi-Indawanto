/**
 * Utility functions for geolocation, Google Maps integration, and coordinate handling.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Returns a direct Google Maps URL for a location.
 * If latitude and longitude are valid numbers, links directly to the pin.
 * Otherwise, falls back to Google Maps search query with TMII context.
 */
export function getGoogleMapsUrl(locationName: string, latitude?: number, longitude?: number): string {
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  ) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }
  const cleanName = (locationName || 'Taman Mini Indonesia Indah').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cleanName} Taman Mini Indonesia Indah Jakarta`)}`;
}

/**
 * Returns a Google Maps Directions (Rute) URL to the location.
 */
export function getGoogleDirectionsUrl(locationName: string, latitude?: number, longitude?: number): string {
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  const cleanName = (locationName || 'Taman Mini Indonesia Indah').trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${cleanName} Taman Mini Indonesia Indah Jakarta`)}`;
}

/**
 * Returns an embeddable Google Maps iframe URL for previewing the location.
 */
export function getGoogleMapsEmbedUrl(locationName?: string, latitude?: number, longitude?: number): string {
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  ) {
    return `https://maps.google.com/maps?q=${latitude},${longitude}&hl=id&z=17&output=embed`;
  }
  const cleanName = (locationName || 'Taman Mini Indonesia Indah').trim();
  return `https://maps.google.com/maps?q=${encodeURIComponent(`${cleanName} Taman Mini Indonesia Indah Jakarta`)}&hl=id&z=16&output=embed`;
}

/**
 * Checks whether the given coordinate pair is valid.
 */
export function isValidLatLng(latitude?: number | null, longitude?: number | null): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  // Lat range: -90 to 90, Lng range: -180 to 180
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 && (latitude !== 0 || longitude !== 0);
}

/**
 * Formats coordinates nicely for human display.
 * e.g., "-6.302455, 106.895120" or "6.3025° S, 106.8951° E"
 */
export function formatCoordinates(latitude?: number, longitude?: number, mode: 'decimal' | 'cardinal' = 'decimal'): string {
  if (!isValidLatLng(latitude, longitude)) return '-';
  const lat = latitude!;
  const lng = longitude!;

  if (mode === 'cardinal') {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Parses coordinates from various user input formats:
 * - Direct pair: "-6.302455, 106.895120"
 * - Space separated: "-6.302455 106.895120"
 * - Google Maps URL with @lat,lng: "https://www.google.com/maps/place/.../@-6.302455,106.895120,17z/..."
 * - Google Maps query URL: "https://maps.google.com/?q=-6.302455,106.895120"
 * - Geo URI: "geo:-6.302455,106.895120"
 */
export function parseCoordinatesFromInput(input: string): { latitude: number; longitude: number } | null {
  if (!input || !input.trim()) return null;
  const str = input.trim();

  // 1. Google Maps @lat,lng pattern
  const atMatch = str.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 2. Google Maps ?q=lat,lng or query=lat,lng or destination=lat,lng
  const qMatch = str.match(/[?&](?:q|query|destination|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/i);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 3. Coordinate pair anywhere in text (e.g. "-6.302455, 106.895120" or "-6.302455,106.895120")
  const pairMatch = str.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lng = parseFloat(pairMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}

/**
 * Gets user's current GPS position via browser Geolocation API.
 * High accuracy, with timeout handling.
 */
export function getCurrentGpsCoordinates(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat atau browser Anda tidak mendukung fitur Geolocation GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let msg = 'Gagal mendeteksi lokasi GPS.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Izin akses lokasi GPS ditolak oleh browser/pengguna. Aktifkan izin lokasi pada browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Informasi lokasi GPS tidak tersedia atau sinyal satelit lemah.';
            break;
          case error.TIMEOUT:
            msg = 'Waktu permintaan deteksi lokasi GPS habis (timeout).';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * TMII Center Reference Coordinates
 */
export const TMII_CENTER_COORDINATES = {
  latitude: -6.302455,
  longitude: 106.895120
};

/**
 * Alias for parseCoordinatesFromInput
 */
export const parseLatLngInput = parseCoordinatesFromInput;
