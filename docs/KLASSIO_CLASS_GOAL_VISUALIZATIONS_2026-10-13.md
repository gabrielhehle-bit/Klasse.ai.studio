# Klassenziel: drei Darstellungen in einem Widget

Das reguläre Klassenziel bietet Glas, Zielring und Thermometer direkt im Widget. Alle drei Darstellungen nutzen unverändert den gemeinsamen Fortschritt, die Zielzahl und die Belohnung. Die direkte Wahl schreibt nur `widget.settings.style`; sie verändert weder den gemeinsamen Zielstand noch die globalen Darstellungs-Voreinstellungen.

Bestehende Klassenglas-, Ziel-Thermometer-, Klassen-Ziel- und Sparschwein-Widgets bleiben lesbar und unter Weitere Widgets erreichbar. Die bisherigen vollständigen Einstellungen bleiben hinter dem Kopf-Zahnrad. Ungültige Darstellungswerte aus Backups erhalten einen gültigen Fallback anhand vorhandener Voreinstellungen und des alten Widget-Typs. Der Mindestplatz berücksichtigt die neue 44-Pixel-Darstellungswahl.

Browserprüfung: alle bisherigen Einzelvarianten, reale gemeinsame Fortschrittsänderungen, Darstellungswechsel ohne Verlust von Ziel/Belohnung/Zähler, Minimieren, Schließen/Wiederöffnen, Zielerreichung und bestätigtes Zurücksetzen. Native Trefferprüfung kontrolliert alle sechs Bedienelemente auf Laptop und Tablet. Screenshots dokumentieren jede Darstellung und die Tablet-Ansicht. Separate Tests prüfen die Reihenfolge gültiger Voreinstellungen und sichere Fallbacks für alte Backups.

Zurücksetzen sitzt in der Ziel-Titelzeile. Die untere Aktionszeile reserviert Platz für den Größen-Ziehgriff, damit er keine Zielaktion überdeckt.
