/**
 * Creates/updates Firestore `users/{uid}` per firestore.rules and sets Auth custom claim role: "admin".
 *
 * Prerequisites:
 * - A Firebase Auth user must already exist with this UID (e.g. email/password sign-up).
 * - Service account JSON with permission for Firestore + Firebase Authentication.
 *
 * Usage:
 *   npm run seed:admin
 *   npm run seed:admin -- <otherUid>
 *
 * Env (in `.env` or shell):
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./path-to-service-account.json
 *   or GOOGLE_APPLICATION_CREDENTIALS (absolute or relative to cwd)
 *
 * Optional overrides:
 *   ADMIN_PROFILE_NAME, ADMIN_PROFILE_PHONE, LOAN_MIN, LOAN_MAX, LOAN_SELECTED
 */

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const DEFAULT_UID = 'Unc0wyG552MTnGAr9Uck9wR3wYT2'

const uid = process.argv[2] || DEFAULT_UID

const rawCred =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!rawCred) {
  console.error(
    'Missing credentials: set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file.',
  )
  process.exit(1)
}

const credPath = resolve(process.cwd(), rawCred)

let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'))
} catch (e) {
  console.error(`Could not read service account JSON at: ${credPath}`)
  console.error(e?.message || e)
  process.exit(1)
}

initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()
const auth = getAuth()

const name = process.env.ADMIN_PROFILE_NAME || 'Admin'
const phone = process.env.ADMIN_PROFILE_PHONE || '+10000000000'
const minLimit = Number(process.env.LOAN_MIN || 100)
const maxLimit = Number(process.env.LOAN_MAX || 50000)
const selectedAmount = Number(process.env.LOAN_SELECTED || 1000)

async function main() {
  let userRecord
  try {
    userRecord = await auth.getUser(uid)
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      console.error(
        `No Firebase Auth user with uid "${uid}". Create the user in Authentication first, then run this script again.`,
      )
      process.exit(1)
    }
    throw e
  }

  const ref = db.collection('users').doc(uid)
  const snap = await ref.get()
  const now = Timestamp.now()

  const payload = {
    name,
    phone,
    role: 'admin',
    isBlocked: false,
    updatedAt: now,
    loanSettings: {
      minLimit,
      maxLimit,
      selectedAmount,
    },
  }

  if (!snap.exists) {
    payload.createdAt = now
  } else {
    const prev = snap.data()
    payload.createdAt = prev?.createdAt ?? now
  }

  await ref.set(payload, { merge: true })

  await auth.setCustomUserClaims(uid, { role: 'admin' })

  console.log('OK')
  console.log(`  Firestore: users/${uid}`)
  console.log(`  Custom claims: role=admin`)
  console.log(`  Auth email: ${userRecord.email || '(no email)'}`)
  console.log('Have the user sign out and sign in again so the new token includes the claim.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
