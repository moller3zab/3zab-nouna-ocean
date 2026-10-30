CREATE TABLE IF NOT EXISTS devices (
 id TEXT PRIMARY KEY, uid TEXT NOT NULL, subscription TEXT, binding TEXT,
 active INTEGER NOT NULL DEFAULT 0, verified_until INTEGER NOT NULL DEFAULT 0,
 prefs TEXT NOT NULL DEFAULT '{}', pending_uid TEXT, pending_sub TEXT,
 pending_hash TEXT, challenge_id TEXT, challenge_expires INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS devices_owner ON devices(uid, active, verified_until);
CREATE INDEX IF NOT EXISTS devices_cleanup ON devices(updated_at);
CREATE TABLE IF NOT EXISTS profiles(uid TEXT PRIMARY KEY, name TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS events (
 id TEXT PRIMARY KEY, uid TEXT NOT NULL, collection TEXT NOT NULL, document_id TEXT NOT NULL,
 revision TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_expiry ON events(expires_at);
CREATE TABLE IF NOT EXISTS deliveries (
 event_id TEXT NOT NULL, device_id TEXT NOT NULL, binding TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', lease_until INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
 PRIMARY KEY(event_id,device_id,binding)
);
CREATE INDEX IF NOT EXISTS deliveries_pending ON deliveries(event_id,status,lease_until);
CREATE TABLE IF NOT EXISTS counters(bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS counters_expiry ON counters(expires_at);
CREATE TABLE IF NOT EXISTS sync_state(collection TEXT PRIMARY KEY,cursor_time TEXT NOT NULL,cursor_name TEXT NOT NULL DEFAULT '',updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS deliveries_ready ON deliveries(updated_at) WHERE status!='sent' AND attempts<5;
