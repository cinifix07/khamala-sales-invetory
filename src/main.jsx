import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import './index.css'
import Login from './LOGIN/LOGIN.jsx'

const convexUrl =
  import.meta.env.VITE_CONVEX_URL ||
  import.meta.env.VITE_BASE_POINT ||
  'https://useful-narwhal-151.convex.cloud'
const root = createRoot(document.getElementById('root'))

if (!convexUrl) {
  root.render(
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Configuration error</h1>
      <p>Add VITE_CONVEX_URL to the Vercel environment variables, then redeploy.</p>
    </main>,
  )
} else {
  const convex = new ConvexReactClient(convexUrl)

  root.render(
    <StrictMode>
      <ConvexAuthProvider client={convex}>
        <Login />
      </ConvexAuthProvider>
    </StrictMode>,
  )
}
