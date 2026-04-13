import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { normalizeIndianPhoneStorage } from '../lib/validation'

const USERS = 'users'
const ORDERS = 'orders'
const BLOCKED = 'blocked_users'
const SETTINGS = 'admin_settings'
const CONFIG_ID = 'config'

export function subscribeUsers(onData, onError) {
  const q = query(collection(db, USERS), orderBy('name'))
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    },
    onError,
  )
}

/**
 * @param {boolean} completed
 * Uses only `orderBy('createdAt')` so no composite index is required (Firestore auto-indexes
 * single fields). Filters `isCompleted` in the client — fine for typical admin volumes.
 */
export function subscribeOrders(completed, onData, onError) {
  const q = query(collection(db, ORDERS), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.isCompleted === completed)
      onData(rows)
    },
    onError,
  )
}

export function subscribeBlocked(onData, onError) {
  const q = query(collection(db, BLOCKED), orderBy('blockedAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    },
    onError,
  )
}

export function subscribeAdminSettings(onData, onError) {
  const ref = doc(db, SETTINGS, CONFIG_ID)
  return onSnapshot(
    ref,
    (snap) => {
      onData(snap.exists() ? snap.data() : null)
    },
    onError,
  )
}

export async function getAdminSettingsOnce() {
  const ref = doc(db, SETTINGS, CONFIG_ID)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function isPhoneUsedByAnotherUser(phone, excludeUserId) {
  const p = normalizeIndianPhoneStorage(phone)
  if (!p) return false
  const q = query(collection(db, USERS), where('phone', '==', p))
  const snap = await getDocs(q)
  return snap.docs.some((d) => excludeUserId == null || d.id !== excludeUserId)
}

export async function isPhoneInBlockedList(phone) {
  const p = normalizeIndianPhoneStorage(phone)
  if (!p) return false
  const q = query(collection(db, BLOCKED), where('phone', '==', p))
  const snap = await getDocs(q)
  return !snap.empty
}

/**
 * @param {string} userId
 * @param {object} patch name, phone, isBlocked, loanSettings, role (unchanged usually)
 */
export async function updateUserDoc(userId, patch) {
  const ref = doc(db, USERS, userId)
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUserDoc(userId) {
  await deleteDoc(doc(db, USERS, userId))
}

/**
 * Firestore-only borrower profile (no Firebase Auth). Auto document ID.
 * Phone stored as +91XXXXXXXXXX.
 */
export async function createUserDoc({ name, phone, loanSettings, isBlocked, showBankAccount }) {
  const normalized = normalizeIndianPhoneStorage(phone)
  if (!normalized) throw new Error('Invalid Indian mobile number')
  await addDoc(collection(db, USERS), {
    name: String(name).trim(),
    phone: normalized,
    role: 'user',
    isBlocked: Boolean(isBlocked),
    showBankAccount: showBankAccount !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    loanSettings: {
      minLimit: Number(loanSettings.minLimit),
      maxLimit: Number(loanSettings.maxLimit),
      selectedAmount: Number(loanSettings.selectedAmount),
    },
  })
}

/**
 * @param {object} data
 */
export async function createOrder(data) {
  await addDoc(collection(db, ORDERS), {
    userId: data.userId,
    userName: data.userName,
    phone: data.phone,
    loanAmount: Number(data.loanAmount),
    totalDueAmount: Number(data.totalDueAmount),
    loanDate: Timestamp.fromDate(data.loanDate),
    dueDate: Timestamp.fromDate(data.dueDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    paymentUrl: data.paymentUrl ?? '',
    isCompleted: Boolean(data.isCompleted),
  })
}

export async function updateOrder(orderId, data) {
  const ref = doc(db, ORDERS, orderId)
  const payload = {
    updatedAt: serverTimestamp(),
  }
  if (data.userName != null) payload.userName = data.userName
  if (data.phone != null) payload.phone = data.phone
  if (data.loanAmount != null) payload.loanAmount = Number(data.loanAmount)
  if (data.totalDueAmount != null) payload.totalDueAmount = Number(data.totalDueAmount)
  if (data.paymentUrl != null) payload.paymentUrl = data.paymentUrl
  if (data.isCompleted != null) payload.isCompleted = Boolean(data.isCompleted)
  if (data.loanDate != null) payload.loanDate = Timestamp.fromDate(data.loanDate)
  if (data.dueDate != null) payload.dueDate = Timestamp.fromDate(data.dueDate)
  await updateDoc(ref, payload)
}

export async function deleteOrder(orderId) {
  await deleteDoc(doc(db, ORDERS, orderId))
}

export async function addBlockedPhone(phone) {
  const normalized = normalizeIndianPhoneStorage(phone)
  if (!normalized) throw new Error('Invalid Indian mobile number')
  await addDoc(collection(db, BLOCKED), {
    phone: normalized,
    blockedAt: serverTimestamp(),
  })
}

/** Removes every `blocked_users` row for this phone (handles duplicate docs). */
export async function removeBlockedEntriesForPhone(phone) {
  const normalized = normalizeIndianPhoneStorage(phone)
  if (!normalized) return
  const q = query(collection(db, BLOCKED), where('phone', '==', normalized))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, BLOCKED, d.id))))
}

/**
 * Keeps `blocked_users` aligned after a user’s phone / isBlocked changes.
 * @param {{ phone: string, previousPhone?: string | null, isBlocked: boolean }} opts
 */
export async function syncBlockedListAfterUserSave({ phone, previousPhone, isBlocked }) {
  const n = normalizeIndianPhoneStorage(phone)
  if (!n) return
  const prev =
    previousPhone != null && String(previousPhone).trim() !== ''
      ? normalizeIndianPhoneStorage(previousPhone)
      : null

  if (isBlocked) {
    const exists = await isPhoneInBlockedList(n)
    if (!exists) await addBlockedPhone(n)
    if (prev && prev !== n) await removeBlockedEntriesForPhone(prev)
  } else {
    await removeBlockedEntriesForPhone(n)
    if (prev && prev !== n) await removeBlockedEntriesForPhone(prev)
  }
}

/** Sets `isBlocked` on every `users` doc with this phone (typically 0 or 1). */
export async function setUsersBlockedByPhone(phone, isBlocked) {
  const normalized = normalizeIndianPhoneStorage(phone)
  if (!normalized) return
  const q = query(collection(db, USERS), where('phone', '==', normalized))
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(doc(db, USERS, d.id), {
        isBlocked: Boolean(isBlocked),
        updatedAt: serverTimestamp(),
      }),
    ),
  )
}

export async function deleteBlockedDoc(blockedDocId) {
  await deleteDoc(doc(db, BLOCKED, blockedDocId))
}

export async function saveAdminSettings({ minLimit, maxLimit, defaultInterestRate }) {
  const ref = doc(db, SETTINGS, CONFIG_ID)
  const payload = {
    minLimit: Number(minLimit),
    maxLimit: Number(maxLimit),
    updatedAt: serverTimestamp(),
  }
  if (defaultInterestRate !== '' && defaultInterestRate != null) {
    payload.defaultInterestRate = Number(defaultInterestRate)
  }
  await setDoc(ref, payload, { merge: true })
}

export async function fetchOverviewStats() {
  const usersQ = query(collection(db, USERS), where('role', '==', 'user'))
  const pendingQ = query(collection(db, ORDERS), where('isCompleted', '==', false))
  const completedQ = query(collection(db, ORDERS), where('isCompleted', '==', true))

  const [usersCount, pendingCount, completedCount, pendingSnap] = await Promise.all([
    getCountFromServer(usersQ),
    getCountFromServer(pendingQ),
    getCountFromServer(completedQ),
    getDocs(pendingQ),
  ])

  let outstandingTotal = 0
  pendingSnap.forEach((d) => {
    const x = d.data().loanAmount
    if (typeof x === 'number') outstandingTotal += x
  })

  return {
    totalUsers: usersCount.data().count,
    pendingOrders: pendingCount.data().count,
    completedOrders: completedCount.data().count,
    outstandingLoanAmount: outstandingTotal,
  }
}
