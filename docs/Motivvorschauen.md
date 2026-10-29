# Einheitliche Motivvorschauen

Die Wallpaper- und Posterpakete verwenden ein Einzelmotiv als Titelbild und eine vollständige Galerie aller unterschiedlichen Motive. Alternative Dateiformate desselben Motivs werden nicht mehrfach als neue Motive gezählt. Redline Garage enthält beispielsweise 18 Motive in Wallpaper- und Posterfassungen.

`scripts/build-motif-previews.py` liest die vorhandenen Käuferbilder unter `F:/Projekte/OnlineShop` ausschließlich lesend. Es prüft die erwartete Motivanzahl pro Paket und erzeugt JPEG-Vorschaubilder mit maximal 960 Pixeln Kantenlänge unter `dist/assets/package-previews`. Originaldateien und ZIP-Pakete werden nicht verändert. Der Build erzeugt zusätzlich `dist/package-previews.json` mit öffentlichen Bildadressen und Titeln, ohne lokale Dateipfade.

Stand der Umstellung: 39 Pakete, 408 Motive. Für die geprüften bestehenden Produkte ist im gespeicherten Produkt-JSON `motifPreviewSet: "v1"` gesetzt. Der öffentliche Katalog nimmt dann das erste Einzelmotiv als Titelbild; die Galerie-Schnittstelle liefert den vollständigen zugehörigen Satz. Die vorherigen R2-Vorschaudateien und gespeicherten Bildreferenzen bleiben für eine Rücknahme erhalten. Normale Produktänderungen erhalten diese Kennzeichnung.

Die Geräte-Vorschau übernimmt die ausgewählten Galerieeinträge. Neue, saubere Motive tragen `clean: true` und benötigen keinen Beschnitt eines eingebetteten Beschriftungsstreifens. Ältere Galerien behalten ihre bisherige Behandlung. Käuferdownloads bleiben weiterhin serverseitig geschützt.

Bei neuen oder veränderten Motivpaketen zuerst Quelldateien und erwartete Anzahl im Builder ergänzen, die Vorschauen erzeugen und prüfen, dann veröffentlichen. Die Kennzeichnung erst nach erfolgreicher Prüfung setzen. Ein Entfernen von `motifPreviewSet` schaltet ein Produkt wieder auf seine bisherigen R2-Vorschaudaten zurück.
