import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '@/i18n'

interface State {
  error: Error | null
}

/** Last-resort screen if rendering fails, with a reload button instead of a blank window. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ClothUp crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const t = i18n.t.bind(i18n)
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold">{t('error.title')}</h1>
        <p className="text-muted">{t('error.body')}</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="h-12 rounded-control bg-primary px-6 font-semibold text-on-primary"
        >
          {t('error.reload')}
        </button>
      </div>
    )
  }
}
