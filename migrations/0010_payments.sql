CREATE TABLE IF NOT EXISTS shop_payments (
 order_id TEXT PRIMARY KEY REFERENCES customer_orders(id),
 checkout_id TEXT UNIQUE, payment_intent TEXT UNIQUE,
 mode TEXT NOT NULL CHECK(mode IN ('live','test','admin')),
 email TEXT NOT NULL, consent_at INTEGER NOT NULL,
 consent_version TEXT NOT NULL DEFAULT 'digital-v1'
);
CREATE TABLE IF NOT EXISTS shop_payment_events (
 id TEXT PRIMARY KEY, received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_payment_revocations (
 payment_intent TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL,
 PRIMARY KEY(payment_intent,mode)
);
CREATE TABLE IF NOT EXISTS shop_download_log (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id TEXT NOT NULL,
 downloaded_at INTEGER NOT NULL
);
