CREATE TABLE IF NOT EXISTS customization_inquiries (
id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, product TEXT NOT NULL,
system TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL
);