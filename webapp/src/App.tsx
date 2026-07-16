import { Routes, Route } from 'react-router-dom'
import { useAuth } from './auth'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Directory from './pages/Directory'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Apply from './pages/Apply'
import Dashboard from './pages/Dashboard'
import './styles/app.css'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="app-loading"><div className="spinner" /></div>
  }

  return (
    <div className="app">
      <Nav user={user} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/directory/:slug" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/dashboard/:startupId" element={<Dashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
