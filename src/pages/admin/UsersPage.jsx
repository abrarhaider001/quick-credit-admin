import { useEffect, useMemo, useState } from 'react'
import {
  createUserDoc,
  getAdminSettingsOnce,
  isPhoneUsedByAnotherUser,
  subscribeUsers,
  updateUserDoc,
} from '../../api/firestoreAdmin'
import { Modal } from '../../components/Modal'
import { PhoneInputIndia } from '../../components/PhoneInputIndia'
import { useUi } from '../../context/useUi'
import { formatIndianPhoneDisplay, formatMoney } from '../../lib/format'
import {
  digitsOnly,
  fullPhoneFromLocal10,
  getIndianLocal10ForInput,
  isValidIndianLocal10,
} from '../../lib/validation'

const PAGE_SIZE = 10

export default function UsersPage() {
  const { toast, confirm } = useUi()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const unsub = subscribeUsers(
      (list) => {
        setRows(list)
        setLoading(false)
        setError('')
      },
      (e) => {
        setError(e?.message || 'Failed to load users')
        setLoading(false)
        toast('Failed to load users', 'error')
      },
    )
    return () => unsub()
  }, [toast])

  const borrowers = useMemo(() => rows.filter((u) => u.role === 'user'), [rows])

  const filtered = useMemo(() => {
    let list = borrowers
    const q = search.trim().toLowerCase()
    const digitQ = digitsOnly(search)
    if (q) {
      list = list.filter((u) => {
        const nameMatch = String(u.name || '').toLowerCase().includes(q)
        const phoneDigits = digitsOnly(u.phone || '')
        const phoneMatch = digitQ.length > 0 && phoneDigits.includes(digitQ)
        return nameMatch || phoneMatch
      })
    }
    if (statusFilter === 'active') list = list.filter((u) => !u.isBlocked)
    if (statusFilter === 'blocked') list = list.filter((u) => u.isBlocked)
    return list
  }, [borrowers, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const slice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.35rem',
        }}
      >
        <h1 className="admin-page-title" style={{ margin: 0, flex: '1 1 auto' }}>
          Users
        </h1>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
          Add user
        </button>
      </div>
      {/* <p className="admin-page-desc muted">
        Borrower profiles only (role <code className="inline-code">user</code>). Phone stored as compact{' '}
        <code className="inline-code">+913010668945</code>. New users are Firestore documents only — no
        Authentication account.
      </p> */}
      <p className="admin-page-desc muted">
        Here you can add, edit, and block users.
      </p>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <input
          type="search"
          className="input admin-toolbar__search"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          aria-label="Search users"
        />
        <select
          className="input admin-toolbar__select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="blocked">Blocked only</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading users…</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Loan limits</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">No users match your filters.</div>
                    </td>
                  </tr>
                ) : (
                  slice.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name || '—'}</td>
                      <td className="admin-table__mono">{formatIndianPhoneDisplay(u.phone)}</td>
                      <td>
                        {u.isBlocked ? (
                          <span className="badge badge--danger">Blocked</span>
                        ) : (
                          <span className="badge badge--success">Active</span>
                        )}
                      </td>
                      <td className="admin-table__mono">
                        {u.loanSettings
                          ? `${formatMoney(u.loanSettings.minLimit)} – ${formatMoney(u.loanSettings.maxLimit)} · sel ${formatMoney(u.loanSettings.selectedAmount)}`
                          : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setEditing(u)}
                        >
                          Edit
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
                Page {pageSafe} of {totalPages} · {filtered.length} users
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

      {creating && (
        <UserCreateModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            toast('User created (Firestore only)', 'success')
          }}
          confirm={confirm}
          toast={toast}
        />
      )}

      {editing && (
        <UserEditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            toast('User updated', 'success')
          }}
          confirm={confirm}
          toast={toast}
        />
      )}
    </div>
  )
}

function UserCreateModal({ onClose, onSaved, confirm, toast }) {
  const [name, setName] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [minLimit, setMinLimit] = useState(0)
  const [maxLimit, setMaxLimit] = useState(0)
  const [selectedAmount, setSelectedAmount] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await getAdminSettingsOnce()
      if (cancelled || !s) return
      setMinLimit(s.minLimit ?? 0)
      setMaxLimit(s.maxLimit ?? 0)
      setSelectedAmount(Math.round(((s.minLimit ?? 0) + (s.maxLimit ?? 0)) / 2))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!String(name).trim()) {
      toast('Name is required', 'error')
      return
    }
    if (!isValidIndianLocal10(phoneLocal)) {
      toast('Enter a valid 10-digit Indian mobile (starting 6–9)', 'error')
      return
    }
    const fullPhone = fullPhoneFromLocal10(phoneLocal)
    const minN = Number(minLimit)
    const maxN = Number(maxLimit)
    const selN = Number(selectedAmount)
    if (Number.isNaN(minN) || Number.isNaN(maxN) || Number.isNaN(selN)) {
      toast('Loan settings must be numbers', 'error')
      return
    }
    if (minN > maxN) {
      toast('Min limit cannot exceed max limit', 'error')
      return
    }
    if (selN < minN || selN > maxN) {
      const ok = await confirm('Selected amount is outside min/max. Save anyway?')
      if (!ok) return
    }

    try {
      const taken = await isPhoneUsedByAnotherUser(fullPhone, null)
      if (taken) {
        toast('This phone is already registered', 'error')
        return
      }
    } catch {
      toast('Could not verify phone uniqueness', 'error')
      return
    }

    const settings = await getAdminSettingsOnce()
    if (settings && (minN < settings.minLimit || maxN > settings.maxLimit)) {
      const ok = await confirm(
        `User limits (${minN}–${maxN}) are outside global settings (${settings.minLimit}–${settings.maxLimit}). Save anyway?`,
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      await createUserDoc({
        name,
        phone: fullPhone,
        isBlocked,
        loanSettings: { minLimit: minN, maxLimit: maxN, selectedAmount: selN },
      })
      onSaved()
    } catch (err) {
      toast(err?.message || 'Create failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Add user (document only)"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="user-create-form" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? 'Saving…' : 'Create'}
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: '0.8125rem', marginTop: 0 }}>
        Creates a <code className="inline-code">users</code> document with a new ID. Does{' '}
        <strong>not</strong> create a Firebase Authentication login.
      </p>
      <form id="user-create-form" className="form-grid" onSubmit={handleSave}>
        <label className="field field--full">
          <span className="field__label">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field field--full">
          <span className="field__label">Phone</span>
          <PhoneInputIndia value10={phoneLocal} onChange10={setPhoneLocal} required />
        </label>
        <label className="field field--full" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} />
          <span className="field__label" style={{ margin: 0 }}>
            Blocked
          </span>
        </label>
        <div className="form-grid form-grid--2 field--full">
          <label className="field">
            <span className="field__label">Loan min</span>
            <input
              className="input"
              type="number"
              value={minLimit}
              onChange={(e) => setMinLimit(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Loan max</span>
            <input
              className="input"
              type="number"
              value={maxLimit}
              onChange={(e) => setMaxLimit(e.target.value)}
              required
            />
          </label>
          <label className="field field--full">
            <span className="field__label">Selected amount</span>
            <input
              className="input"
              type="number"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(e.target.value)}
              required
            />
          </label>
        </div>
      </form>
    </Modal>
  )
}

function UserEditModal({ user, onClose, onSaved, confirm, toast }) {
  const [name, setName] = useState(user.name || '')
  const [phoneLocal, setPhoneLocal] = useState(() => getIndianLocal10ForInput(user.phone))
  const [isBlocked, setIsBlocked] = useState(Boolean(user.isBlocked))
  const [minLimit, setMinLimit] = useState(user.loanSettings?.minLimit ?? 0)
  const [maxLimit, setMaxLimit] = useState(user.loanSettings?.maxLimit ?? 0)
  const [selectedAmount, setSelectedAmount] = useState(user.loanSettings?.selectedAmount ?? 0)
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!String(name).trim()) {
      toast('Name is required', 'error')
      return
    }
    if (!isValidIndianLocal10(phoneLocal)) {
      toast('Enter a valid 10-digit Indian mobile (starting 6–9)', 'error')
      return
    }
    const normalized = fullPhoneFromLocal10(phoneLocal)
    if (!normalized) {
      toast('Invalid phone', 'error')
      return
    }
    const minN = Number(minLimit)
    const maxN = Number(maxLimit)
    const selN = Number(selectedAmount)
    if (Number.isNaN(minN) || Number.isNaN(maxN) || Number.isNaN(selN)) {
      toast('Loan settings must be numbers', 'error')
      return
    }
    if (minN > maxN) {
      toast('Min limit cannot exceed max limit', 'error')
      return
    }
    if (selN < minN || selN > maxN) {
      const ok = await confirm('Selected amount is outside min/max. Save anyway?')
      if (!ok) return
    }

    try {
      const taken = await isPhoneUsedByAnotherUser(normalized, user.id)
      if (taken) {
        toast('Another user already uses this phone', 'error')
        return
      }
    } catch {
      toast('Could not verify phone uniqueness', 'error')
      return
    }

    const settings = await getAdminSettingsOnce()
    if (settings && (minN < settings.minLimit || maxN > settings.maxLimit)) {
      const ok = await confirm(
        `User limits (${minN}–${maxN}) are outside global settings (${settings.minLimit}–${settings.maxLimit}). Save anyway?`,
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      await updateUserDoc(user.id, {
        name: String(name).trim(),
        phone: normalized,
        role: 'user',
        isBlocked,
        loanSettings: {
          minLimit: minN,
          maxLimit: maxN,
          selectedAmount: selN,
        },
      })
      onSaved()
    } catch (err) {
      toast(err?.message || 'Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Edit user"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="user-edit-form" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="user-edit-form" className="form-grid" onSubmit={handleSave}>
        <label className="field field--full">
          <span className="field__label">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field field--full">
          <span className="field__label">Phone</span>
          <PhoneInputIndia value10={phoneLocal} onChange10={setPhoneLocal} required />
        </label>
        <label className="field field--full" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} />
          <span className="field__label" style={{ margin: 0 }}>
            Blocked
          </span>
        </label>
        <div className="form-grid form-grid--2 field--full">
          <label className="field">
            <span className="field__label">Loan min</span>
            <input
              className="input"
              type="number"
              value={minLimit}
              onChange={(e) => setMinLimit(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Loan max</span>
            <input
              className="input"
              type="number"
              value={maxLimit}
              onChange={(e) => setMaxLimit(e.target.value)}
              required
            />
          </label>
          <label className="field field--full">
            <span className="field__label">Selected amount</span>
            <input
              className="input"
              type="number"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(e.target.value)}
              required
            />
          </label>
        </div>
      </form>
    </Modal>
  )
}
