import { useCallback, useEffect, useState } from 'react'
import { fetchOverviewStats } from '../../api/firestoreAdmin'
import { formatMoney } from '../../lib/format'
import { useUi } from '../../context/useUi'

export default function OverviewPage() {
  const { toast } = useUi()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const s = await fetchOverviewStats()
      setStats(s)
    } catch (e) {
      const msg = e?.code === 'permission-denied' ? 'Permission denied.' : 'Failed to load stats.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h1 className="admin-page-title" style={{ margin: 0, flex: '1 1 auto' }}>
          Overview
        </h1>
        <button type="button" className="btn btn--ghost btn--sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>
      <p className="admin-page-desc muted">
        Snapshot of users, orders, and outstanding loan volume (pending orders).
      </p>

      {error && <div className="admin-error">{error}</div>}

      {loading && !stats ? (
        <div className="admin-loading">Loading dashboard…</div>
      ) : stats ? (
        <div className="stat-grid">
          <article className="stat-card">
            <p className="stat-card__label">Total users</p>
            <p className="stat-card__value stat-card__value--muted">{stats.totalUsers}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Pending orders</p>
            <p className="stat-card__value">{stats.pendingOrders}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Completed orders</p>
            <p className="stat-card__value stat-card__value--success">{stats.completedOrders}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Outstanding loan amount</p>
            <p className="stat-card__value">{formatMoney(stats.outstandingLoanAmount)}</p>
          </article>
        </div>
      ) : null}
    </div>
  )
}
