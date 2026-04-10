import { useEffect, useMemo, useState } from 'react'
import {
  addBlockedPhone,
  deleteBlockedDoc,
  isPhoneInBlockedList,
  subscribeBlocked,
} from '../../api/firestoreAdmin'
import { PhoneInputIndia } from '../../components/PhoneInputIndia'
import { useUi } from '../../context/useUi'
import { formatDate, formatIndianPhoneDisplay } from '../../lib/format'
import { fullPhoneFromLocal10, isValidIndianLocal10 } from '../../lib/validation'

const PAGE_SIZE = 12

export default function BlockedUsersPage() {
  const { toast, confirm } = useUi()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const unsub = subscribeBlocked(
      (list) => {
        setRows(list)
        setLoading(false)
        setError('')
      },
      (e) => {
        setError(e?.message || 'Failed to load blocked list')
        setLoading(false)
        toast('Failed to load blocked users', 'error')
      },
    )
    return () => unsub()
  }, [toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => String(r.phone || '').toLowerCase().includes(q))
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const slice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  async function handleAdd(e) {
    e.preventDefault()
    if (!isValidIndianLocal10(phoneLocal)) {
      toast('Enter a valid 10-digit Indian mobile (starting 6–9)', 'error')
      return
    }
    const full = fullPhoneFromLocal10(phoneLocal)
    if (!full) {
      toast('Invalid phone', 'error')
      return
    }
    setAdding(true)
    try {
      const exists = await isPhoneInBlockedList(full)
      if (exists) {
        toast('This number is already blocked', 'error')
        return
      }
      await addBlockedPhone(full)
      setPhoneLocal('')
      toast('Number blocked', 'success')
    } catch (err) {
      toast(err?.message || 'Could not add', 'error')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(row) {
    const ok = await confirm(`Remove ${row.phone} from blocked list?`)
    if (!ok) return
    try {
      await deleteBlockedDoc(row.id)
      toast('Removed', 'success')
    } catch (err) {
      toast(err?.message || 'Remove failed', 'error')
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">Blocked users</h1>
      <p className="admin-page-desc muted">Phones that should not receive new loans.</p>

      {error && <div className="admin-error">{error}</div>}

      <form className="admin-toolbar" onSubmit={handleAdd} style={{ marginBottom: '1.25rem' }}>
        <div className="admin-toolbar__search" style={{ minWidth: 220 }}>
          <PhoneInputIndia value10={phoneLocal} onChange10={setPhoneLocal} required />
        </div>
        <button type="submit" className="btn btn--danger btn--sm" disabled={adding}>
          {adding ? 'Adding…' : 'Block number'}
        </button>
      </form>

      <div className="admin-toolbar">
        <input
          type="search"
          className="input admin-toolbar__search"
          placeholder="Search blocked phones…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          aria-label="Search blocked"
        />
      </div>

      {loading ? (
        <div className="admin-loading">Loading…</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Blocked at</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">No blocked numbers.</div>
                    </td>
                  </tr>
                ) : (
                  slice.map((r) => (
                    <tr key={r.id}>
                      <td className="admin-table__mono">{formatIndianPhoneDisplay(r.phone)}</td>
                      <td>{formatDate(r.blockedAt)}</td>
                      <td>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleRemove(r)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="pagination">
              <span className="pagination__info">
                Page {pageSafe} of {totalPages}
              </span>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
