import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface AddressAutocompleteProps {
    value: string
    onChange: (value: string) => void
    onSelect?: (address: any) => void
}

export default function AddressAutocomplete({ value, onChange, onSelect }: AddressAutocompleteProps) {
    const [query, setQuery] = useState(value)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 2 && isOpen) {
                setIsLoading(true)
                try {
                    // Use Nominatim API (OpenStreetMap geocoding)
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`)
                    const data = await res.json()
                    setSuggestions(data.map((item: any) => ({
                        display_name: item.display_name,
                        ...item,
                        lat: parseFloat(item.lat),
                        lon: parseFloat(item.lon)
                    })))
                } catch (err) {
                    console.error("Address fetch error", err)
                } finally {
                    setIsLoading(false)
                }
            } else {
                setSuggestions([])
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [query, isOpen])

    // Update query if parent value changes externally
    useEffect(() => {
        if (value !== query) {
            setQuery(value)
        }
    }, [value])

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [wrapperRef])

    const handleSelect = (item: any) => {
        setQuery(item.display_name)
        onChange(item.display_name)
        setIsOpen(false)
        if (onSelect) onSelect(item)
    }

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        onChange(e.target.value)
                        setIsOpen(true)
                    }}
                    placeholder="Search address (Street, City, Country)..."
                    className="w-full bg-black border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 min-h-[60px] resize-none"
                    onFocus={() => {
                        if (query.length > 2) setIsOpen(true)
                    }}
                />
                {isLoading && (
                    <div className="absolute right-3 top-3">
                        <Loader2 className="animate-spin text-gray-500" size={16} />
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSelect(item)}
                            className="p-3 hover:bg-gray-800 cursor-pointer text-sm text-gray-300 border-b border-gray-800 last:border-0 transition-colors"
                        >
                            {item.display_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
