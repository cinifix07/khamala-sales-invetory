import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, Unauthenticated, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import '../App.css'
import logo from '../assets/logo.png'
import Admin from '../ADMIN/ADMIN.jsx'
import Staff from '../STAFF/staff.jsx'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeView, setActiveView] = useState(null)
  const { signIn, signOut } = useAuthActions()

  const handleSignOut = async () => {
    setActiveView(null)
    await signOut()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    formData.set('flow', 'signIn')

    try {
      await signIn('password', formData)
    } catch {
      setError('Invalid username or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (activeView === 'admin') {
    return <Admin onSignOut={handleSignOut} />
  }

  if (activeView === 'staff') {
    return <Staff onSignOut={handleSignOut} />
  }

  return (
    <main className="login-page">
      <Authenticated>
        <SignedInView onContinue={setActiveView} />
      </Authenticated>

      <Unauthenticated>
      <section className="login-panel">
        <div className="login-form-wrap">
          <img
            className="login-logo"
            src={logo}
            alt="Khamala and Kshitija Cake and Pastries"
          />
          <h1>SIGN IN</h1>
          <p className="login-intro">Access your sales and inventory workspace</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <input
                id="username"
                name="email"
                type="text"
                placeholder=" "
                autoComplete="username"
                required
              />
              <label htmlFor="username">USERNAME</label>
              <span className="field-line" />
            </div>

            <div className="field password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder=" "
                autoComplete="current-password"
                required
              />
              <label htmlFor="password">SECRET KEY</label>
              <span className="field-line" />
              <button
                className="visibility-button"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <label className="remember-option">
              <input type="checkbox" />
              <span className="custom-check" aria-hidden="true">
                <span className="material-symbols-outlined">check</span>
              </span>
              Remember device
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'SIGNING IN…' : 'AUTHENTICATE ACCESS'}</span>
              <span className="material-symbols-outlined arrow" aria-hidden="true">
                arrow_forward
              </span>
              <span className="shimmer" aria-hidden="true" />
            </button>
          </form>
        </div>

        <footer className="login-footer">
          <p>© 2026 KHAMALA AND KSHITIJA&apos;S | PURVEYORS OF EXCELLENCE</p>
          <p>
            DEVELOPED BY{' '}
            <a
              href="https://www.facebook.com/share/18wETPHwrE/"
              target="_blank"
              rel="noreferrer"
            >
              CINIFX Teachnology
            </a>
          </p>
        </footer>
      </section>
      </Unauthenticated>
    </main>
  )
}

function SignedInView({ onContinue }) {
  const user = useQuery(api.users.current)

  return (
    <section className="welcome-card">
      <img className="login-logo" src={logo} alt="Khamala and Kshitija Cake and Pastries" />
      <p className="role-badge">{user?.role ?? 'Loading'} account</p>
      <h1>Welcome, {user?.name ?? 'User'}</h1>
      <p>You are securely signed in as <strong>{user?.username}</strong>.</p>
      <button className="submit-button" type="button" disabled={!user} onClick={() => onContinue(user.role)}>CONTINUE</button>
    </section>
  )
}
