# Shop-Nacharbeiten · 26.10.2026

Referenz: bestätigter Arbeitsauftrag mit Header-/Footer-Aufnahmen der Seite „Entdecken“.

- Gemeinsamer Außenrahmen für Kollektionen, Wünsche, Konto-/Anmeldeseiten, Kasse und Designstudio.
- Main und Footer sind darin direkt verbunden. Der Footer hat nur noch seine innere Trennlinie; keine zweite äußere Unterkante.
- Oberer Abstand zur Navigation: 20 px wie bei Entdecken. Wünsche hat wieder einen abgerundeten oberen Seitenabschluss.
- Designstudio behält seine Arbeitsbreite; Inhalt der Kasse wird im gemeinsamen Rahmen eingefasst.
- Warenkorb und Menü stehen als benachbarte Buttons rechts, Navigation bleibt mittig. Bei schmalen Ansichten bleibt die Navigation in ihrer bisherigen zweiten Zeile.
- Kategorieauswahl und Suche stehen in der URL. Produktseiten enthalten einen Zurück-Link und einen Kategorie-Breadcrumb mit dem vorherigen Filter-/Suchkontext. Browser-Zurück stellt die Kategorie ebenfalls wieder her; die vorherige Scrollposition wird für diese Navigation gemerkt.
- Direkt aufgerufene Produktseiten verwenden ihre eigene Produktkategorie als Rückweg.

## Prüfung

- `npm run check`: bestanden.
- `npm test`: 32 Tests bestanden, einschließlich Kategorie-/Such-URLs und sicherer Rückverweise.
- `npm run deploy:check`: Cloudflare-Konfiguration und Worker-Bundle erfolgreich ohne Veröffentlichung geprüft.
- Lokaler tatsächlicher Worker mit lokalen D1-Migrationen: Browserprüfung von Entdecken, Kollektionen, Designstudio, Wünsche, Konto und gefülltem Warenkorb/Kasse.
- Kategorie → Produkt → Browser-Zurück: Wallpaper bleibt ausgewählt.
- Kategorie mit Suche „Aurora“ → Produkt → sichtbarer Zurück-Link: Wallpaper und Suchbegriff bleiben erhalten.
- Header und Footer der genannten Ansichten anhand der Referenzen visuell geprüft.

Lokale Prüfung verwendet nur eine eigene lokale Datenbank. Produktdaten, Konten, Nachrichten und Zahlungsabläufe des veröffentlichten Shops wurden dabei nicht verändert.
