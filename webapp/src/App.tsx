import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { ToastProvider } from './components/ToastContext'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Directory from './pages/Directory'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Apply from './pages/Apply'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import WidgetSettings from './pages/WidgetSettings'
import Exclusions from './pages/Exclusions'
import './styles/app.css'

export default function App() {
  const { loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="app-loading"><div className="spinner" /></div>
  }

  return (
    <ToastProvider>
      <div className="app">
        <Nav />
        <main className="main">
          <div className="page-transition" key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/directory/:slug" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/dashboard/:startupId" element={<Dashboard />} />
              <Route path="/dashboard/:startupId/settings" element={<Settings />} />
              <Route path="/dashboard/:startupId/widget" element={<WidgetSettings />} />
              <Route path="/dashboard/:startupId/exclusions" element={<Exclusions />} />
            </Routes>
          </div>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  )
}
