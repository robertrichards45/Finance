# Backup and recovery

The application automatically attempts a consistent SQLite backup every 24 hours,
using Node's SQLite backup API while the application stays online. The entire
snapshot is encrypted and authenticated with AES-256-GCM. The application data
encryption key is never placed in a snapshot or log. Up to three snapshots are
retained under /data/backups with owner-only permissions. A 64 MiB source limit
prevents snapshots from silently filling the current 1 GiB volume; failures
appear in the admin dashboard and trigger a bounded administrator email alert.

These are local recovery snapshots, not disaster recovery. Loss or deletion of
the volume also loses these copies. The operator must approve a separate backup
destination or Railway volume-backup schedule, and independently protect the
data encryption key. Railway bills volume snapshots for incremental storage;
no new backup subscription or paid infrastructure was created by this release.

## Isolated restore

1. Copy an encrypted `.clbk` snapshot to a restricted, isolated environment.
2. Set the original DATA_ENCRYPTION_KEY through the secret manager. Do not put
   it on a command line, in chat, or in a source file.
3. Create an empty restore directory. Never overwrite the running production DB.
4. Call `restore(source, destination, process.env.DATA_ENCRYPTION_KEY)` from
   `lib/backups.js`, where destination is a new absolute SQLite filename.
   Restore uses exclusive creation and refuses an existing destination.
5. Open that isolated directory with `Store`; verify the SQLite integrity result,
   decrypted synthetic records, expected document hashes, and deletion behavior.
6. Keep a separate authenticated restoration record. Production changes require
   a planned maintenance window, a current backup, and explicit operator action.

Automated tests restore a live, WAL-mode synthetic database, compare snapshot and
restore SHA-256 hashes, decrypt a fictional record, delete it only in the isolated
copy, and reject an incorrect key, modified ciphertext, and destination overwrite.
They do not prove an off-volume production disaster-recovery arrangement exists.
