import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/tokens.css'
import './i18n'
import { App } from './app/App'
import { ErrorBoundary } from './app/ErrorBoundary'
import { initBackButton } from './lib/native'

initBackButton()

const root = createRoot(document.getElementById('root')!)

// Dev-only character gallery: http://localhost:5173/?gallery
if (import.meta.env.DEV && location.search.includes('gallery')) {
  void import('./features/character/Gallery').then(({ Gallery }) => root.render(<Gallery />))
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
