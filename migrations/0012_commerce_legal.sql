CREATE TABLE shop_order_legal (
 order_id TEXT PRIMARY KEY REFERENCES customer_orders(id),
 version TEXT NOT NULL,
 snapshot TEXT NOT NULL,
 confirmation_sent_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE TABLE shop_withdrawals (
 id TEXT PRIMARY KEY,
 payload TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE shop_order_tax (
 order_id TEXT PRIMARY KEY REFERENCES customer_orders(id),
 automatic_tax INTEGER NOT NULL DEFAULT 0,
 amount_tax INTEGER,
 country TEXT,
 calculation_status TEXT,
 updated_at INTEGER NOT NULL
);
