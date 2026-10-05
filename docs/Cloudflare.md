# Cloudflare-Veröffentlichung

Das GitHub-Repository `NeonMindHP/shop` ist mit dem vorhandenen Cloudflare Worker `neonmind-art` verbunden. Die Shop-Vorschau liegt unter https://neonmind-art.djbong-2k16.workers.dev/.

Die feste Konfiguration steht in `wrangler.jsonc` im Repository-Hauptverzeichnis. Sie übernimmt Name, Kompatibilitätsdatum, Protokollierung und öffentliche statische Dateien aus der bereits erfolgreichen Cloudflare-Veröffentlichung. `workers_dev` und `preview_urls` sind ausdrücklich aktiviert, wie zuvor automatisch voreingestellt.

Wrangler ist auf Version 4.147.0 festgelegt, die im erfolgreichen Cloudflare-Protokoll verwendet wurde. `package-lock.json` hält die Abhängigkeiten fest. Nach Klonen mit `npm ci` installieren.

## Cloudflare Builds

- Repository: `NeonMindHP/shop`
- Produktionsbranch: `main`
- Root directory: Repository-Hauptverzeichnis
- Zusätzlicher Build-Befehl: nicht erforderlich, `dist/` ist bereits fertig
- Deploy command: `npx wrangler deploy` (bestehender Befehl kann bleiben)

Cloudflare übernimmt die Repository-/Branch-Verbindung aus den Einstellungen seines Dashboards. Diese Verbindung wird nicht durch `wrangler.jsonc` erstellt. Künftige Änderungen am ausgewählten Produktionsbranch lösen die konfigurierte Veröffentlichung aus.

## Lokal prüfen

`npm run check` prüft JavaScript, `npm test` die Server-Grundlage. `npm run deploy:check` prüft die Cloudflare-Konfiguration und bereitet eine Veröffentlichung ohne Upload vor. `npm run preview` startet eine lokale Cloudflare-Vorschau. `npm run deploy` veröffentlicht direkt und benötigt eine autorisierte Cloudflare-Anmeldung; normalerweise übernimmt dies die bestehende GitHub-Verbindung.

Diese Konfiguration veröffentlicht ausschließlich die Designvorschau aus `dist/`. Die Node/SQLite-Grundlage in `server/` wird dadurch nicht als Cloudflare-Server aktiviert. Für die Produktverwaltung werden anschließend ein Cloudflare-kompatibler Worker, Datenbank und privater Speicher ergänzt.

Geheimnisse gehören in Cloudflare-Secrets. `.dev.vars`, lokale Wrangler-Daten, Kundendaten und private Produktdateien werden nicht eingecheckt. Das bestehende `.openai/hosting.json` ist die separate Konfiguration der früheren Sites-Vorschau und wird von Wrangler nicht als Hostingkonfiguration verwendet.

## Veröffentlichung kontrollieren

Unter Cloudflare → Workers & Pages → neonmind-art → Builds den neuen Commit und den erfolgreichen Durchlauf prüfen. Ein erfolgreicher HTTP-Aufruf der Shop-Adresse allein beweist nicht, dass bereits der neueste Commit veröffentlicht wurde.

Offizielle Dokumentation: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ und https://developers.cloudflare.com/workers/wrangler/configuration/.
