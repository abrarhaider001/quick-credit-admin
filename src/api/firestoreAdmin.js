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
  const p = String(phone).trim()
  const q = query(collection(db, USERS), where('phone', '==', p))
  const snap = await getDocs(q)
  return snap.docs.some((d) => d.id !== excludeUserId)
}

export async function isPhoneInBlockedList(phone) {
  const p = String(phone).trim()
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
  await addDoc(collection(db, BLOCKED), {
    phone: String(phone).trim(),
    blockedAt: serverTimestamp(),
  })
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
  const usersQ = collection(db, USERS)
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
