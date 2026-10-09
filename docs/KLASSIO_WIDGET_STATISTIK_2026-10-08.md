# Klassio: Statistik im Widget

## Korrektur vom 9. Oktober 2026

Die direkte Statistikschaltfläche im „Ich bin da!“-Widget scheiterte an einem
Fehler in der Anwendung: Die Statistikansicht kehrte vor mehreren React-Hooks
zurück. Beim Ansichtswechsel änderte sich dadurch die Anzahl aufgerufener Hooks.
Die vorherige Vermutung über parallele responsive Rahmen erklärte den Fehler
nicht. Beide Ansichten führen jetzt alle Hooks in derselben Reihenfolge aus.

Der Classroom-Browserlauf prüft die direkte Schaltfläche, beide Zeiträume,
Minimieren und Wiederherstellen mit ausgewähltem Schuljahr sowie die Rückkehr
zur unveränderten Anwesenheitsansicht. Der Wechsel wird zweimal wiederholt.
Die bestehenden Prüfungen der separaten Anwesenheitsstatistik bleiben erhalten.

Die Bedienung auf der echten Touch-Tafel bleibt als Geräteprüfung offen.
