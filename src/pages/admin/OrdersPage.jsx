import { useEffect, useMemo, useState } from 'react'
import {
  createOrder,
  deleteOrder,
  getAdminSettingsOnce,
  subscribeOrders,
  subscribeUsers,
  updateOrder,
} from '../../api/firestoreAdmin'
import { Modal } from '../../components/Modal'
import { PhoneInputIndia } from '../../components/PhoneInputIndia'
import { useUi } from '../../context/useUi'
import {
  formatDate,
  formatIndianPhoneDisplay,
  formatMoney,
  fromDatetimeLocal,
  toDatetimeLocalValue,
} from '../../lib/format'
import {
  digitsOnly,
  fullPhoneFromLocal10,
  getIndianLocal10ForInput,
  isValidIndianLocal10,
  loanAmountInBounds,
} from '../../lib/validation'

const PAGE_SIZE = 10

function datetimeLocalNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function OrdersPage({ completed }) {
  const { toast, confirm } = useUi()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => {
    const unsubUsers = subscribeUsers(
      (list) => setUsers(list),
      () => {},
    )
    return () => unsubUsers()
  }, [])

  const borrowerUsers = useMemo(() => users.filter((u) => u.role === 'user'), [users])

  useEffect(() => {
    const unsub = subscribeOrders(
      completed,
      (list) => {
        setRows(list)
        setLoading(false)
        setError('')
      },
      (e) => {
        setError(e?.message || 'Failed to load orders')
        setLoading(false)
        toast('Failed to load orders', 'error')
      },
    )
    return () => unsub()
  }, [completed, toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digitQ = digitsOnly(search)
    if (!q) return rows
    return rows.filter((o) => {
      const nameMatch = String(o.userName || '').toLowerCase().includes(q)
      const phoneDigits = digitsOnly(o.phone || '')
      const phoneMatch = digitQ.length > 0 && phoneDigits.includes(digitQ)
      return nameMatch || phoneMatch
    })
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const slice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  const title = completed ? 'Completed orders' : 'Pending orders'

  async function handleDelete(order) {
    const ok = await confirm(`Delete order for ${order.userName || order.id}?`)
    if (!ok) return
    try {
      await deleteOrder(order.id)
      toast('Order deleted', 'success')
    } catch (e) {
      toast(e?.message || 'Delete failed', 'error')
    }
  }

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
          {title}
        </h1>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
          New order
        </button>
      </div>
      <p className="admin-page-desc muted">
        {completed
          ? 'Completed loans. You can edit or move back to pending.'
          : 'Active loans. Update payment link, due date, or mark complete.'}
      </p>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <input
          type="search"
          className="input admin-toolbar__search"
          placeholder="Search loan name or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          aria-label="Search orders"
        />
      </div>

      {loading ? (
        <div className="admin-loading">Loading orders…</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Loan name</th>
                  <th>Phone</th>
                  <th>Loan</th>
                  <th>Total due</th>
                  <th>Due date</th>
                  <th>Payment URL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No orders found.</div>
                    </td>
                  </tr>
                ) : (
                  slice.map((o) => (
                    <tr key={o.id}>
                      <td>{o.userName || '—'}</td>
                      <td className="admin-table__mono">{formatIndianPhoneDisplay(o.phone)}</td>
                      <td>{formatMoney(o.loanAmount)}</td>
                      <td>{formatMoney(o.totalDueAmount)}</td>
                      <td>{formatDate(o.dueDate)}</td>
                      <td
                        className="admin-table__mono"
                        style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {o.paymentUrl ? (
                          <a href={o.paymentUrl} target="_blank" rel="noreferrer">
                            link
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className="btn-row">
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(o)}>
                            Edit
                          </button>
                          <button type="button" className="btn btn--danger btn--sm" onClick={() => handleDelete(o)}>
                            Delete
                          </button>
                        </div>
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
                Page {pageSafe} of {totalPages} · {filtered.length} orders
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
        <OrderModal
          mode="create"
          users={borrowerUsers}
          defaultCompleted={completed}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            toast('Order created', 'success')
          }}
          confirm={confirm}
          toast={toast}
        />
      )}

      {editing && (
        <OrderModal
          mode="edit"
          order={editing}
          users={borrowerUsers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            toast('Order updated', 'success')
          }}
          confirm={confirm}
          toast={toast}
        />
      )}
    </div>
  )
}

function OrderModal({ mode, order, users, defaultCompleted, onClose, onSaved, confirm, toast }) {
  const isEdit = mode === 'edit'
  const [userId, setUserId] = useState(order?.userId || '')
  const [loanName, setLoanName] = useState(order?.userName || '')
  const [phoneLocal, setPhoneLocal] = useState(() => getIndianLocal10ForInput(order?.phone))
  const [loanAmount, setLoanAmount] = useState(order?.loanAmount ?? '')
  const [totalDueAmount, setTotalDueAmount] = useState(order?.totalDueAmount ?? '')
  const [loanDate, setLoanDate] = useState(
    isEdit && order ? toDatetimeLocalValue(order.loanDate) : datetimeLocalNow(),
  )
  const [dueDate, setDueDate] = useState(isEdit && order ? toDatetimeLocalValue(order.dueDate) : '')
  const [paymentUrl, setPaymentUrl] = useState(order?.paymentUrl || '')
  const [isCompleted, setIsCompleted] = useState(
    isEdit ? Boolean(order?.isCompleted) : Boolean(defaultCompleted),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit && userId) {
      const u = users.find((x) => x.id === userId)
      if (u) setPhoneLocal(getIndianLocal10ForInput(u.phone))
    }
  }, [userId, users, isEdit])

  async function handleSubmit(e) {
    e.preventDefault()
    const loanD = fromDatetimeLocal(loanDate)
    const dueD = fromDatetimeLocal(dueDate)
    if (!loanD || !dueD) {
      toast('Loan date and due date are required', 'error')
      return
    }
    const la = Number(loanAmount)
    const td = Number(totalDueAmount)
    if (Number.isNaN(la) || Number.isNaN(td)) {
      toast('Amounts must be numbers', 'error')
      return
    }

    const global = await getAdminSettingsOnce()
    if (global && !loanAmountInBounds(la, global)) {
      const ok = await confirm(
        `Loan amount ${la} is outside global limits (${global.minLimit}–${global.maxLimit}). Continue?`,
      )
      if (!ok) return
    }

    if (!String(loanName).trim() || !String(phoneLocal).trim() || !String(userId).trim()) {
      toast('Borrower, loan name, and phone are required', 'error')
      return
    }

    if (!isValidIndianLocal10(phoneLocal)) {
      toast('Enter a valid 10-digit Indian mobile (starting 6–9)', 'error')
      return
    }
    const phoneNorm = fullPhoneFromLocal10(phoneLocal)
    if (!phoneNorm) {
      toast('Invalid phone', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateOrder(order.id, {
          userName: String(loanName).trim(),
          phone: phoneNorm,
          loanAmount: la,
          totalDueAmount: td,
          loanDate: loanD,
          dueDate: dueD,
          paymentUrl: String(paymentUrl),
          isCompleted,
        })
      } else {
        await createOrder({
          userId: String(userId).trim(),
          userName: String(loanName).trim(),
          phone: phoneNorm,
          loanAmount: la,
          totalDueAmount: td,
          loanDate: loanD,
          dueDate: dueD,
          paymentUrl: String(paymentUrl),
          isCompleted,
        })
      }
      onSaved()
    } catch (err) {
      toast(err?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit order' : 'New order'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="order-form" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="order-form" className="form-grid" onSubmit={handleSubmit}>
        {!isEdit && (
          <label className="field field--full">
            <span className="field__label">Borrower (Firestore user ID)</span>
            <select
              className="input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.id} — {formatIndianPhoneDisplay(u.phone)}
                </option>
              ))}
            </select>
          </label>
        )}
        {isEdit && (
          <p className="muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
            User ID: <code className="inline-code">{order.userId}</code>
          </p>
        )}
        <label className="field field--full">
          <span className="field__label">Loan name</span>
          <input
            className="input"
            value={loanName}
            onChange={(e) => setLoanName(e.target.value)}
            placeholder="Enter a label for this loan"
            required
          />
        </label>
        <p className="muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
          Not auto-filled from the borrower.
        </p>
        <label className="field field--full">
          <span className="field__label">Phone</span>
          <PhoneInputIndia value10={phoneLocal} onChange10={setPhoneLocal} required />
        </label>
        <div className="form-grid form-grid--2 field--full">
          <label className="field">
            <span className="field__label">Loan amount</span>
            <input
              className="input"
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Total due</span>
            <input
              className="input"
              type="number"
              value={totalDueAmount}
              onChange={(e) => setTotalDueAmount(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-grid form-grid--2 field--full">
          <label className="field">
            <span className="field__label">Loan date</span>
            <input
              className="input"
              type="datetime-local"
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Due date</span>
            <input
              className="input"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="field field--full">
          <span className="field__label">Payment URL</span>
          <input
            className="input"
            value={paymentUrl}
            onChange={(e) => setPaymentUrl(e.target.value)}
            placeholder="https://"
          />
        </label>
        <label className="field field--full" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} />
          <span className="field__label" style={{ margin: 0 }}>
            Completed
          </span>
        </label>
      </form>
    </Modal>
  )
}
