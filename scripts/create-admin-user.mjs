/**
 * Creates a new Firebase Authentication user (email/password) and promotes them to admin:
 * - Firestore `users/{uid}` with role: "admin" (per firestore-schema.md)
 * - Auth custom claim `{ role: "admin" }`
 *
 * Credentials: same as `set-admin-profile.mjs` — FIREBASE_SERVICE_ACCOUNT_PATH or
 * GOOGLE_APPLICATION_CREDENTIALS pointing at your service account JSON.
 *
 * Required (env preferred so passwords are not stored in shell history):
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *
 * Optional:
 *   ADMIN_NAME (default: Admin)
 *   ADMIN_PHONE (default: +10000000000)
 *   LOAN_MIN, LOAN_MAX, LOAN_SELECTED — loanSettings on the admin profile doc
 *
 * Usage:
 *   ADMIN_EMAIL=new@yourdomain.com ADMIN_PASSWORD='strong-secret' npm run seed:admin:create
 */

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').trim()
const password = process.env.ADMIN_PASSWORD || process.argv[3] || ''

const rawCred =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!rawCred) {
  console.error(
    'Missing credentials: set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.',
  )
  process.exit(1)
}

if (!email) {
  console.error('Missing ADMIN_EMAIL (or pass as first argument).')
  process.exit(1)
}

if (!password) {
  console.error(
    'Missing ADMIN_PASSWORD. Set it in the environment (recommended) or pass as second argument.',
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

const name = process.env.ADMIN_NAME || 'Admin'
const phone = process.env.ADMIN_PHONE || '+10000000000'
const minLimit = Number(process.env.LOAN_MIN || 100)
const maxLimit = Number(process.env.LOAN_MAX || 50000)
const selectedAmount = Number(process.env.LOAN_SELECTED || 1000)

async function main() {
  let userRecord
  try {
    userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    })
  } catch (e) {
    if (e?.code === 'auth/email-already-exists') {
      console.error(
        `An Auth user with email "${email}" already exists. To grant admin to that account, run:\n` +
          `  npm run seed:admin -- <uid>\n` +
          `Find the UID in Firebase Console → Authentication, or use getUserByEmail in a one-off script.`,
      )
      process.exit(1)
    }
    throw e
  }

  const uid = userRecord.uid
  const now = Timestamp.now()

  const ref = db.collection('users').doc(uid)
  await ref.set(
    {
      name,
      phone,
      role: 'admin',
      isBlocked: false,
      createdAt: now,
      updatedAt: now,
      loanSettings: {
        minLimit,
        maxLimit,
        selectedAmount,
      },
    },
    { merge: true },
  )

  await auth.setCustomUserClaims(uid, { role: 'admin' })

  console.log('OK — new admin created')
  console.log(`  UID: ${uid}`)
  console.log(`  Email: ${email}`)
  console.log(`  Firestore: users/${uid} (role=admin)`)
  console.log(`  Custom claims: role=admin`)
  console.log('Have them sign in with this email/password, then sign out/in once if the claim was cached.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
