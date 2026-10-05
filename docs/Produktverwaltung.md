# Shop-Verwaltung und private Dateien

Verwaltung: https://neonmind-art.djbong-2k16.workers.dev/admin
Mit dem freigeschalteten Betreiberkonto anmelden. Administratorrechte stehen in der Datenbank und werden nicht bei Registrierung automatisch vergeben.

Produkte: Name, Kategorie, Europreis, Beschreibung, Lieferumfang, Formate und Motiv bearbeiten. Neue Produkte zuerst speichern, danach Dateien hochladen. Mit „Im Shop anzeigen“ veröffentlichen oder als Entwurf ausblenden. Shop und Testkasse verwenden die gespeicherten Produkte und serverseitigen Preise.

Vorschaubilder: PNG/JPG bis 5 MB. Hochladen, danach das Produkt speichern. Vorschaubilder sind öffentlich. Die bisherigen drei Motivvorschauen bleiben auswählbar.

Produktpakete: ZIP bis 50 MB. Upload ersetzt das bisherige Paket. Pakete liegen in dem privaten R2-Bucket neonmind-shop-private, ohne öffentliche Bucket-Adresse. Dateien dürfen nur über den Worker nach Prüfung der bezahlten Bestellung und des Kontos beziehungsweise Gastschlüssels ausgeliefert werden. Testkäufe haben Status demo und erhalten niemals private ZIP-Dateien. Der Zahlungsanschluss fehlt noch; die bezahlte Downloadstrecke wurde mit isolierten Tests geprüft. Eine echte Zahlung kann in der Verwaltung nicht manuell simuliert werden.

Bestellübersicht zeigt die letzten 100 Bestellungen mit Datum, Betrag und Status. Der Bereich zeigt außerdem Produkt- und Paketanzahl sowie die noch offenen Schritte zum Verkaufsstart.

Cloudflare: DB und PRODUCT_FILES sind in wrangler.jsonc gebunden. Neue Datenbankmigrationen vor dem Deployment anwenden. AUTH_PEPPER bleibt unverändert. Paket- und Vorschaubild-Uploads ersetzen Dateien; eine Dateiversionierung oder Wiederherstellung älterer Pakete ist noch nicht enthalten.

Verkaufsstart noch offen: vollständige Produktpakete, Zahlungsanbieter, E-Mail-Verifizierung und Wiederherstellung, Bestellmails, Betreiberangaben, Nutzungsrechte und Verkaufsbedingungen.

## Produktreihenfolge, Kategorien und Startseiten-Slider

In „Anzeige im Shop“ die Produktreihenfolge wählen und speichern: Neueste zuerst, Älteste zuerst, Name A–Z oder Preis auf-/absteigend. Die Einstellung gilt für die Startseite und die Kollektionen. Standard ist Neueste zuerst. Das Anlegedatum bleibt bei späteren Produktänderungen erhalten. Für bereits vorhandene Datenbankprodukte wurde einmalig der bisherige Speicherzeitpunkt übernommen.

Eigene Kategorien lassen sich anlegen und bei Produkten auswählen. Sie erscheinen als Kollektionfilter und im Designwelten-Slide. Beim Löschen werden zugeordnete Produkte zu Sonstiges verschoben. Sonstiges bleibt als Auffangkategorie erhalten.

Die Startseite zeigt drei Slideransichten: die ursprüngliche Aurora-Einleitung, die drei neuesten sichtbaren Produkte und die Designwelten mit Kategorien. Automatischer Wechsel nach links alle fünf Sekunden, Maus-Pause, Pfeile bei Mausberührung, drei direkt wählbare Punkte, eine Pause-Taste sowie Wischen auf Touchgeräten. Tastaturfokus pausiert ebenfalls; bei reduzierter Bewegung ist die Automatik deaktiviert.

Der Header verlinkt rechts neben Mein Konto zu https://neonmind-ai.com/.
