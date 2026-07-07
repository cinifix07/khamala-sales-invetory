import { useEffect, useState } from 'react'
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
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showIosInstallGuide, setShowIosInstallGuide] = useState(false)
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  )
  const { signIn, signOut } = useAuthActions()

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setInstallPrompt(null)
      return
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) {
      setShowIosInstallGuide(true)
      return
    }
    window.alert(
      isIos
        ? 'To install: tap Share, then choose “Add to Home Screen”.'
        : 'To install: open your browser menu and choose “Install app” or “Add to Home screen”.',
    )
  }

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
          <p className="footer-primary">
            <span>© 2026 KHAMALA AND KSHITIJA&apos;S</span>
            <span className="footer-divider" aria-hidden="true">|</span>
            <button
              className="install-app-button"
              type="button"
              onClick={handleInstall}
              disabled={isInstalled}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isInstalled ? 'check_circle' : 'download'}
              </span>
              {isInstalled ? 'APP INSTALLED' : 'DOWNLOAD APP'}
            </button>
          </p>
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

      {showIosInstallGuide ? (
        <div className="ios-install-backdrop" role="presentation" onMouseDown={() => setShowIosInstallGuide(false)}>
          <section className="ios-install-modal" role="dialog" aria-modal="true" aria-labelledby="ios-install-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="ios-install-close" type="button" aria-label="Close installation guide" onClick={() => setShowIosInstallGuide(false)}>
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
            <div className="ios-install-icon" aria-hidden="true"><span className="material-symbols-outlined">phone_iphone</span></div>
            <p className="ios-install-eyebrow">INSTALL ON IPHONE</p>
            <h2 id="ios-install-title">Add Khamala to your Home Screen</h2>
            <ol>
              <li><span>1</span><p>Open this page using <strong>Safari</strong>.</p></li>
              <li><span>2</span><p>Tap the <strong>Share</strong> button <span className="material-symbols-outlined ios-share-icon" aria-hidden="true">ios_share</span>.</p></li>
              <li><span>3</span><p>Scroll down and tap <strong>Add to Home Screen</strong>.</p></li>
              <li><span>4</span><p>Tap <strong>Add</strong> to install the app.</p></li>
            </ol>
            <button className="ios-install-done" type="button" onClick={() => setShowIosInstallGuide(false)}>Got It</button>
          </section>
        </div>
      ) : null}
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
