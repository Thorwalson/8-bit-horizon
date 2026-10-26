# 8-bit Horizon – Website

Statische Seite ohne Build-Tools. Funktioniert direkt auf GitHub Pages.

## Online stellen (GitHub Pages)

1. Neues Repository auf GitHub anlegen, z. B. `8-bit-horizon` (oder `DEINNAME.github.io` für die Hauptadresse).
2. Den **Inhalt** dieses Ordners hochladen (`index.html` muss im Hauptverzeichnis liegen).
3. Repository → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → Save.
4. Nach ca. einer Minute ist die Seite erreichbar unter `https://DEINNAME.github.io/8-bit-horizon/`.

Eigene Domain: in Settings → Pages unter *Custom domain* eintragen.

## Was du anpassen musst (suche nach `TODO`)

- `js/data.js`: Name, Beschreibung, Features und Links deines WoW-Addons. Screenshots in `assets/img/` ablegen und im Eintrag unter `screenshots` eintragen.
- `impressum.html` und `datenschutz.html`: Vorlagen mit Platzhaltern. Für eine öffentliche Seite in Deutschland ausfüllen und bei Bedarf prüfen lassen.

## Neues Projekt hinzufügen

In `js/data.js` einen Block in `projects` kopieren, `id`, Titel, Typ, Status, Farbe und Texte ändern. Karte, Detailseite (`project.html?id=...`) und Filter entstehen automatisch.

## Social-Media-Links

In `js/data.js` unter `socials` die URL eintragen. Leere Einträge bleiben unsichtbar.

## Themes (Jahreszeiten und Events)

Die Seite wählt anhand des Datums automatisch:

| Zeitraum | Theme |
|---|---|
| 28.12. – 3.1. | Silvester (Feuerwerk) |
| 1.12. – 27.12. | Weihnachten |
| 15.10. – 1.11. | Halloween |
| 2 Wochen vor bis Ostermontag | Ostern (Datum wird berechnet) |
| 1.3. – 31.5. | Frühling |
| 1.6. – 31.8. | Sonnenuntergang (Sommer, Standard) |
| 1.9. – 30.11. | Herbst |
| 4.1. – 28.2. | Winter |

- **Testen:** `index.html?theme=halloween` (Namen: `sunset, spring, autumn, winter, halloween, christmas, newyear, easter`). Besucher können unten links auf der Startseite selbst ein Theme wählen.
- **Zeiträume ändern:** `js/themes.js`, Funktion `pickByDate`.
- **Neues Event:** Theme-Block in `THEMES` kopieren (Farben, Himmel, Partikel) und in `pickByDate` einen Zeitraum eintragen.
- **Theme-Wahl für Besucher ausblenden:** das Element `<div id="theme-picker">` in `index.html` löschen.

## Neue Unterseite

1. `projects.html` kopieren, Inhalt anpassen (Banner mit `data-scene="strip"` behalten).
2. In `js/site.js` im Array `NAV` einen Eintrag ergänzen.

## Struktur

```
index.html, projects.html, project.html, impressum.html, datenschutz.html, 404.html
css/style.css          Aussehen
js/data.js             Inhalte (hier pflegst du fast alles)
js/themes.js           Farben und Datumslogik
js/scene.js            Pixel-Landschaft
js/site.js             Navigation, Footer, Projektlisten
assets/img, assets/fonts
```

## Schriften

Silkscreen und Pixelify Sans (SIL Open Font License, Lizenzdateien liegen in `assets/fonts/`). Sie werden von der Seite selbst ausgeliefert, es gibt keine Verbindung zu Google.
