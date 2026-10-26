# Kundenbestätigungen – 27. Oktober 2026

Der Shop nutzt das vorhandene verschlüsselt gespeicherte SMTP-Konto. Absender und Reply-To sind dessen Adresse (aktuell info@neonmind-ai.de). Die Weiterleitung info@neonmind-ai.com → info@neonmind-ai.de bleibt bestehen.

## Ereignisse
- Kontakt-/Wunschanfrage: Eingangsbestätigung mit Referenz; keine Wiederholung fremder Nachrichteninhalte.
- Erfolgreich angelegte echte Stripe-Checkout-Sitzung: Bestelleingang mit serverseitiger Produkt-/Preisübersicht, ausdrücklich noch unbezahlt.
- Signiertes, zum Bestellbetrag und Zahlungsmodus passendes Stripe-Ereignis: Zahlungsbestätigung. Vor Versand wird der Zahlungsstatus erneut geprüft. Rückerstattete/strittige Bestellungen werden übersprungen.
- Betreiber-/Sandbox-Tests: keine Kundenmails. Kein nachträglicher Versand an historische Anfragen oder bereits abgeschlossene Bestellungen.

## Versand und Datenschutz
HTML und Klartext, ohne Tracking oder externe Bilder. Gastschlüssel bleiben im Kaufabschluss und werden nicht per Mail verschickt. Die Vorlagenangaben liegen verschlüsselt in shop_customer_mail. Empfänger/Status/Versuche bleiben für Verwaltung und Zustellung gespeichert; Löschung nach 90 Tagen beim Bereinigungslauf. Datenschutzhinweise sind entsprechend aktualisiert.

Direkter Versandversuch im Hintergrund nach dem Ereignis; weitere Bearbeitung über den bestehenden 15-Minuten-Zeitplan. Maximal sechs fehlgeschlagene Versuche mit Wartezeit, danach manuell über Admin → Info-Mails → Mailversand erneut versuchen. Dieser Knopf kann auch weitere ausstehende Betreiberinfos versenden. Ein SMTP-Erfolg bedeutet Annahme durch den Mailserver, nicht garantierte Inbox-Zustellung. Ereignis-IDs verhindern reguläre doppelte Einträge; ein Verbindungsabbruch nach Annahme kann bei Wiederholung dennoch eine doppelte Mail verursachen.

Anfragebestätigungen sind auf drei pro Empfänger in 15 Minuten begrenzt. Weitere Anfragen bleiben im Betreiberpostfach erhalten. Wartungsmodus und Freigabe echter Zahlungen werden durch diese Änderung nicht verändert.

## Veröffentlichung und Prüfung
Migration 0011_customer_mail.sql ist additiv. Vor dem Worker-Release anwenden. Rückkehr zum vorherigen Worker ist ohne Löschen der neuen Tabelle möglich.
Automatisierte Tests verwenden nur isolierte SQLite-Datenbanken, künstliche Stripe-Ereignisse und SMTP-Stubs. Es werden keine echten Kunden angeschrieben und keine echten Zahlungen ausgelöst. Die Browser-Vorschau zeigt das HTML; tatsächliche Mailprogramme können Details anders darstellen.
