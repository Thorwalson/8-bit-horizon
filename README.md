# 8-bit Horizon – Website

Statische Seite ohne Build-Tools. Funktioniert direkt auf GitHub Pages.

## Online stellen (GitHub Pages)

1. Neues Repository auf GitHub anlegen, z. B. `8-bit-horizon` (oder `DEINNAME.github.io` für die Hauptadresse).
2. Den **Inhalt** dieses Ordners hochladen (`index.html` muss im Hauptverzeichnis liegen).
3. Repository → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → Save.
4. Nach ca. einer Minute ist die Seite erreichbar unter `https://DEINNAME.github.io/8-bit-horizon/`.

Eigene Domain: in Settings → Pages unter *Custom domain* eintragen.

## Was du anpassen musst (suche nach `TODO`)

- Name, Beschreibung, Features und Links deines WoW-Addons: im Team-Dashboard (`admin.html`) das Projekt „WoW-Addon“ bearbeiten.
- `impressum.html` und `datenschutz.html`: Vorlagen mit Platzhaltern. Für eine öffentliche Seite in Deutschland ausfüllen und bei Bedarf prüfen lassen.

## Passwort für das Modus-Menü

Startpasswort: `horizon`. **Bitte ändern:**
1. `passwort.html` im Browser öffnen (z. B. `https://DEINNAME.github.io/8-bit-horizon/passwort.html`).
2. Neues Passwort eingeben, die erzeugte Zeile kopieren.
3. In `js/data.js` die Zeile `themePasswordHash: ...` damit ersetzen und speichern.

Wichtig: Das ist ein Sichtschutz für ein statisches GitHub-Pages-Projekt. Es hält Besucher vom Menü fern, ist aber kein Hochsicherheitsschloss, weil der Code im Browser läuft. Da das Menü nur das Aussehen im eigenen Browser ändert, ist das unkritisch. Nimm kein Passwort, das du anderswo benutzt.

## Screenshots und Videos

Im Team-Dashboard beim Projekt einen Baustein „Bilder und Videos“ hinzufügen: Bilder ins Feld ziehen, YouTube-Links einfügen. Videos laden auf der Seite erst nach dem Klick von YouTube (datenschutzfreundlich über youtube-nocookie.com).

## Team-Dashboard (Projekte verwalten)

Unter `deinseite/admin.html` (auch über „Team“ im Footer) pflegst du Projekte ohne Code:

- Kategorien: Addons und Mods, Spiele, Programme und Tools
- Baukasten aus Überschrift, Text, Liste und „Bilder und Videos“ (Bilder per Drag and Drop, YouTube per Link)
- Links/Buttons, Akzentfarbe, Status, Updates, Vorschau
- „Veröffentlichen“ speichert alles als **einen Commit** in dein Repository. Nach ca. 1 Minute ist die Seite aktualisiert.

**Anmeldung:** mit einem GitHub-Zugangstoken (Fine-grained Personal Access Token). GitHub selbst prüft, ob jemand Schreibrechte hat, ein Passwort im Quelltext gibt es nicht.
1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) öffnen.
2. Name vergeben, Ablaufdatum wählen.
3. Repository access: *Only select repositories* → `8-bit-horizon`.
4. Repository permissions: **Contents → Read and write**.
5. Token erzeugen (beginnt mit `github_pat_`), im Dashboard einfügen. Er wird nur einmal angezeigt.

Dein Co-Entwickler braucht Schreibzugriff auf das Repository (Settings → Collaborators) und einen eigenen Token. Wird ein Token verloren, auf GitHub unter Settings → Developer settings widerrufen.

Bilder werden auf max. 1920 px verkleinert und landen in `assets/uploads/`. Entfernte Bilder und gelöschte Projekte räumt das Dashboard beim Veröffentlichen mit auf.

Die Projektdaten stehen in `data/projects.js`. Du kannst die Datei auch von Hand bearbeiten, wenn das JSON gültig bleibt.

**Neuigkeiten auf der Startseite:** pro Kategorie wird das neueste Update angezeigt (Dashboard → Projekt → Updates → „Neues Update“). Gibt es noch kein Update, erscheint „Neues Projekt“ mit dem Datum der Anlage.

**Kategorien ändern:** in `js/data.js` unter `categories`.

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

- **Umstellen (nur Team):** Auf der Startseite unten links das kleine Burger-Icon anklicken, Passwort eingeben, Theme wählen. Die Auswahl gilt nur in deinem Browser, Besucher sehen immer das Datums-Theme. Nach dem Entsperren geht auch `index.html?theme=halloween` (Namen: `sunset, spring, autumn, winter, halloween, christmas, newyear, easter`).
- **Zeiträume ändern:** `js/themes.js`, Funktion `pickByDate`.
- **Neues Event:** Theme-Block in `THEMES` kopieren (Farben, Himmel, Partikel) und in `pickByDate` einen Zeitraum eintragen.
- **Menü komplett entfernen:** das Element `<div id="theme-picker">` in `index.html` löschen.

## Neue Unterseite

1. `projects.html` kopieren, Inhalt anpassen (Banner mit `data-scene="strip"` behalten).
2. In `js/site.js` im Array `NAV` einen Eintrag ergänzen.

## Struktur

```
index.html, projects.html, project.html, impressum.html, datenschutz.html, 404.html, passwort.html (Hilfsseite)
css/style.css          Aussehen
js/data.js             Einstellungen (Name, Discord, Social Links, Kategorien, Passwort-Hash)
data/projects.js       Projekte (wird vom Dashboard verwaltet)
admin.html, js/admin.js, css/admin.css   Team-Dashboard
js/themes.js           Farben und Datumslogik
js/scene.js            Pixel-Landschaft
js/site.js             Navigation, Footer, Projektlisten
assets/img, assets/fonts
```

## Schriften

Silkscreen und Pixelify Sans (SIL Open Font License, Lizenzdateien liegen in `assets/fonts/`). Sie werden von der Seite selbst ausgeliefert, es gibt keine Verbindung zu Google.
