CREATE TABLE shop_stripe_products (
 product_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('test','live')),
 stripe_product_id TEXT, stripe_price_id TEXT, fingerprint TEXT,
 status TEXT NOT NULL DEFAULT 'pending', error TEXT, updated_at INTEGER NOT NULL,
 PRIMARY KEY(product_id,mode), UNIQUE(mode,stripe_product_id)
);
ALTER TABLE shop_payments ADD COLUMN payment_system TEXT NOT NULL DEFAULT 'standard';
CREATE TABLE shop_payment_accounting (
 order_id TEXT PRIMARY KEY REFERENCES customer_orders(id),
 merchant_of_record TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'eur',
 gross INTEGER NOT NULL, tax INTEGER, stripe_fee INTEGER, net INTEGER,
 balance_transaction TEXT, settlement_currency TEXT, settlement_gross INTEGER, country TEXT, updated_at INTEGER NOT NULL
);
