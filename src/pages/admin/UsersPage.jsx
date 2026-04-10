import { useEffect, useMemo, useState } from 'react'
import {
  getAdminSettingsOnce,
  isPhoneUsedByAnotherUser,
  subscribeUsers,
  updateUserDoc,
} from '../../api/firestoreAdmin'
import { Modal } from '../../components/Modal'
import { useUi } from '../../context/useUi'
import { formatMoney } from '../../lib/format'
import { isValidPhone, normalizePhone } from '../../lib/validation'

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

  const filtered = useMemo(() => {
    let list = rows
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) =>
          String(u.name || '').toLowerCase().includes(q) ||
          String(u.phone || '').toLowerCase().includes(q),
      )
    }
    if (statusFilter === 'active') list = list.filter((u) => !u.isBlocked)
    if (statusFilter === 'blocked') list = list.filter((u) => u.isBlocked)
    return list
  }, [rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const slice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  return (
    <div>
      <h1 className="admin-page-title">Users</h1>
      <p className="admin-page-desc muted">Manage borrower profiles, limits, and block status.</p>

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
                  <th>Role</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">No users match your filters.</div>
                    </td>
                  </tr>
                ) : (
                  slice.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name || '—'}</td>
                      <td className="admin-table__mono">{u.phone || '—'}</td>
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
                      <td>{u.role || '—'}</td>
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

function UserEditModal({ user, onClose, onSaved, confirm, toast }) {
  const [name, setName] = useState(user.name || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [role, setRole] = useState(user.role || 'user')
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
    if (!isValidPhone(phone)) {
      toast('Enter a valid phone number', 'error')
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
      const ok = await confirm(
        'Selected amount is outside min/max. Save anyway?',
      )
      if (!ok) return
    }

    const normalized = normalizePhone(phone)
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
        role,
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
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label className="field field--full">
          <span className="field__label">Role</span>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label className="field field--full" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={isBlocked}
            onChange={(e) => setIsBlocked(e.target.checked)}
          />
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
