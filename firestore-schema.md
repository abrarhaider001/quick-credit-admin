# Firestore schema

**`users/{userId}`** — `userId` = Firebase Auth UID  
| Field | Type |
|-------|------|
| name | string |
| phone | string |
| role | string (`admin` \| `user`) |
| isBlocked | boolean |
| showBankAccount | boolean (optional; if false, loan app hides bank account UI for this user) |
| createdAt | timestamp |
| updatedAt | timestamp |
| loanSettings | map |

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
| updatedAt | timestamp |

---

Auth custom claim for admins: `role` = `"admin"`.  
`orders.userId` must equal the borrower’s Auth UID.  
Phone uniqueness: enforce outside rules (e.g. Cloud Function / `phone_index`).
