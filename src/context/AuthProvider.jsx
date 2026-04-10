import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { AuthContext } from './auth-context'

/**
 * Admin access matches firestore.rules (`request.auth.token.role == 'admin'`)
 * and firestore-schema.md (users.role === 'admin', not blocked).
 */
async function resolveAdminAccess(user) {
  const tokenResult = await user.getIdTokenResult(true)
  const claimAdmin = tokenResult.claims.role === 'admin'

  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)
  const data = snap.exists() ? snap.data() : null

  if (!data) {
    return {
      ok: false,
      reason: 'no-profile',
      message:
        'No Firestore profile yet. Your email sign-in worked, but this app expects a `users` document for your account (see setup steps below).',
    }
  }

  if (data.isBlocked === true) {
    return { ok: false, reason: 'blocked', message: 'This account is blocked.' }
  }

  if (data.role !== 'admin') {
    return {
      ok: false,
      reason: 'not-admin',
      message: 'This account is not an admin.',
    }
  }

  if (!claimAdmin) {
    return {
      ok: false,
      reason: 'missing-claim',
      message:
        'Firestore marks you as admin, but the auth token is missing the `role: admin` custom claim. Set it with the Firebase Admin SDK so Firestore rules allow access.',
    }
  }

  return { ok: true, profile: data }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setIsAdmin(false)
        setInitialized(true)
        return
      }
      try {
        const result = await resolveAdminAccess(nextUser)
        setIsAdmin(result.ok)
      } catch {
        setIsAdmin(false)
      } finally {
        setInitialized(true)
      }
    })
  }, [])

  const signIn = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    const uid = cred.user.uid
    const result = await resolveAdminAccess(cred.user)
    if (!result.ok) {
      await firebaseSignOut(auth)
      const err = new Error(result.message)
      err.code = result.reason
      err.uid = uid
      throw err
    }
    return cred.user
  }, [])

  const signOut = useCallback(() => firebaseSignOut(auth), [])

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      initialized,
      signIn,
      signOut,
    }),
    [user, isAdmin, initialized, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
