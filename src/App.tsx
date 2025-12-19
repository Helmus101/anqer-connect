import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import ContactList from './pages/Contacts/ContactList'
import ContactProfile from './pages/Contacts/ContactProfile'
import Dashboard from './pages/Dashboard/Dashboard'
import ImportData from './pages/Import/ImportData'
import Search from './pages/Search/Search'
import SmartSearch from './components/search/SmartSearch' // Added import for SmartSearch
// import MeetingPrep from './pages/Dashboard/MeetingPrep'
// import ImportContacts from './pages/Onboarding/ImportContacts'
// import GroupList from './pages/Groups/GroupList'

import Settings from './pages/Settings/Settings'
import PrivacyPolicy from './pages/Legal/PrivacyPolicy'
import LandingPage from './pages/Landing/LandingPage'

// Placeholder pages


import { useAuth } from './context/AuthContext'
import { Navigate, Outlet } from 'react-router-dom'

function PrivateRoute() {
  const { session, loading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

import { ToastProvider } from './context/ToastContext'

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/contacts" element={<ContactList />} />
                <Route path="/contacts/:id" element={<ContactProfile />} />
                <Route path="/search" element={<Search />} />
                <Route path="/smart-search" element={<SmartSearch />} />
                <Route path="/import" element={<ImportData />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
