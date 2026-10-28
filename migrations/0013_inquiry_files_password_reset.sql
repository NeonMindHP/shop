CREATE TABLE shop_inquiry_files (
 id TEXT PRIMARY KEY,
 message_id TEXT NOT NULL REFERENCES shop_messages(id) ON DELETE CASCADE,
 object_key TEXT NOT NULL UNIQUE,
 filename TEXT NOT NULL,
 content_type TEXT NOT NULL,
 size INTEGER NOT NULL CHECK(size>0),
 created_at INTEGER NOT NULL
);
CREATE INDEX shop_inquiry_files_message ON shop_inquiry_files(message_id);
CREATE INDEX shop_inquiry_files_expiry ON shop_inquiry_files(created_at);
CREATE TABLE shop_password_resets (
 token_hash TEXT PRIMARY KEY,
 customer_id TEXT NOT NULL REFERENCES customers(id),
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 used_at INTEGER
);
CREATE INDEX shop_password_resets_customer ON shop_password_resets(customer_id);

CREATE TABLE shop_inquiry_uploads (object_key TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
