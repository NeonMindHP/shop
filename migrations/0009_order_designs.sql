CREATE TABLE IF NOT EXISTS customer_order_designs (order_id TEXT PRIMARY KEY REFERENCES customer_orders(id), design TEXT NOT NULL);
