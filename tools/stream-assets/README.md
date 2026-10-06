# Stream-Pakete erzeugen

Die Gestaltung, Farbvarianten und Exporte sind vollständig in diesen Quellen enthalten. Im Verzeichnis `tools/stream-assets` die Node-Abhängigkeiten mit `npm ci` installieren und die Python-Abhängigkeiten aus `requirements.txt` in einer eigenen virtuellen Umgebung installieren.

Anschließend nacheinander ausführen:

```
python design_streams.py
node render_streams.cjs
python verify_package.py
```

Die Ergebnisse liegen unter `outputs/NeonMind-Stream-Pakete-v1` im Repository. Die Prüfung erstellt die Kunden-ZIPs, Vorschauen und `Gepruefte-Pakete.json`. Sie prüft transparente Fenster, native PSD-Texte, zusammengesetzte PSD-Bilder und ZIP-Integrität. Downloads werden separat in den privaten Shop-Speicher hochgeladen; die erzeugten Verkaufsdateien gehören nicht in das öffentliche Repository.

Weitere Angaben zu Inhalt und Nutzung stehen in `docs/STREAM-PACKS.md`.
