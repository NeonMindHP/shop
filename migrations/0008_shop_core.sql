CREATE TABLE shop_messages (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
 subject TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL,
 read_at INTEGER, folder TEXT NOT NULL DEFAULT 'inbox'
);
CREATE INDEX shop_messages_folder ON shop_messages(folder,created_at);
CREATE TABLE shop_notifications (
 message_id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_at INTEGER NOT NULL DEFAULT 0, sent_at INTEGER, last_error TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO shop_messages(id,kind,name,email,subject,body,created_at)
 SELECT id,'wish',name,email,'Wunschanfrage · ' || product,'Bereich: ' || system || char(10) || message,created_at FROM customization_inquiries;
INSERT OR IGNORE INTO shop_settings VALUES('maintenance','{"enabled":false,"info":"Wir arbeiten gerade an neuen Designwelten. Bitte schau später wieder vorbei.","status":"Shop-Design | in Bearbeitung\nDownloadpakete | werden geprüft"}');
CREATE TABLE shop_user_state (customer_id TEXT PRIMARY KEY, blocked INTEGER NOT NULL DEFAULT 0);
CREATE TRIGGER shop_paid_order_message AFTER UPDATE OF status ON customer_orders WHEN NEW.status='paid' AND OLD.status<>'paid' BEGIN
 INSERT OR IGNORE INTO shop_messages(id,kind,email,subject,body,created_at) VALUES('paid:' || NEW.id,'purchase',coalesce((SELECT email FROM customers WHERE id=NEW.customer_id),''),'Bestätigte Bestellung · ' || substr(NEW.id,1,8),'Bestellnummer: ' || NEW.id || char(10) || 'Betrag: ' || printf('%.2f',NEW.amount/100.0) || ' EUR',unixepoch()*1000);
 INSERT OR IGNORE INTO shop_notifications(message_id) VALUES('paid:' || NEW.id);
END;
CREATE TRIGGER shop_paid_order_insert AFTER INSERT ON customer_orders WHEN NEW.status='paid' BEGIN
 INSERT OR IGNORE INTO shop_messages(id,kind,email,subject,body,created_at) VALUES('paid:' || NEW.id,'purchase',coalesce((SELECT email FROM customers WHERE id=NEW.customer_id),''),'Bestätigte Bestellung · ' || substr(NEW.id,1,8),'Bestellnummer: ' || NEW.id || char(10) || 'Betrag: ' || printf('%.2f',NEW.amount/100.0) || ' EUR',unixepoch()*1000);
 INSERT OR IGNORE INTO shop_notifications(message_id) VALUES('paid:' || NEW.id);
END;
