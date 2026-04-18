import { useEffect, useState } from 'react'
import { saveAdminSettings, subscribeAdminSettings } from '../../api/firestoreAdmin'
import { useUi } from '../../context/useUi'
import { formatCardNumberInput } from '../../lib/format'

export default function SettingsPage() {
  const { toast } = useUi()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [minLimit, setMinLimit] = useState('')
  const [maxLimit, setMaxLimit] = useState('')
  const [defaultInterestRate, setDefaultInterestRate] = useState('')
  const [bankAccountLabel, setBankAccountLabel] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = subscribeAdminSettings(
      (d) => {
        setData(d)
        setLoading(false)
        setError('')
        if (d) {
          setMinLimit(String(d.minLimit ?? ''))
          setMaxLimit(String(d.maxLimit ?? ''))
          setDefaultInterestRate(
            d.defaultInterestRate != null ? String(d.defaultInterestRate) : '',
          )
          setBankAccountLabel(String(d.bankAccountLabel ?? ''))
          setBankAccountNumber(formatCardNumberInput(d.bankAccountNumber))
          setBankName(String(d.bankName ?? ''))
        }
      },
      (e) => {
        setError(e?.message || 'Failed to load settings')
        setLoading(false)
        toast('Failed to load settings', 'error')
      },
    )
    return () => unsub()
  }, [toast])

  async function handleSave(e) {
    e.preventDefault()
    const minN = Number(minLimit)
    const maxN = Number(maxLimit)
    if (Number.isNaN(minN) || Number.isNaN(maxN)) {
      toast('Min and max must be numbers', 'error')
      return
    }
    if (minN > maxN) {
      toast('Min cannot exceed max', 'error')
      return
    }
    setSaving(true)
    try {
      await saveAdminSettings({
        minLimit: minN,
        maxLimit: maxN,
        defaultInterestRate: defaultInterestRate === '' ? null : defaultInterestRate,
        bankAccountLabel,
        bankAccountNumber,
        bankName,
      })
      toast('Settings saved', 'success')
    } catch (err) {
      toast(err?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">Admin settings</h1>
      <p className="admin-page-desc muted">
        Global loan bounds for validation. Document: <code className="inline-code">admin_settings/config</code>.
      </p>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading settings…</div>
      ) : (
        <form className="settings-form-layout" onSubmit={handleSave}>
          <section className="table-wrap settings-panel">
            <div className="settings-panel__body form-grid">
              <h2 className="settings-panel__title">Global settings</h2>
              <label className="field">
                <span className="field__label">Global min limit</span>
                <input
                  className="input"
                  type="number"
                  value={minLimit}
                  onChange={(e) => setMinLimit(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field__label">Global max limit</span>
                <input
                  className="input"
                  type="number"
                  value={maxLimit}
                  onChange={(e) => setMaxLimit(e.target.value)}
                  required
                />
              </label>
              <label className="field field--full">
                <span className="field__label">Default interest rate (optional)</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={defaultInterestRate}
                  onChange={(e) => setDefaultInterestRate(e.target.value)}
                  placeholder="e.g. 12.5"
                />
              </label>
            </div>
          </section>

          <section className="table-wrap settings-panel settings-panel--bank">
            <div className="settings-panel__body form-grid">
              <h2 className="settings-panel__title settings-panel__title--bank">Bank account information</h2>
              <label className="field field--full">
                <span className="field__label settings-bank-label">Card label (optional)</span>
                <input
                  className="input"
                  value={bankAccountLabel}
                  onChange={(e) => setBankAccountLabel(e.target.value)}
                  placeholder="Primary bank account"
                />
              </label>
              <label className="field field--full">
                <span className="field__label settings-bank-label">Bank account number (optional)</span>
                <input
                  className="input"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(formatCardNumberInput(e.target.value))}
                  placeholder="1234 5678 9012 8842"
                  inputMode="numeric"
                />
              </label>
              <label className="field field--full">
                <span className="field__label settings-bank-label">Bank name (optional)</span>
                <input
                  className="input"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="QuickCredit Partner Bank"
                />
              </label>
            </div>
          </section>

          <section className="table-wrap settings-panel settings-panel--actions">
            <div className="settings-panel__body">
              {!data && (
                <p className="muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
                  No config exists yet — saving will create <code className="inline-code">config</code>.
                </p>
              )}
              <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          </section>
        </form>
      )}
    </div>
  )
}
