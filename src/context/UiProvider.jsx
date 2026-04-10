import { useCallback, useMemo, useRef, useState } from 'react'
import { UiContext } from './ui-context'

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmMessage, setConfirmMessage] = useState(null)
  const confirmResolveRef = useRef(null)

  const toast = useCallback((message, variant = 'info') => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now())
    setToasts((t) => [...t, { id, message, variant }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 4200)
  }, [])

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmMessage(message)
    })
  }, [])

  const resolveConfirm = useCallback((value) => {
    const fn = confirmResolveRef.current
    confirmResolveRef.current = null
    setConfirmMessage(null)
    fn?.(value)
  }, [])

  const value = useMemo(
    () => ({ toast, confirm }),
    [toast, confirm],
  )

  return (
    <UiContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.variant}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
      {confirmMessage != null && (
        <div className="confirm-overlay" role="alertdialog" aria-modal="true">
          <div className="confirm-dialog">
            <p className="confirm-dialog__message">{confirmMessage}</p>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => resolveConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => resolveConfirm(true)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </UiContext.Provider>
  )
}
