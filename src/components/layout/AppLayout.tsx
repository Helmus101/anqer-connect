import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Users, Search, Settings, Home } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function AppLayout() {
    return (
        <div className="flex h-screen bg-white text-black overflow-hidden font-sans selection:bg-black selection:text-white">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 p-6">
                <div className="mb-10">
                    <h1 className="text-xl font-bold tracking-tight">
                        anqer.
                    </h1>
                </div>

                <nav className="space-y-1 flex-1">
                    <NavItem to="/dashboard" icon="Home">Home</NavItem>
                    <NavItem to="/contacts" icon="Users">Contacts</NavItem>
                    <NavItem to="/search" icon="Search">Search</NavItem>
                </nav>

                <div className="mt-auto">
                    <NavItem to="/settings" icon="Settings">Settings</NavItem>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-white">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-4 z-50">
                <NavItem to="/dashboard" icon="Home" mobile />
                <NavItem to="/contacts" icon="Users" mobile />
                <NavItem to="/search" icon="Search" mobile />
                <NavItem to="/settings" icon="Settings" mobile />
            </nav>
        </div>
    )
}

function NavItem({ to, children, icon, mobile = false }: { to: string, children?: React.ReactNode, icon: string, mobile?: boolean }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
                isActive
                    ? "bg-black text-white font-medium"
                    : "text-gray-500 hover:text-black hover:bg-gray-100",
                mobile && "flex-col gap-1 text-xs"
            )}
        >
            <span className="flex items-center justify-center">
                {icon === 'Home' && <Home size={18} />}
                {icon === 'Users' && <Users size={18} />}
                {icon === 'Search' && <Search size={18} />}
                {icon === 'Settings' && <Settings size={18} />}
            </span>
            {children}
        </NavLink>
    )
}
