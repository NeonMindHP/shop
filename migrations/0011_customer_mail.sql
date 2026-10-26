CREATE TABLE IF NOT EXISTS shop_customer_mail (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('inquiry','order','payment')),
 recipient TEXT NOT NULL,
 payload TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0,
 next_at INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 sent_at INTEGER,
 last_error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS shop_customer_mail_pending ON shop_customer_mail(state,next_at);
CREATE INDEX IF NOT EXISTS shop_customer_mail_recipient ON shop_customer_mail(recipient,created_at);
