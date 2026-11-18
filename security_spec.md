# Security Specification — TOMOYO PRIVAT & BIMBEL EDUCATION

## 1. Data Invariants
1. **Identity & Email Verification**: All authenticated mutations require `request.auth != null && request.auth.token.email_verified == true`.
2. **Strict Admin Authorization**: Admin access requires BOTH `request.auth.uid == 'Tlqf2dNHYCRuYmxgEbHFa783iDs1'` AND `request.auth.token.email == 'tomoyoeducation.com@gmail.com'` AND `request.auth.token.email_verified == true`.
3. **Parent Ownership Isolation**: Parents may only read, list, create, and update (`while pending`) student registrations where `parentId == request.auth.uid`. Parents cannot read or list another parent's profile, children, or payments.
4. **Approval Integrity**: Parents cannot set `status` to `'approved'` or `'rejected'`, nor change `academicStatus` from `'menunggu'` on creation or update. Only Admin may approve, reject, change academic status, or delete registrations.
5. **No Shadow Fields**: Every collection enforces strict `keys().hasAll(...) && keys().hasOnly(...)` on creation and `affectedKeys().hasOnly(...)` on update.
6. **Temporal Integrity**: `createdAt` and `updatedAt` are validated against `request.time`, and `createdAt` / `parentId` are immutable after creation.
7. **CMS & Financial Isolation**: Public users may only read published CMS documents (`isPublished == true`). Only Admin may write to CMS collections (`packages`, `branches`, `teachers`, `siteContent`, `gallery`, `announcements`, `schedules`) or `payments`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing**: Parent A creates `/students/s1` with `parentId: "parent-B-uid"`. -> Expected: `PERMISSION_DENIED`.
2. **Self-Approval Escalation**: Parent A creates `/students/s1` with `status: "approved"`. -> Expected: `PERMISSION_DENIED`.
3. **Update Status Bypass**: Parent A updates `/students/s1` changing `status: "approved"` or `academicStatus: "aktif"`. -> Expected: `PERMISSION_DENIED`.
4. **Post-Approval Tampering**: Parent A tries to update `/students/s1` after admin marked it `approved`. -> Expected: `PERMISSION_DENIED`.
5. **Cross-Parent Read / Query Scraping**: Parent A issues `list` on `/students` without `where("parentId", "==", uid)` or `get` on Parent B's student. -> Expected: `PERMISSION_DENIED`.
6. **Shadow Field Injection**: Parent A creates `/students/s1` with extra ghost field `isAdmin: true`. -> Expected: `PERMISSION_DENIED`.
7. **Email Spoofing (Unverified Email)**: User with `email == "tomoyoeducation.com@gmail.com"` and `email_verified: false` attempts admin write. -> Expected: `PERMISSION_DENIED`.
8. **ID Poisoning**: Write to `/students/` with 1,500-character document ID or invalid characters (`../hack`). -> Expected: `PERMISSION_DENIED`.
9. **Resource Exhaustion (1MB String)**: Parent A submits `childName` with 50,000 characters. -> Expected: `PERMISSION_DENIED`.
10. **CMS Tampering by Parent**: Authenticated parent attempts to update `/packages/paket-1` or `/siteContent/founder`. -> Expected: `PERMISSION_DENIED`.
11. **Payment Forgery**: Authenticated parent attempts to create `/payments/p1` marked `status: "lunas"`. -> Expected: `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Parent submits `createdAt` with backdated client timestamp instead of `request.time`. -> Expected: `PERMISSION_DENIED`.
