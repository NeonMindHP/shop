CREATE TABLE IF NOT EXISTS customers (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_sessions (
 token_hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_orders (
 id TEXT PRIMARY KEY, customer_id TEXT REFERENCES customers(id), guest_key_hash TEXT NOT NULL,
 amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'demo', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_order_items (
 order_id TEXT NOT NULL REFERENCES customer_orders(id), product_id TEXT NOT NULL,
 price INTEGER NOT NULL, PRIMARY KEY(order_id, product_id)
);
CREATE INDEX IF NOT EXISTS customer_orders_owner ON customer_orders(customer_id, created_at);
CREATE TABLE IF NOT EXISTS auth_attempts (
 key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL
);
