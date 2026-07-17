# Firestore Security Specification

This document defines the security models, relationship bounds, invariants, and the "Dirty Dozen" invalid payloads that must be rejected.

## 1. Data Invariants & Access Roles

- **User Profiles (`/users/{userId}`)**: 
  - Readers must stand as the authenticated owner: `request.auth.uid == userId`.
  - Writers must be the owner of the document and cannot self-escalate or spoof balance values.

- **Planner Tasks (`/tasks/{taskId}`)**:
  - Readers and writers must be verified.
  - A task's `userId` property must match the owner `request.auth.uid`. No user can read or modify another user's tasks.
  - Subclasses of update must preserve the original `userId`.

- **Reusable Routines (`/routines/{routineId}`)**:
  - Every stored routine belongs to a specific user via `userId`.
  - Readers/Writers must have `request.auth.uid == resource.data.userId` or `request.resource.data.userId`.

- **Task Delegation Transfers (`/transfers/{transferId}`)**:
  - Collaboration domain: A transfer connects a sender (`fromUserId`) and a receiver (`toUserId`).
  - Read access is restricted to either sender or receiver: `request.auth.uid in [resource.data.fromUserId, resource.data.toUserId]`.
  - Transitions on status fields (e.g., pending -> accepted, completed -> review) must follow strict field update permissions (`affectedKeys()`).

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to compromise authentication, spoof identities, poison properties, or perform unauthorized status shortcutting:

1. **User Balance Inflation**: Editing user profile object to alter `favorPoints` by bypassing validation gates.
2. **Task Ownership Hijack**: Creating a task document indexed with a different `userId` to pollute or inspect another user's schedule.
3. **Anonymized Write Injection**: Creating tasks or routines without a verified email address when verification is set to strict.
4. **Routine Theft**: Modifying/reading other users' routines by using their routine IDs over client endpoints.
5. **Transfer Spoofing**: Simulating a task delegation request from another user without their consent (e.g., `fromUserId` is different from the logged-in user).
6. **Instant Acceptance Attack**: A receiver immediately creating a transfer ticket in "accepted" status, cutting the sender out of the workflow.
7. **Junk ID Poisoning**: Specifying an ID string like a 2KB binary payload or special scripts to break Firestore index bounds.
8. **Double-Spend Verification Spoof**: Completing a task transfer with a verified state change back to accepted after it reached the terminal `"completed"` state.
9. **Invisible Task Infiltration**: Creating a task with zero fields except `userId` to bypass essential keys verification like `title`.
10. **Timestamp Modification Bypassing**: Client uploading a mock historical context using custom pre-filled `createdAt` date objects.
11. **Negative Duration/Points Abuse**: Passing negative reward parameters (like compensation with -500 points) to steal credits from the sender's wallet.
12. **PII Data Leakage**: Injecting and listing private emails or unmasked values to bypass visibility criteria.

---

## 3. Test Runner Design

All test payloads are mapped to verification triggers ensuring that:
- Authenticators are verified (`request.auth.token.email_verified == true`).
- Input keys conform of exact constraints.
- Writes return `PERMISSION_DENIED` whenever an invariant is violated.
