import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useAuth } from '../context/AuthContext'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { getToken } = useClerkAuth()
  const { refreshUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }
    setLoading(true)
    try {
      const token = await getToken()
      const API_BASE = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_BASE}/auth/onboarding`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: `+91${cleaned}` })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      await refreshUser()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-lg">
      <div className="bg-surface rounded-lg shadow-md p-xl w-full max-w-md">
        <h1 className="text-xl font-bold text-text-primary mb-xs">One last step</h1>
        <p className="text-sm text-text-secondary mb-lg">
          We need your mobile number for order updates and delivery coordination.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-text-primary block mb-xs">Full Name</label>
            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Rahul Sharma" required
              className="w-full border border-border-default rounded px-sm py-xs text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust" />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-text-primary block mb-xs">
              Mobile Number <span className="text-deal">*</span>
            </label>
            <div className="flex border border-border-default rounded overflow-hidden">
              <span className="bg-gray-100 px-sm py-xs text-sm text-text-secondary border-r border-border-default flex items-center">+91</span>
              <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="9876543210" maxLength={10} required
                className="flex-1 px-sm py-xs text-sm outline-none" />
            </div>
            <p className="text-text-muted text-xs mt-xs">Used only for delivery updates. We don't spam.</p>
          </div>
          {error && <p className="text-deal text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold py-sm rounded transition-colors duration-base disabled:opacity-50">
            {loading ? 'Saving...' : 'Continue to TechNova →'}
          </button>
        </form>
      </div>
    </div>
  )
}
