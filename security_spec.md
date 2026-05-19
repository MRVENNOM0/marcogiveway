# Security Specification: Giveaway Hub

## Data Invariants
1. A Giveaway can only be created/updated/deleted by an Admin.
2. An Entry can be created by any signed-in user or anonymous user (if allowed), but for this app we'll assume Google Auth is required for tracking unless specified. Actually, the user didn't mention login, but for Discord username collection, we need to ensure the entry is valid.
3. Users cannot modify or delete Entries once created.
4. Users can only read active Giveaways.
5. Admin is defined via a special 'admins' collection.

## Dirty Dozen Payloads (Rejection Targets)
1. Setting `status` to 'active' on a giveaway as a non-admin.
2. Creating an entry with a spoofed `joinedAt` (not server time).
3. Modifying another user's entry.
4. Accessing the list of all entries as a non-admin.
5. Creating a giveaway with an extremely long title (resource poisoning).
6. Deleting a giveaway as a regular user.
7. Injected 1MB string into `discordUsername`.
8. Updating a giveaway's `redirectUrl` as a non-admin.
9. Bypassing `isValidId` check on giveaway ID.
10. Creating an entry for a non-existent giveaway.
11. Reading the entries of a giveaway the user didn't join (if restricted) or as a non-admin.
12. Attempting to update `createdAt` on an existing giveaway.

## Test User Email for Admin
We'll use the user's email: `qadeerahmed235x@gmail.com` as the initial admin in the rules.
