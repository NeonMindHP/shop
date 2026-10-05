# NeonMind Shop

Eigenständiger Shop im bestätigten NeonMind-Design. Aktuell: private Online-Designvorschau mit Produktseiten, Warenkorb, Testkasse und Demo-Downloads. Kein aktiver Verkauf.

`npm start` startet http://127.0.0.1:4173. Node.js 24 oder neuer erforderlich. `npm test` prüft Bestell- und Downloadlogik; `npm run check` prüft JavaScript.

- [Betrieb und Funktionsumfang](docs/Betrieb.md)
- [Bestätigtes Konzept](docs/konzept-v1/Konzept.md)
- [Designvorlage](docs/konzept-v1/Shop-Konzept.png)

Online wird nur `dist/` veröffentlicht. Die Node/SQLite-Server-Grundlage liegt unter `server/` und ist dort noch nicht angeschlossen. Echte Zahlungen, private Produktdateien und fertige Betreiberverwaltung folgen vor Verkaufsstart. Zugangsdaten, Kundendaten und private Dateien gehören nicht ins öffentliche Repository.
