import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Contact } from '../../types'
import { geocodeAddress, type Coordinates } from '../../services/mapService'
import { Link } from 'react-router-dom'
import L from 'leaflet'

// Fix default Leaflet marker icon missing assets
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface ContactMapProps {
    contacts: Contact[]
}

interface PlottedContact extends Contact {
    coords: Coordinates
}

export default function ContactMap({ contacts }: ContactMapProps) {
    const [plottedContacts, setPlottedContacts] = useState<PlottedContact[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadMarkers = async () => {
            setLoading(true)
            const plotted: PlottedContact[] = []

            for (const contact of contacts) {
                if (contact.address) {
                    const coords = await geocodeAddress(contact.address)
                    if (coords) {
                        plotted.push({ ...contact, coords })
                    }
                } else if (contact.location) {
                    // Fallback to location string if address is missing
                    const coords = await geocodeAddress(contact.location)
                    if (coords) {
                        plotted.push({ ...contact, coords })
                    }
                }
            }
            setPlottedContacts(plotted)
            setLoading(false)
        }

        loadMarkers()
    }, [contacts])

    if (loading) {
        return <div className="p-8 text-center text-sm text-gray-500">Loading map data... (Geocoding addresses)</div>
    }

    return (
        <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-200">
            <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {plottedContacts.map(contact => (
                    <Marker key={contact.id} position={[contact.coords.lat, contact.coords.lng]}>
                        <Popup>
                            <div className="text-center">
                                <h3 className="font-bold text-sm">{contact.name}</h3>
                                <p className="text-xs text-gray-500 mb-2">{contact.job}</p>
                                <Link to={`/contacts/${contact.id}`} className="text-xs text-blue-600 hover:underline">
                                    View Profile
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
