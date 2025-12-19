import { useNavigate } from 'react-router-dom'
import { Gift, Calendar } from 'lucide-react'
import type { Contact } from '../../types'

interface CelebrationsProps {
    contacts: Contact[]
}

export default function Celebrations({ contacts }: CelebrationsProps) {
    const navigate = useNavigate()

    const getNextBirthday = (dateStr: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const bday = new Date(dateStr)
        bday.setHours(0, 0, 0, 0)
        bday.setFullYear(today.getFullYear())

        if (bday < today) {
            bday.setFullYear(today.getFullYear() + 1)
        }
        return bday
    }

    const upcomingBirthdays = contacts.filter(c => {
        if (!c.birthday) return false
        const nextBday = getNextBirthday(c.birthday)
        const diffTime = nextBday.getTime() - new Date().getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays <= 30 && diffDays >= 0
    }).sort((a, b) => {
        return getNextBirthday(a.birthday!).getTime() - getNextBirthday(b.birthday!).getTime()
    })

    if (upcomingBirthdays.length === 0) return null

    return (
        <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-pink-900">
                <Gift size={20} className="text-pink-500" />
                Upcoming Celebrations
            </h2>
            <div className="space-y-3">
                {upcomingBirthdays.map(c => (
                    <div key={c.id}
                        onClick={() => navigate(`/contacts/${c.id}`)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-pink-100 hover:border-pink-300 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-xl">
                                🎂
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 group-hover:underline">{c.name}</h3>
                                <p className="text-xs text-pink-500 font-medium flex items-center gap-1">
                                    <Calendar size={10} />
                                    {new Date(c.birthday!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-bold">
                            Say HBD
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
