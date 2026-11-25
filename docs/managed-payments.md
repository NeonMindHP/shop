# Stripe Managed Payments – Entwicklungsstand 25.11.2026

Die Erweiterung ist für Entwicklung und Sandbox vorbereitet. Sie ist noch nicht online ausgerollt und nicht für den Liveverkauf abgenommen. Die vorhandene Produktionskonfiguration wurde nicht verändert.

## Produktverwaltung

`paymentMode` unterscheidet `standard`, `managed` und `disabled`. Historische Produkte ohne das Feld behalten Standard. Neue Produkte im Editor beginnen mit deaktiviertem Verkauf. `managedEligibilityConfirmed` dokumentiert die Prüfung durch den Betreiber: unterstützte Produktart, automatisierte Bereitstellung sowie erforderliche Vertriebsrechte. Die Prüfung ersetzt Stripes Konto- und Produktprüfung nicht. Persönliche Designleistungen sind ausgeschlossen.

Die unterstützte Teilmenge von Steuerkategorien umfasst herunterladbare Bilder, digitale Kunstwerke, herunterladbare Software und allgemeine elektronisch erbrachte Leistungen. Es erfolgt keine automatische Umklassifizierung vorhandener Produkte. Insbesondere bedeutet „limited rights“ bei den betreffenden Stripe-Kategorien zeitlich begrenzten Zugriff und nicht lediglich eine Einschränkung der urheberrechtlichen Nutzungslizenz. Für ALPINE LUMEN müssen tatsächlicher Leistungsumfang und Zugriffsrechte geprüft werden; die im früheren Chat erwähnte Auswahl wird nicht blind übernommen.

Der Editor unterstützt manuelle Synchronisierung, automatische Sandbox-Synchronisierung beim Speichern und Zuordnung einer vorhandenen Sandbox-Produkt-ID. Bei automatischer Synchronisierung werden auch Papierkorb und Wiederherstellung übertragen. Ein Synchronisierungsfehler nimmt das gespeicherte NeonMind-Produkt nicht zurück. Status und bereinigter Fehlercode bleiben abrufbar.

Die Tabelle `shop_stripe_products` trennt Zuordnungen nach `test` und `live`. Deterministische Produktkennungen und eindeutige Zuordnungen verhindern doppelte Neuanlagen bei Wiederholungen. Preise erhalten einen stabilen Lookup-Key; Preisänderungen erzeugen neue Preise, ohne historische Preise zu überschreiben. Eine bereits erfolgreich verwendete Zuordnung kann nicht nebenbei auf ein anderes Stripe-Produkt umgebogen werden. Produktänderungen verwenden je Versuch einen neuen Idempotenzschlüssel, damit auch A → B → A innerhalb des Stripe-Idempotenzfensters tatsächlich übertragen wird.

Originaldateien und ZIP-Pakete bleiben privat in R2. Stripe erhält ausschließlich die öffentliche Motivvorschau und Produktdaten. Live-Produktsynchronisierung ist in dieser Fassung gesperrt.

## Checkout und Bestellungen

Stripe-Anfragen verwenden explizit API-Version `2025-03-31.basil`. Standard-Checkout setzt `managed_payments[enabled]=false`. Managed Checkout setzt den Parameter auf `true`, übergibt Endpreise mit `tax_behavior=inclusive` und entfernt die eigene Steuerautomatik sowie die manuelle Vorgabe der Zahlungsmethoden und 3-D-Secure-Optionen.

Warenkörbe mit beiden Zahlungssystemen werden vor einer Bestellung oder Stripe-Anfrage abgelehnt. Der Kunde erhält die Aufforderung, getrennt zu bestellen. Es gibt weder eine stille Umstellung auf Standard noch eine automatische Aufteilung mit mehreren Zahlungen.

Eine aktuelle synchronisierte Preis-ID wird verwendet, wenn ihr Fingerabdruck exakt zum aktuellen Produkt passt. Nach Änderungen verwendet der Checkout bis zur erneuten Synchronisierung aktuelle serverseitige Inline-Produktdaten. Preis und Steuerkategorie kommen aus dem NeonMind-Katalog, nicht aus Kundeneingaben.

Jede Bestellung speichert ihr Zahlungssystem, den Merchant of Record und den vorbereiteten Steuermodus unveränderlich im Bestellkontext. Webhooks prüfen weiterhin Signatur, Ereignismodus, Checkout-Zuordnung, Bestellreferenz, Betrag und EUR-Währung. Bei Managed Payments werden zusätzlich dessen Bestätigung und ein plausibler Steuerbetrag verlangt. Adaptive Pricing ändert laut Stripe nicht die Integrationswährung und den Integrationsbetrag der Checkout-Session; daher bleibt die Prüfung gegen den EUR-Bestellbetrag bestehen.

Erst die bestätigte Zahlung schaltet den bestehenden geschützten Bestellzugriff frei. Sandbox-Zahlungen bleiben Betreiber-Tests. Rückerstattungen und Zahlungsanfechtungen entziehen Berechtigungen; spätere doppelte Zahlungsereignisse heben die Sperre nicht auf. Teilrückerstattungen werden wie bisher konservativ als Widerruf der gesamten Downloadberechtigung behandelt. Eine differenzierte Rückgabe einzelner Artikel ist nicht implementiert.

Managed-Bestellmails benennen Stripes Rolle und kennzeichnen die NeonMind-Nachricht als Information über Bestellung/Downloads, nicht als Steuerrechnung. Vollständige endgültige Rechtstexte für dieses Modell sind noch fachlich zu prüfen. Die bisherigen Standard-Vertragstexte bleiben als Entwicklungsgrundlage bestehen; Managed-Snapshots tragen `legalReviewRequired=true`. Das ist keine rechtliche Freigabe.

## Steuermodus und Buchhaltungsdaten

Im Zahlungsdialog kann `unreviewed`, `regular` oder `small_business` als eigene Steuerbehandlung vorbereitet werden. Dies wird in `shop_settings.taxProfile` gespeichert und stellt keine steuerliche Feststellung dar. Im Sandbox-Kleinunternehmermodus entfällt die Standard-Automatic-Tax-Anfrage. Eigene Liveverkäufe werden bei gewähltem Kleinunternehmermodus gesperrt, solange Rechtstexte und endgültige Steuerkonfiguration nicht gesondert umgesetzt wurden.

`shop_payment_accounting` erfasst den bestätigten Bruttobetrag, den übermittelten Steuerbetrag, das Käuferland und den Merchant of Record. Der Betreiber kann Abrechnungsdaten lesend über PaymentIntent → latest_charge → balance_transaction abgleichen. Gebühren und Zahlungssaldo bleiben bis zum erfolgreichen Abgleich leer. Abrechnungswährung und Abrechnungsbrutto sind von der EUR-Integrationswährung getrennt.

Der Zahlungsdialog enthält eine Übersicht und einen JSON-Export. Dieser Export ist eine Vorbereitung, kein DATEV-Abschluss und kein vollständiges Auszahlungsjournal. Zahlungssaldo bedeutet nicht Bankauszahlung. Erstattungs-/Anfechtungsstatus ist enthalten; sämtliche zugehörigen Gegenbuchungen, Auszahlungsgruppen und Managed-Payments-spezifischen Steuerabzüge müssen für die spätere Buchhaltung mit echten Stripe-Testdaten und anschließend fachlich abgeglichen werden. Es werden keine Gebührenprozentsätze geraten.

## API

Alle folgenden Endpunkte erfordern eine authentifizierte Betreiber-Sitzung. Schreibzugriffe unterliegen der vorhandenen Origin-Prüfung.

| Endpunkt | Funktion |
| --- | --- |
| `GET /api/admin/stripe-products` | Sandbox-/Live-Zuordnungen, Status und Berechtigungsprüfung |
| `POST /api/admin/stripe-products` | Gespeichertes Produkt synchronisieren; JSON `{id, mode:"test", stripeProductId?:"prod_…"}` |
| `GET /api/admin/tax-profile` | Vorbereiteten eigenen Steuermodus lesen |
| `POST /api/admin/tax-profile` | JSON `{mode:"unreviewed"|"regular"|"small_business"}` |
| `GET /api/admin/payment-accounting` | Bis zu 1000 aktuelle Datensätze, Beträge in kleinsten Währungseinheiten |
| `POST /api/admin/payment-reconcile` | Lesender Stripe-Abgleich für JSON `{orderId}` |

## Prüfung

`npm test`: 80 Tests bestanden, darunter 11 neue Tests mit isolierter SQLite-Datenbank und kontrollierten Stripe-Antworten. Abgedeckt sind API-Parameter, Modustrennung, DE/FR/US-Käuferlanddaten, Gast-/Kontobestellung, fehlgeschlagene Zahlung, Betrags-/Steuerfehler, Rückerstattung, Anfechtung, Downloadentzug, Preiswechsel, Duplikatvermeidung, bestehende Produktzuordnung, Berechtigungen, automatische Synchronisierung sowie Gebühren in abweichender Abrechnungswährung.

Diese Tests führen keine Stripe-Transaktionen aus. Die Länderprüfungen prüfen die Verarbeitung gelieferter Daten und beweisen keine tatsächliche Steuerberechnung durch Stripe.

`npm run check` und `npm run deploy:check` bestanden. In einer ausschließlich lokalen Browser-Testumgebung wurden neue Felder, Berechtigungssperre, Speicherung der Managed-Auswahl, sichtbare Synchronisierungsfehler und Speicherung des vorbereiteten Steuermodus geprüft. Die Testumgebung verwendet eine flüchtige Datenbank und keine echten Schlüssel.

## Cloudflare-/Stripe-Voraussetzungen und Ausrollung

Der bestehende Worker heißt `neonmind-art`; D1 heißt `neonmind-shop`, R2 heißt `neonmind-shop-private`. Die bestehende Cloudflare-Secrets-Liste enthält Live- und Testschlüssel sowie beide Webhook-Secrets. Deren Werte wurden nicht gelesen oder ausgegeben. Der öffentliche Health-Endpunkt meldete am 25.11.2026 `paymentsEnabled=false`, `enabled=false`, `liveConfigured=true`, `sandboxConfigured=true`.

Ein lesender Aufruf von `wrangler d1 migrations list neonmind-shop --remote` scheiterte mit Cloudflare-Fehler `7403`: Konto für den Dienst nicht gültig oder nicht autorisiert. `wrangler whoami` meldet unter anderem fehlendes `d1:write`. Daher wurde keine Migration gegen die Produktionsdatenbank ausgeführt und kein Worker veröffentlicht.

Nach Erneuerung der autorisierten Cloudflare-Anmeldung:

1. Wartungsmodus und deaktivierte echte Zahlungen im Betreiberbereich bestätigen; Datenbanksicherung erstellen und Migrationsstand lesen.
2. Additive Migration `0014_managed_payments.sql` zuerst in einer isolierten Test-D1-Datenbank prüfen, dann vor der passenden Worker-Version anwenden. Bestehende Bestellungen erhalten `payment_system=standard`.
3. Worker und Assets mit passender Datenbankschema-Version bereitstellen; Wartungsmodus und Zahlungssperre beibehalten.
4. Stripe-Webhook-Destinationen auf eine passende API-Version prüfen. Sandbox-Destination muss auf `/api/payments/stripe/webhook/test` zeigen. Ereignisse: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
5. Berechtigungen des Testschlüssels für Produkte, Preise, Checkout Sessions sowie lesenden PaymentIntent-/Balance-Zugriff prüfen. Managed Payments muss auch in der verwendeten Sandbox eingerichtet und für das Konto verfügbar sein.
6. Vorhandene Stripe-Sandbox-Produkte ausdrücklich zuordnen. Die Live-ID von ALPINE LUMEN darf nicht in eine Sandbox-Zuordnung kopiert werden.
7. Echte Stripe-Sandboxtests mit DE-, EU- und Nicht-EU-Adressen, erfolgreicher und fehlgeschlagener Zahlung, Rückerstattung, Anfechtung, Gast-/Kontokauf und tatsächlicher E-Mail-/Downloadkette durchführen. Beträge, Managed-Payments-Steuerdaten und Abrechnungsdaten im Dashboard abgleichen.
8. Rechtstexte, Verkäuferrolle, Verbraucherhinweise, Rechnungen, eigene Steuerbehandlung, Buchhaltungsablauf und Produktberechtigungen fachlich abnehmen lassen.

`MANAGED_PAYMENTS_LIVE_APPROVED` wird nicht gesetzt. Wartungsmodus und echte Zahlungen werden nicht freigeschaltet. Ein späterer Live-Release braucht eine ausdrückliche Betreiberfreigabe und die noch fehlende fachliche/technische Abnahme. Ein Rückrollen des Workers lässt die additiven Tabellen bestehen; keine bestehenden Daten löschen.

## Geänderte Quellen

`worker/stripe-catalog.mjs`, `worker/payments.mjs`, `worker/admin.mjs`, `worker/index.mjs`, `worker/customer-mail.mjs`, `dist/shop.js`, `dist/core.js`, `dist/tax-categories.js`, `migrations/0014_managed_payments.sql`, `tests/payments.test.mjs`, `package.json` und dieses Dokument.

## Offizielle Referenzen

- [Managed Payments integrieren](https://docs.stripe.com/payments/managed-payments/update-checkout)
- [Produkt- und Kontoberechtigung](https://docs.stripe.com/payments/managed-payments/eligibility)
- [Adaptive Pricing und Ereignisbeträge](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing?payment-ui=stripe-hosted)
- [Stripe-Währungen und Sonderfälle](https://docs.stripe.com/currencies)
