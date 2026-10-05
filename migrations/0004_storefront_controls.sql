ALTER TABLE shop_products ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
UPDATE shop_products SET created_at=updated_at WHERE created_at=0;
CREATE TABLE shop_categories (name TEXT PRIMARY KEY);
INSERT INTO shop_categories VALUES ('Wallpaper'),('Streaming'),('Sonstiges');
CREATE TABLE shop_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO shop_settings VALUES ('productSort','newest');
