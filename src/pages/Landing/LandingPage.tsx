import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'


export default function LandingPage() {
    const navigate = useNavigate()
    const { session } = useAuth()

    // Optional: Auto-redirect if already logged in?
    // For now, we'll let them see the landing page but the CTA changes.

    return (
        <div className="min-h-screen bg-white text-black flex flex-col font-sans">
            {/* Header */}
            <header className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full">
                <div className="font-bold text-2xl tracking-tighter">Anqer.</div>
                <nav className="flex gap-4 text-sm font-medium">
                    {session ? (
                        <button
                            onClick={() => navigate('/contacts')}
                            className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="text-gray-600 hover:text-black transition-colors"
                        >
                            Log In
                        </button>
                    )}
                </nav>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="max-w-3xl space-y-8">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight">
                        More than just<br />
                        <span className="text-gray-400">contacts.</span>
                    </h1>

                    <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
                        The personal connection manager for your real life.
                        Enhance your friendships, remember the details, and deepen your bonds.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                        <button
                            onClick={() => navigate(session ? '/contacts' : '/signup')}
                            className="bg-black text-white px-8 py-4 rounded-full text-lg font-bold hover:scale-105 transition-all flex items-center gap-2"
                        >
                            {session ? 'Enter App' : 'Get Started Free'} <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-8 border-t border-gray-100 mt-auto">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
                    <div>
                        © {new Date().getFullYear()} Anqer Inc.
                    </div>
                    <div className="flex gap-6">
                        <button onClick={() => navigate('/privacy')} className="hover:text-black transition-colors flex items-center gap-1">
                            <Shield size={12} /> Privacy Policy
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    )
}
