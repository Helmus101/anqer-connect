export interface Coordinates {
    lat: number
    lng: number
}

const CACHE_PREFIX = 'geo_v1_'

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!address) return null

    // 1. Check Cache
    const cacheKey = CACHE_PREFIX + address.toLowerCase().trim()
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
        return JSON.parse(cached)
    }

    // 2. Fetch from Nominatim (OpenStreetMap)
    try {
        // Enforce rate limiting (simple pause) - Nominatim requires 1 req/sec max
        await new Promise(resolve => setTimeout(resolve, 1000))

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AnqerApp/1.0' // Required by Nominatim
            }
        })

        if (!response.ok) return null

        const data = await response.json()
        if (data && data.length > 0) {
            const coords = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            }

            // 3. Save to Cache
            localStorage.setItem(cacheKey, JSON.stringify(coords))
            return coords
        }
    } catch (err) {
        console.error("Geocoding failed", err)
    }

    return null
}
