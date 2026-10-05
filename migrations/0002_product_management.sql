CREATE TABLE shop_admins (customer_id TEXT PRIMARY KEY REFERENCES customers(id));
CREATE TABLE shop_products (id TEXT PRIMARY KEY, data TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
CREATE TABLE product_files (product_id TEXT PRIMARY KEY, object_key TEXT NOT NULL, filename TEXT NOT NULL, size INTEGER NOT NULL, updated_at INTEGER NOT NULL);
