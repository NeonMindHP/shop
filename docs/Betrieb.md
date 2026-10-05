# NeonMind Shop – Vorschau und Betrieb

## Aktueller Stand

Die Online-Veröffentlichung stellt `dist/` als eigenständige private Designvorschau bereit. Sie enthält Startseite, Kollektionen mit Suche und Kategorien, Produktansichten, Warenkorb, Testkasse und Demo-Downloads. Das bestätigte Konzept wird als responsive HTML/CSS umgesetzt.

Keine echten Zahlungen, Kundendaten, privaten Produktpakete oder öffentlich erreichbare Betreiberverwaltung sind aktiv. Testkäufe werden ausschließlich lokal im Browser gespeichert. Die Bilder sind öffentliche Demoassets; die beschriebenen Pakete sind noch zu produzieren.

## Lokal starten

Node.js 24 oder neuer; keine zusätzlichen Bibliotheken erforderlich. `npm start` startet http://127.0.0.1:4173. `npm run check` prüft JavaScript, `npm test` prüft Bestellungen und Downloadberechtigungen. SQLite liegt in `data/shop.sqlite`; dieser Ordner ist von Git ausgeschlossen. Der Server bindet nur an den eigenen Rechner.

## Server-Grundlage

Produktkatalog, Bestellerstellung mit serverseitigen Preisen, Bestellabfrage mit Zugriffstoken, geschützte Betreiberabfrage und signierte private Downloadlinks sind enthalten. Der Zahlungsanschluss ist deaktiviert (`/api/payment`: 503). Die öffentliche Vorschau verwendet diese APIs noch nicht.

`recordVerifiedPayment` ist eine interne Funktion für einen späteren Zahlungsadapter. Dieser muss die Anbieterbestätigung tatsächlich prüfen. Ein `verified`-Feld aus dem Browser darf niemals weitergereicht werden. Es gibt keinen öffentlichen Endpunkt, der nach Behauptung des Käufers eine Bestellung bezahlt setzt.

Private Downloads prüfen Zahlungsstatus und Produktzugehörigkeit erneut. Rückerstattungen entziehen den Zugriff, signierte Links laufen ab. Die Grundlage ersetzt noch keinen vollständig abgesicherten Produktionsbetrieb und keinen getesteten Zahlungsanbieter.

Vor privater Downloadnutzung serverseitig konfigurieren: `SHOP_ADMIN_TOKEN` und `DOWNLOAD_SIGNING_SECRET`, jeweils unabhängige zufällige Geheimnisse mit mindestens 32 Zeichen. Produktdateien liegen als `private/aurora.zip`, `private/flow.zip`, `private/stream.zip` außerhalb öffentlicher Dateien und außerhalb von Git. Keine echten Geheimnisse oder Kundendaten ins Repository schreiben.

## Vor echtem Verkauf noch erforderlich

1. Tatsächliche Downloadpakete und Nutzungsrechte fertigstellen.
2. Betreiberangaben, Kontakt, Impressum, Datenschutz und Verkaufsbedingungen ergänzen.
3. Hosting für Server, Datenbank und private Dateien im Betreiberkonto wählen. Die statische Vorschau hostet den SQLite-Server nicht.
4. Zahlungsanbieter einrichten und verifizierten Adapter verbinden.
5. Oberfläche mit den APIs verbinden; Zahlungen und Rückerstattungen Ende zu Ende testen.
6. Betreiberverwaltung mit sicherem Login und Bearbeitungsfunktionen fertigstellen.
7. HTTPS, Requestbegrenzung, Backups und Wiederherstellung prüfen; erst dann echten Verkauf aktivieren.

Domain und Einbindung in die Hauptseite bleiben offen.

## Vorschau testen

Produkt → Warenkorb → Testkasse → Testhinweis bestätigen → Testkauf → Meine Downloads. Bei Erfolg steht ein einzelnes Demobild zum Download bereit. Fehlgeschlagene und ausstehende Testzahlungen erzeugen keinen neuen Download. Testhistorie unter Meine Downloads löschen.
