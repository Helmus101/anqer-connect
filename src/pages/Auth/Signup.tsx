import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { signInWithGoogle } = useAuth()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // For MVP Demo purposes
        if (import.meta.env.VITE_SUPABASE_ANON_KEY === 'placeholder') {
            alert("Supabase not configured. Using mock signup.")
            setTimeout(() => {
                navigate('/')
            }, 500)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        setLoading(false)
        if (error) alert(error.message)
        else {
            alert('Check your email for the login link!')
            navigate('/login')
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-white text-black p-4">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tighter">Anqer.</h1>
                    <p className="mt-2 text-gray-500 text-sm font-medium">Join the circle.</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => signInWithGoogle()}
                        className="w-full py-2.5 px-4 border border-gray-200 rounded-md bg-white text-black font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Sign up with Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-100" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-400 font-medium">Or with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-3">
                        <div>
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all placeholder:text-gray-400 text-black"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all placeholder:text-gray-400 text-black"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2 bg-black text-white font-bold rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm shadow-sm"
                        >
                            {loading ? 'Creating...' : 'Sign Up'}
                        </button>
                    </form>
                </div>

                <div className="text-center text-xs text-gray-400">
                    Already have an account? <span className="text-black font-medium cursor-pointer hover:underline" onClick={() => navigate('/login')}>Sign in</span>
                </div>
            </div>
        </div>
    )
}
