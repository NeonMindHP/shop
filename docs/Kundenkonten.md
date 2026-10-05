# Gastkauf und Kundenkonto

Die Kasse bietet Gastkauf oder Kauf mit Kundenkonto. Registrierung und Anmeldung laufen über den Cloudflare Worker; Passwörter werden nicht im Browser gespeichert. SQLite der lokalen Node-Vorschau ist vom Cloudflare-D1-Kontosystem getrennt.

D1 `neonmind-shop` ist im Betreiberkonto eingerichtet und über das Binding `DB` verbunden. Das Schema wurde angewendet, `AUTH_PEPPER` ist als Cloudflare-Secret gesetzt. Die folgenden Schritte dokumentieren die Einrichtung; bei einer bestehenden Installation nicht erneut das Servergeheimnis ersetzen.

## Einrichtung auf Cloudflare

1. Im Shop-Verzeichnis `npx wrangler login` ausführen und die Anmeldung selbst abschließen.
2. D1-Datenbank erstellen: `npx wrangler d1 create neonmind-shop`.
3. Die zurückgegebene echte Datenbank-ID in `wrangler.jsonc` unter `d1_databases` eintragen: Binding `DB`, Name `neonmind-shop`, `migrations_dir` gleich `migrations`. Keine Beispiel-ID verwenden.
4. Schema anwenden: `npx wrangler d1 migrations apply neonmind-shop --remote`.
5. Unabhängiges zufälliges Servergeheimnis mit mindestens 32 Zeichen als `AUTH_PEPPER` setzen: `npx wrangler secret put AUTH_PEPPER`. Geheimnis nicht in GitHub schreiben; Verlust des Geheimnisses macht bestehende Passworthashes unbrauchbar.
6. Konfiguration nach GitHub übertragen und den erfolgreichen Cloudflare-Durchlauf prüfen. Danach zeigt `/api/health` die aktivierten Konten und Gastbestellungen an.

Ohne Datenbank oder Servergeheimnis bleibt die Registrierung sichtbar als noch nicht eingerichtet. Es werden keine scheinbaren Konten in LocalStorage angelegt. Auf der alten rein statischen Sites-Vorschau sind die Konto-APIs nicht verfügbar.

## Zugriff und Speicherung

- Konto: E-Mail/Passwort, individuelle Salts, PBKDF2-SHA512 mit 100.000 Iterationen und vorgeschaltetem HMAC mit dem Servergeheimnis. Der Arbeitsfaktor ist an die Worker-Runtime angepasst; vor echtem Verkauf die Ressourcen und Passwortstrategie erneut prüfen.
- Anmeldung: zufällige serverseitig gespeicherte Sitzung; im Browser nur HttpOnly/Secure/SameSite-Cookie. Sitzung endet nach 14 Tagen oder Abmeldung.
- Schreibzugriffe benötigen dieselbe Origin und JSON; Anmeldeversuche werden begrenzt.
- Gast: zufälliger Bestellschlüssel, serverseitig nur als Hash gespeichert. Käufer kann ihn als Textdatei sichern und später eingeben. Kein E-Mail-Versand wird behauptet.
- Gastbestellung ins Konto übernehmen: nur nach Anmeldung und mit dem gültigen Schlüssel; E-Mail allein genügt nicht.
- Bestellungen werden nur dem angemeldeten Eigentümer oder dem berechtigten Gast gezeigt. Einem Konto zugeordnete Gastbestellungen können nicht mehr anonym mit dem Schlüssel geöffnet werden.

## Testbetrieb und offene Produktionsschritte

Bestellungen sind ausdrücklich Testbestellungen ohne Zahlung. Die Downloads bleiben öffentliche Demobilder. Zahlungsanbieter, private Produktpakete, E-Mail-Verifizierung, Passwortzurücksetzen, E-Mail-Versand für Gastzugänge, rechtliche Kontoangaben und vollständiger Betreiberbereich müssen vor echtem Verkauf ergänzt werden. Registrierung beansprucht derzeit eine E-Mail-Adresse ohne Verifizierung; keine Verknüpfung fremder Käufe allein über diese Adresse.

Die alte browserlokale Testhistorie wird nicht als echte serverseitige Bestellung importiert. Der Bestellschlüssel ist ein Zugangsgeheimnis: vertraulich speichern, nicht in öffentliche URLs, Logs oder GitHub einfügen.
