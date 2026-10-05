# NeonMind Shop – Konzept 01

Stand: 5. Oktober 2026. Ein Gestaltungsvorschlag und eine Arbeitsgrundlage, kein fertiger Verkaufsshop.

## Auftrag und Gestaltung

Eigenständiger Shop im Repository https://github.com/NeonMindHP/shop. Design aus der bestehenden NeonMind-Webseite übernehmen. Spätere Verlinkung oder Einbindung in die Hauptseite bleibt offen.

Designquelle: aktuell überprüfter Website-Commit cf9447978bad183be738412f100a8cdbefaddc49, app/globals.css und public/assets/neon-bg-hero.png. Farben: Hintergrund #01030a, Cyan #19e7ff, Blau #3b84ff, Violett #914dff, Pink #ff32dd, Text #f3f7ff. Transparente dunkle Flächen, abgerundete Leuchtrahmen, zurückhaltende Partikel und Gitter, klare Sans-Serif-Schrift. Das Bild ist eine KI-generierte Interpretation dieser Vorgaben; verbindliche Farben und vorhandene Markenassets werden bei der echten Umsetzung direkt übernommen.

## Startsortiment als Vorschlag

| Produkt | Vorgeschlagener Inhalt | Beispielpreis |
| --- | --- | --- |
| Aurora Nights | 12 Nachtlandschaft-Wallpaper für PC und Smartphone | 9,90 € |
| Neon Flow | Abstrakte Hintergründe mit Cyan- und Pink-Lichtformen | 7,90 € |
| Stream Essentials | Zusammenpassende Stream-Grafiken und Panels | 19,90 € |

Namen, Motive, Stückzahlen und Preise dienen nur der Konzeptbewertung. Die im Entwurf dargestellten Produktbilder sind keine bereits fertig produzierten Downloadpakete. Keine erfundenen Bewertungen, Verkaufszahlen oder künstliche Verknappung.

## Seiten und Kaufablauf

1. Startseite: Kollektion vorstellen, Produkte entdecken, Kategorien und Suche.
2. Produktseite: große Vorschau, weitere Bilder, Inhalt, Formate, Auflösungen, Dateigröße, Nutzungsrechte, Preis und Warenkorb.
3. Warenkorb: Artikel, Entfernen, Gesamtpreis und Übergang zur Kasse.
4. Kasse: erforderliche Kundendaten, Bestellübersicht, Zahlungsmethode und Kaufabschluss; rechtliche Texte und erforderliche Erklärungen vor Livebetrieb ausarbeiten.
5. Bestellstatus: Zahlung wird geprüft, erfolgreich, ausstehend oder fehlgeschlagen. Downloads nur nach serverseitig bestätigter Zahlung freigeben.
6. Meine Downloads: gekaufte Produkte, Dateiversionen, Bestellinformationen und erneut abrufbare Downloads. Gastkauf mit geschütztem Zugangslink als Vorschlag; optionales Kundenkonto später.
7. Betreiberverwaltung: Produkte, Preise, Vorschaubilder, Dateien, Veröffentlichungsstatus, Bestellungen, Rückerstattungen und Downloadzugriff.

## Was selbst betrieben wird

Shop-Oberfläche, Quellcode, Produktkatalog, Warenkorb, Bestelldatenbank, Verwaltung und Downloadberechtigungen unter eigener Kontrolle. Hosting und Speicher im eigenen Betreiberkonto, mit exportierbaren Daten und Backups. Kein Etsy- oder Gumroad-Shop als Grundlage vorgesehen.

Zahlungsabwicklung bleibt eine externe Schnittstelle: Karten und PayPal benötigen entsprechende Dienstleister und Betreiberkonten. Die Auswahl ist offen. Sensible Kartendaten werden durch dafür vorgesehene Anbieter-Komponenten verarbeitet und nicht in unserer Datenbank gespeichert. Gebühren und Bedingungen hängen von Anbieter und Vertrag ab. Eigener Shop bedeutet nicht gebührenfreie oder vollständig dienstleisterfreie Zahlungen.

## Geplante technische Grundlage

Eigenständige Web-App mit Server, relationaler Datenbank und privatem Dateispeicher. Zahlungsschnittstelle austauschbar halten. Preise und Bestellbeträge auf dem Server ermitteln; Zahlungsbestätigungen authentifizieren, Betrag/Währung/Bestellung abgleichen und wiederholte Meldungen ohne doppelte Freigabe verarbeiten. Abgebrochene, ausstehende oder fehlgeschlagene Zahlungen geben keine Dateien frei.

Vorschaubilder dürfen öffentlich sein. Verkaufte Originaldateien liegen privat und werden nach Prüfung der Berechtigung über zeitlich begrenzte Links ausgeliefert. Downloadzugriffe protokollieren und bei Bedarf begrenzen; das verhindert keinen Weiterverkauf durch Käufer vollständig.

GitHub enthält Code, Dokumentation und öffentliche Vorschauassets. Keine Kundendaten, Zugangsdaten oder verkauften Originalpakete in das öffentliche Repository stellen. Secrets nur in der Serverumgebung. Verwaltung mit geschütztem Zugang; Backups und Wiederherstellung vor Verkaufsstart prüfen.

## Nächster Ausbau nach Designentscheidung

Zuerst den visuellen Entwurf als responsive, klickbare Vorschau umsetzen. Danach Datenbank, Verwaltung und private Downloads verbinden. Zahlung in einer Testumgebung prüfen, einschließlich Fehlzahlungen und erneuter Bestätigungen. Anschließend reale Produkte, Betreiberangaben und Verkaufsbedingungen vervollständigen und erst dann den echten Verkauf aktivieren.

Noch offen: Hosting und Domain, Zahlungsanbieter, Gastkauf/Kundenkonto, endgültige Produkte, Preise und Nutzungsrechte. Die bestehende Hauptseite entscheidet nicht über diese Punkte.

## Quellen für die Zahlungsplanung

- PayPal, serverseitige Bestellerstellung und Zahlungsabschluss: https://developer.paypal.com/studio/checkout/standard/integrate
- Stripe, Payment Intents: https://docs.stripe.com/api/payment_intents

## Bildherstellung

Der Entwurf wurde mit dem integrierten Imagegen-Werkzeug erzeugt. Der vollständige Prompt liegt in Bildprompt.txt. Das Bild dient der Gestaltung, nicht als Nachweis funktionsfähiger Zahlungen, Downloads oder eines fertigen Shops.
