# Produkte entfernen und wiederherstellen

In der Shop-Verwaltung ein Produkt auswählen, **Produkt löschen** anklicken und mit **In Papierkorb verschieben** bestätigen. Das Produkt verschwindet aus dem Katalog und lässt sich nicht neu bestellen.

Links **Papierkorb** öffnen und **Wiederherstellen** anklicken, um es zurückzuholen. Der ursprüngliche Veröffentlichungsstatus bleibt erhalten. Bestellungen, private Pakete und Vorschaubilder werden nicht gelöscht.

Die API ist durch Betreiberanmeldung und Herkunftsprüfung geschützt. Die D1-Migration `0006_product_trash.sql` legt die separate Papierkorb-Tabelle an. Ein veralteter Produkteditor kann ein entferntes Produkt nicht durch Speichern wiederherstellen.

Geprüft: Berechtigungen, wiederholtes Entfernen, Katalog und Bestellbarkeit, bestehender Downloadzugang, Wiederherstellen veröffentlichter Produkte und Entwürfe, veralteter Editor sowie ungültige Anfragen. Zusätzlich wurde der Ablauf im lokalen Browser mit Testprodukten geprüft. Es wurden keine echten Produkte entfernt.
