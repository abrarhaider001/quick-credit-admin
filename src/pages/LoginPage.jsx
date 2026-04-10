import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/useAuth'

function validateEmail(value) {
  const v = value.trim()
  if (!v) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.'
  return ''
}

function validatePassword(value) {
  if (!value) return 'Password is required.'
  if (value.length < 6) return 'Password must be at least 6 characters.'
  return ''
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, user, isAdmin, initialized } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [helpCode, setHelpCode] = useState('')
  const [helpUid, setHelpUid] = useState('')
  const [uidCopied, setUidCopied] = useState(false)

  const emailError = touched.email ? validateEmail(email) : ''
  const passwordError = touched.password ? validatePassword(password) : ''
  const formValid = !validateEmail(email) && !validatePassword(password)

  const flashMessage = location.state?.message

  useEffect(() => {
    if (initialized && user && isAdmin) {
      navigate('/dashboard', { replace: true })
    }
  }, [initialized, user, isAdmin, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    setSubmitError('')
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    if (eErr || pErr) return

    setSubmitting(true)
    setHelpCode('')
    setHelpUid('')
    setUidCopied(false)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const code = err?.code
      let msg = err?.message || 'Sign-in failed. Try again.'
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password')
        msg = 'Incorrect email or password.'
      else if (code === 'auth/too-many-requests')
        msg = 'Too many attempts. Try again later.'
      else if (code === 'auth/user-not-found') msg = 'No account found for this email.'
      setSubmitError(msg)
      if (typeof err?.uid === 'string') setHelpUid(err.uid)
      if (typeof code === 'string') setHelpCode(code)
    } finally {
      setSubmitting(false)
    }
  }

  async function copyHelpUid() {
    if (!helpUid) return
    try {
      await navigator.clipboard.writeText(helpUid)
      setUidCopied(true)
      setTimeout(() => setUidCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="screen-fill auth-screen auth-screen--form-left">
      <div className="auth-screen__bg" aria-hidden="true">
        <span className="auth-screen__bg-glow" />
        <span className="auth-screen__bg-grid" />
      </div>

      <div className="auth-screen__form-column">
        <div className="auth-screen__panel-wrap">
          <div className="auth-screen__panel">
            <div className="auth-screen__panel-brand" aria-label="QuickCredit Admin">
              <BrandLogo decorative className="auth-screen__panel-logo" />
              <div>
                <p className="auth-screen__panel-name">QuickCredit</p>
                <p className="auth-screen__panel-sub">Admin</p>
              </div>
            </div>

            <div className="auth-screen__header">
              <h1 className="auth-screen__title">Welcome back</h1>
              <p className="muted">Use your admin email and password to continue.</p>
            </div>

            {(flashMessage || submitError) && (
              <div
                className={`notice ${submitError ? 'notice--error' : 'notice--info'}`}
                role="alert"
              >
                {submitError || flashMessage}
              </div>
            )}

            {helpCode === 'no-profile' && helpUid && (
              <div className="setup-panel">
                <p className="setup-panel__title">One-time Firestore setup</p>
                <p className="setup-panel__text muted">
                  Authentication succeeded, but there is no document at{' '}
                  <code className="inline-code">users/{helpUid}</code>. Rules require this profile
                  before the admin app can continue.
                </p>
                <div className="setup-panel__uid">
                  <code className="setup-panel__uid-value">{helpUid}</code>
                  <button
                    type="button"
                    className="btn btn--ghost btn--compact"
                    onClick={copyHelpUid}
                  >
                    {uidCopied ? 'Copied' : 'Copy UID'}
                  </button>
                </div>
                <p className="setup-panel__text muted">
                  In Firebase Console → Firestore → create document ID exactly as above (use the UID,
                  not your email). Add fields to match{' '}
                  <code className="inline-code">firestore.rules</code>
                  :
                </p>
                <ul className="setup-panel__list">
                  <li>
                    <strong>name</strong> (string)
                  </li>
                  <li>
                    <strong>phone</strong> (string)
                  </li>
                  <li>
                    <strong>role</strong> (string) — <code className="inline-code">admin</code>
                  </li>
                  <li>
                    <strong>isBlocked</strong> (boolean) — <code className="inline-code">false</code>
                  </li>
                  <li>
                    <strong>createdAt</strong>, <strong>updatedAt</strong> (timestamp)
                  </li>
                  <li>
                    <strong>loanSettings</strong> (map) with only{' '}
                    <code className="inline-code">minLimit</code>,{' '}
                    <code className="inline-code">maxLimit</code>,{' '}
                    <code className="inline-code">selectedAmount</code> (numbers)
                  </li>
                </ul>
                <p className="setup-panel__text muted">
                  After the document exists, you must also set the Auth{' '}
                  <strong>custom claim</strong>{' '}
                  <code className="inline-code">role: &quot;admin&quot;</code>{' '}
                  (Firebase Admin SDK), or the next sign-in will explain that step. Then sign in again.
                </p>
              </div>
            )}

            {helpCode === 'missing-claim' && helpUid && (
              <div className="setup-panel setup-panel--warn">
                <p className="setup-panel__title">Custom claim required</p>
                <p className="setup-panel__text muted">
                  Your Firestore profile looks like an admin, but{' '}
                  <code className="inline-code">firestore.rules</code>{' '}
                  checks{' '}
                  <code className="inline-code">request.auth.token.role == &apos;admin&apos;</code>. Set that
                  claim for UID <code className="inline-code">{helpUid}</code> with the Admin SDK (e.g.{' '}
                  <code className="inline-code">setCustomUserClaims</code>), then sign in again.
                </p>
              </div>
            )}

            <form className="form" onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  className={`input ${emailError ? 'input--error' : ''}`}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
                {emailError && (
                  <span id="email-error" className="field__error">
                    {emailError}
                  </span>
                )}
              </label>

              <label className="field">
                <span className="field__label">Password</span>
                <input
                  className={`input ${passwordError ? 'input--error' : ''}`}
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                {passwordError && (
                  <span id="password-error" className="field__error">
                    {passwordError}
                  </span>
                )}
              </label>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={!formValid || submitting}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
