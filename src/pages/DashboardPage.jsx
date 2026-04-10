import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/useAuth'
import { db } from '../firebase'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const [settings, setSettings] = useState(null)
  const [settingsError, setSettingsError] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const ref = doc(db, 'admin_settings', 'config')
        const snap = await getDoc(ref)
        if (cancelled) return
        if (snap.exists()) setSettings(snap.data())
        else setSettings(null)
      } catch (e) {
        if (!cancelled) {
          setSettingsError(
            e?.code === 'permission-denied'
              ? 'Could not load admin settings (check Firestore rules and admin token).'
              : 'Could not load admin settings.',
          )
        }
      } finally {
        if (!cancelled) setSettingsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <div className="brand-mark brand-mark--sm" aria-hidden="true" />
          <div>
            <p className="dashboard__brand-name">QuickCredit Admin</p>
            <p className="muted dashboard__email">{user?.email}</p>
          </div>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <main className="dashboard__main">
        <h1 className="dashboard__title">Dashboard</h1>
        <p className="dashboard__lead muted">
          You are signed in with email authentication. Data below follows{' '}
          <code className="inline-code">admin_settings/config</code> from your Firestore schema.
        </p>

        <div className="card-grid">
          <article className="card">
            <h2 className="card__title">Loan limits</h2>
            {settingsError && <p className="field__error">{settingsError}</p>}
            {settingsLoading && !settingsError && (
              <p className="muted">Loading settings…</p>
            )}
            {!settingsLoading && !settingsError && settings == null && (
              <p className="muted">No <code className="inline-code">admin_settings/config</code> document yet.</p>
            )}
            {!settingsLoading && settings && (
              <ul className="stat-list">
                <li>
                  <span className="muted">Min limit</span>
                  <strong>{settings.minLimit ?? '—'}</strong>
                </li>
                <li>
                  <span className="muted">Max limit</span>
                  <strong>{settings.maxLimit ?? '—'}</strong>
                </li>
                {settings.defaultInterestRate != null && (
                  <li>
                    <span className="muted">Default interest</span>
                    <strong>{settings.defaultInterestRate}</strong>
                  </li>
                )}
              </ul>
            )}
          </article>

          <article className="card">
            <h2 className="card__title">Collections</h2>
            <p className="muted card__text">
              Rules cover <code className="inline-code">users</code>,{' '}
              <code className="inline-code">orders</code>,{' '}
              <code className="inline-code">blocked_users</code>, and{' '}
              <code className="inline-code">admin_settings</code>. Extend this dashboard to query
              them as you build features.
            </p>
          </article>
        </div>
      </main>
    </div>
  )
}
