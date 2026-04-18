# Firestore schema

**`users/{userId}`** — `userId` = Firebase Auth UID  
| Field | Type |
|-------|------|
| name | string |
| phone | string |
| role | string (`admin` \| `user`) |
| isBlocked | boolean |
| showBankAccount | boolean (optional; if false, loan app hides bank account UI for this user) |
| useGlobalBankDetails | boolean (optional; default treated as `true` — borrower sees bank info from `admin_settings/config`) |
| bankAccountLabel | string (optional; used when `useGlobalBankDetails` is `false`) |
| bankAccountNumber | string (optional; e.g. spaced groups `1234 5678 9012 8842`) |
| bankName | string (optional) |
| createdAt | timestamp |
| updatedAt | timestamp |
| loanSettings | map |

Per-user bank display: admins set `useGlobalBankDetails` to `true` so the user sees the global card from **Admin settings**, or `false` and fill the three bank fields so only that user sees those values. Self-service user updates cannot change these bank fields (enforced in `firestore.rules`).

**`loanSettings` (map)**  
| Field | Type |
|-------|------|
| minLimit | number |
| maxLimit | number |
| selectedAmount | number |

---

**`orders/{orderId}`**  
| Field | Type |
|-------|------|
| userId | string (Auth UID) |
| userName | string |
| phone | string |
| loanAmount | number |
| totalDueAmount | number |
| loanDate | timestamp |
| dueDate | timestamp |
| createdAt | timestamp |
| updatedAt | timestamp |
| paymentUrl | string |
| isCompleted | boolean |
| loanImageDataUrl | string (optional) — image as a `data:image/...;base64,...` data URL; keep under ~450 KB source file so the document stays under Firestore’s 1 MiB limit |

---

**`blocked_users/{docId}`**  
| Field | Type |
|-------|------|
| phone | string |
| blockedAt | timestamp |

---

**`admin_settings/config`** (single doc)  
| Field | Type |
|-------|------|
| minLimit | number |
| maxLimit | number |
| defaultInterestRate | number (optional) |
| bankAccountLabel | string (optional; e.g. `Primary bank account`) |
| bankAccountNumber | string (optional; e.g. `1234 5678 9012 8842`) |
| bankName | string (optional; e.g. `QuickCredit Partner Bank`) |
| updatedAt | timestamp |

---

Auth custom claim for admins: `role` = `"admin"`.  
`orders.userId` must equal the borrower’s Auth UID.  
Phone uniqueness: enforce outside rules (e.g. Cloud Function / `phone_index`).

`admin_settings/config` permissions:
- Read: any signed-in user (admin and borrower apps can display shared bank card/settings info).
- Create/Update/Delete: admin only.

**`users` bank fields permissions**
- Read: public as existing `users` read rules (borrower app can read own or listed profiles per your app rules).
- Create/Update bank-related fields: admin only (owners cannot add or change `useGlobalBankDetails` / `bankAccountLabel` / `bankAccountNumber` / `bankName` via self-update).
