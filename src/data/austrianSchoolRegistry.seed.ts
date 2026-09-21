import type { SchoolRecord } from '../server/schoolRegistry';

/**
 * Vorarlberger VS-Katalog (VOBS, vom Nutzer bereitgestellte Ergebnisliste: 164 Einträge).
 * Pro Schule nur die öffentlich angegebene Direktions-Domain zuordnen.
 * Eine abweichende VOBS-Domain, die lediglich für IT-Betreuung genannt wird,
 * NICHT als zweite Schul-Domain automatisch freischalten.
 * Das Kürzel ist das VOBS-Kürzel, andernfalls die eindeutige Schulkennzahl.
 * Bestehende IDs von Oberau, Krumbach und Mellau bleiben für Schulteam-Daten stabil.
 * E-Mail-Besitz wird unabhängig davon erst durch den Anmeldecode nachgewiesen.
 */
const VORARLBERG_VS: ReadonlyArray<readonly [id: string, code: string, name: string, emailDomain: string]> = [
  [
    "at-vbg-vs-802111",
    "vsamu",
    "Volksschule Alberschwende-Müselbach",
    "vsamu.vobs.at"
  ],
  [
    "at-vbg-vs-802081",
    "vsaho",
    "Volksschule Alberschwende-Hof",
    "vsaho.vobs.at"
  ],
  [
    "at-vbg-vs-802101",
    "vsafi",
    "Volksschule Alberschwende-Fischbach",
    "vsafi.vobs.at"
  ],
  [
    "at-vbg-vs-802091",
    "vsadr",
    "Volksschule Alberschwende-Dreßlen",
    "vsadr.vobs.at"
  ],
  [
    "at-vbg-vs-804011",
    "804011",
    "Volksschule Altach",
    "vsaltach.at"
  ],
  [
    "at-vbg-vs-804441",
    "804441",
    "Freie Montessori Schule",
    "fms.snv.at"
  ],
  [
    "at-vbg-vs-802121",
    "vsan",
    "Volksschule Andelsbuch",
    "vsandelsbuch.at"
  ],
  [
    "at-vbg-vs-802141",
    "vsau",
    "Volksschule Au",
    "vsau.vobs.at"
  ],
  [
    "at-vbg-vs-801021",
    "vsbga",
    "Volksschule Bartholomäberg Gantschier",
    "vsbga.vobs.at"
  ],
  [
    "at-vbg-vs-801011",
    "vsbar",
    "Volksschule Bartholomäberg",
    "vsbar.vobs.at"
  ],
  [
    "at-vbg-vs-802151",
    "802151",
    "Volksschule Bezau",
    "vs-bezau.at"
  ],
  [
    "at-vbg-vs-802161",
    "802161",
    "Volksschule Bildstein",
    "vs-bildstein.at"
  ],
  [
    "at-vbg-vs-802191",
    "vsbiz",
    "Volksschule Bizau",
    "vsbiz.vobs.at"
  ],
  [
    "at-vbg-vs-801051",
    "vsbls",
    "Volksschule Blons",
    "vsbls.vobs.at"
  ],
  [
    "at-vbg-vs-801111",
    "vsbzb",
    "Volksschule Bludenz-Bings",
    "vsbzb.vobs.at"
  ],
  [
    "at-vbg-vs-801091",
    "vsbzs",
    "Volksschule Bludenz St. Peter",
    "vsbzs.vobs.at"
  ],
  [
    "at-vbg-vs-801081",
    "vsbzo",
    "Volksschule Bludenz Obdorf",
    "vsbzo.vobs.at"
  ],
  [
    "at-vbg-vs-871010",
    "vsbzm",
    "Schule im Park (Clusterschule)",
    "schuleimpark.at"
  ],
  [
    "at-vbg-vs-801581",
    "pvlb",
    "Private katholische Statutschule Lernwerkstatt Brunnenfeld des Schulträgervereins Marienberg mit Öffentlichkeitsrecht bis zur 8. Schulstufe",
    "pvlb.vobs.at"
  ],
  [
    "at-vbg-vs-801121",
    "vsbd",
    "Volksschule Bludesch",
    "vsbd.vobs.at"
  ],
  [
    "at-vbg-vs-801131",
    "vsbr",
    "Volksschule Brand",
    "vsbr.vobs.at"
  ],
  [
    "at-vbg-vs-801221",
    "vsib",
    "Volksschule Innerbraz",
    "vsib.vobs.at"
  ],
  [
    "at-vbg-vs-801101",
    "vsbza",
    "Volksschule Außerbraz",
    "vsbza.vobs.at"
  ],
  [
    "at-vbg-vs-802011",
    "802011",
    "Volksschule Bregenz-Stadt",
    "vs-bregenzstadt.at"
  ],
  [
    "at-vbg-vs-802051",
    "802051",
    "Volksschule Bregenz-Schendlingen",
    "vs-schendlingen.at"
  ],
  [
    "at-vbg-vs-802071",
    "802071",
    "Volksschule Bregenz-Riedenburg",
    "schulenriedenburg.at"
  ],
  [
    "at-vbg-vs-802041",
    "802041",
    "Volksschule Bregenz-Rieden",
    "vsrieden.at"
  ],
  [
    "at-vbg-vs-802061",
    "vsbfl",
    "Volksschule Bregenz-Fluh",
    "vsbfl.vobs.at"
  ],
  [
    "at-vbg-vs-802021",
    "vsbau",
    "Volksschule Bregenz-Augasse",
    "vsbau.vobs.at"
  ],
  [
    "at-vbg-vs-802631",
    "vsbwe",
    "Schule Weidach Bregenz (VS mit angeschl. ASO)",
    "vsbwe.vobs.at"
  ],
  [
    "at-vbg-vs-802661",
    "802661",
    "Private Volksschule Mehrerau",
    "mehrerau.at"
  ],
  [
    "at-vbg-vs-802651",
    "802651",
    "Private katholische Volksschule Marienberg des Schulträgervereins Marienberg in Bregenz",
    "vsmarienberg.at"
  ],
  [
    "at-vbg-vs-802201",
    "vsbuc",
    "Volksschule Buch",
    "vsbuc.vobs.at"
  ],
  [
    "at-vbg-vs-801141",
    "vsbu",
    "Volksschule Bürs",
    "vsbu.vobs.at"
  ],
  [
    "at-vbg-vs-801151",
    "vsbb",
    "Volksschule Bürserberg",
    "vsbb.vobs.at"
  ],
  [
    "at-vbg-vs-801161",
    "vsda",
    "Volksschule Dalaas",
    "vsda.vobs.at"
  ],
  [
    "at-vbg-vs-802211",
    "vsdl",
    "Volksschule Damüls",
    "vsdl.vobs.at"
  ],
  [
    "at-vbg-vs-802221",
    "vsdo",
    "Volksschule Doren",
    "vsdo.vobs.at"
  ],
  [
    "at-vbg-vs-803141",
    "803141",
    "Volksschule Dornbirn-Winsau",
    "vswi.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803131",
    "803131",
    "Volksschule Dornbirn-Watzenegg",
    "vswe.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803221",
    "803221",
    "Volksschule Dornbirn-Wallenmahd",
    "vswm.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803061",
    "803061",
    "Volksschule Dornbirn-Schoren",
    "vssh.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803031",
    "803031",
    "Volksschule Dornbirn-Rohrbach",
    "vsrb.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803071",
    "803071",
    "Volksschule Dornbirn-Oberdorf",
    "vsod.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803051",
    "803051",
    "Volksschule Dornbirn-Mittelfeld",
    "vsmf.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803021",
    "803021",
    "Volksschule Dornbirn-Markt",
    "vsma.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803041",
    "803041",
    "Volksschule Dornbirn-Leopoldstraße",
    "vsls.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803121",
    "803121",
    "Volksschule Dornbirn-Kehlegg",
    "vske.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803111",
    "803111",
    "Volksschule Dornbirn-Heilgereuthe",
    "vshr.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803081",
    "803081",
    "Volksschule Dornbirn-Haselstauden",
    "vshs.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803101",
    "803101",
    "Volksschule Dornbirn-Gütle",
    "vsgu.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803011",
    "803011",
    "Volksschule Dornbirn-Edlach",
    "vsed.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-803261",
    "803261",
    "Volksschule Dornbirn Fischbach",
    "vsfo.edu.dornbirn.at"
  ],
  [
    "at-vbg-vs-804021",
    "804021",
    "Volksschule Düns",
    "vs.duens.at"
  ],
  [
    "at-vbg-vs-802241",
    "802241",
    "Volksschule Egg-Großdorf",
    "vsegd.at"
  ],
  [
    "at-vbg-vs-802231",
    "vsegg",
    "Volksschule Egg",
    "vsegg.at"
  ],
  [
    "at-vbg-vs-802251",
    "vseb",
    "Volksschule Eichenberg",
    "vseb.vobs.at"
  ],
  [
    "at-vbg-vs-oberau",
    "vsfoa",
    "Volksschule Gisingen-Oberau",
    "vsfoa.vobs.at"
  ],
  [
    "at-vbg-vs-804101",
    "vsfto",
    "Volksschule Feldkirch-Tosters",
    "vsfto.vobs.at"
  ],
  [
    "at-vbg-vs-804091",
    "vsfti",
    "Volksschule Feldkirch-Tisis",
    "vsfti.vobs.at"
  ],
  [
    "at-vbg-vs-804081",
    "vsfno",
    "Volksschule Feldkirch-Nofels",
    "vsfno.vobs.at"
  ],
  [
    "at-vbg-vs-804061",
    "vsfgi",
    "Volksschule Feldkirch-Gisingen-Sebastianplatz",
    "vsfgi.vobs.at"
  ],
  [
    "at-vbg-vs-804051",
    "vsfal",
    "Volksschule Feldkirch-Altenstadt",
    "vsfal.vobs.at"
  ],
  [
    "at-vbg-vs-804041",
    "vsfle",
    "Volksschule Feldkirch Levis",
    "vsfle.vobs.at"
  ],
  [
    "at-vbg-vs-804431",
    "804431",
    "Praxisschule Feldkirch",
    "praxis-schule.at"
  ],
  [
    "at-vbg-vs-801181",
    "vsfo",
    "Volksschule Fontanella",
    "vsfo.vobs.at"
  ],
  [
    "at-vbg-vs-804111",
    "vsfrh",
    "Volksschule Frastanz-Hofen",
    "vsfrh.vobs.at"
  ],
  [
    "at-vbg-vs-804131",
    "vsfrf",
    "Volksschule Frastanz-Fellengatter",
    "vsfrf.vobs.at"
  ],
  [
    "at-vbg-vs-804141",
    "804141",
    "Volksschule Fraxern",
    "vsfr.at"
  ],
  [
    "at-vbg-vs-802261",
    "802261",
    "Volksschule Fußach",
    "fussach-vs.at"
  ],
  [
    "at-vbg-vs-802271",
    "vsga",
    "Volksschule Gaißau",
    "vsga.vobs.at"
  ],
  [
    "at-vbg-vs-801201",
    "vsgs",
    "Volksschule Gaschurn",
    "vsgs.vobs.at"
  ],
  [
    "at-vbg-vs-801311",
    "vsgu",
    "Volksschule Gurtis",
    "vsgu.vobs.at"
  ],
  [
    "at-vbg-vs-804151",
    "vsgkd",
    "Volksschule Göfis-Kirchdorf",
    "vsgkd.vobs.at"
  ],
  [
    "at-vbg-vs-804161",
    "vsgag",
    "Volksschule Göfis-Agasella",
    "vsgag.vobs.at"
  ],
  [
    "at-vbg-vs-804201",
    "804201",
    "Waldorfschule Rheintal",
    "waldorfschule-rheintal.at"
  ],
  [
    "at-vbg-vs-804171",
    "vsgma",
    "Volksschule Götzis-Markt",
    "vsgma.vobs.at"
  ],
  [
    "at-vbg-vs-804391",
    "vsgbl",
    "Volksschule Götzis-Blattur",
    "vsgbl.vobs.at"
  ],
  [
    "at-vbg-vs-804181",
    "vsgbe",
    "Volksschule Götzis-Berg",
    "vsgbe.vobs.at"
  ],
  [
    "at-vbg-vs-802291",
    "802291",
    "Volksschule Hard-Mittelweiherburg",
    "vs-mwbg.at"
  ],
  [
    "at-vbg-vs-872020",
    "872020",
    "Schule am See (Clusterschule)",
    "schuleamsee.at"
  ],
  [
    "at-vbg-vs-802471",
    "802471",
    "Volksschule Hirschegg",
    "vshirschegg.at"
  ],
  [
    "at-vbg-vs-802301",
    "802301",
    "Volksschule Hittisau",
    "vs-hittisau.at"
  ],
  [
    "at-vbg-vs-803171",
    "vshor",
    "Volksschule Hohenems-Reute",
    "vsr-hohenems.at"
  ],
  [
    "at-vbg-vs-803151",
    "803151",
    "Volksschule Hohenems-Markt",
    "vsm-hohenems.at"
  ],
  [
    "at-vbg-vs-803161",
    "vshoh",
    "Volksschule Hohenems-Herrenried",
    "vshoh.vobs.at"
  ],
  [
    "at-vbg-vs-803251",
    "vshos",
    "Volksschule Hohenems Schwefel (mit angeschl. ASO)",
    "vss-hohenems.at"
  ],
  [
    "at-vbg-vs-802351",
    "vsho",
    "Volksschule Hohenweiler",
    "vsho.vobs.at"
  ],
  [
    "at-vbg-vs-802331",
    "vshud",
    "Volksschule Höchst-Unterdorf",
    "vshud.vobs.at"
  ],
  [
    "at-vbg-vs-802311",
    "802311",
    "Volksschule Höchst-Kirchdorf",
    "vshkd.at"
  ],
  [
    "at-vbg-vs-802641",
    "802641",
    "Offene Schulstube (Privatschule mit Öffentlichkeitsrecht)",
    "schulstube.at"
  ],
  [
    "at-vbg-vs-802341",
    "vshb",
    "Volksschule Hörbranz",
    "vshb.vobs.at"
  ],
  [
    "at-vbg-vs-802361",
    "vskb",
    "Volksschule Kennelbach",
    "vskb.vobs.at"
  ],
  [
    "at-vbg-vs-804191",
    "804191",
    "Volksschule Klaus",
    "vsklaus.at"
  ],
  [
    "at-vbg-vs-801231",
    "vskt",
    "Volksschule Klösterle",
    "vskt.vobs.at"
  ],
  [
    "at-vbg-vs-804211",
    "804211",
    "Volksschule Koblach",
    "vs-koblach.at"
  ],
  [
    "at-vbg-vs-krumbach",
    "vskr",
    "Volksschule Krumbach",
    "vskr.vobs.at"
  ],
  [
    "at-vbg-vs-802381",
    "vslan",
    "Volksschule Langen",
    "vslan.vobs.at"
  ],
  [
    "at-vbg-vs-802401",
    "vsla",
    "Volksschule Langenegg (mit angeschl. ASO)",
    "vsla.vobs.at"
  ],
  [
    "at-vbg-vs-804221",
    "vsrlt",
    "Volksschule Rankweil-Laterns-Thal",
    "vsrlt.vobs.at"
  ],
  [
    "at-vbg-vs-802421",
    "802421",
    "Volksschule Lauterach-Unterfeld (mit angeschl. ASO)",
    "schule-unterfeld.at"
  ],
  [
    "at-vbg-vs-802411",
    "802411",
    "Volksschule Lauterach-Dorf",
    "vslad.at"
  ],
  [
    "at-vbg-vs-801251",
    "801251",
    "Volksschule Lech",
    "bildungscampus-lech.at"
  ],
  [
    "at-vbg-vs-802431",
    "vsli",
    "Volksschule Lingenau",
    "vsli.vobs.at"
  ],
  [
    "at-vbg-vs-802441",
    "vslo",
    "Volksschule Lochau",
    "vslo.vobs.at"
  ],
  [
    "at-vbg-vs-801271",
    "vslr",
    "Volksschule Lorüns",
    "vslr.vobs.at"
  ],
  [
    "at-vbg-vs-801281",
    "vslu",
    "Volksschule Ludesch",
    "vslu.vobs.at"
  ],
  [
    "at-vbg-vs-801571",
    "801571",
    "Private Volksschule Montessori Zentrum Oberland",
    "mzo.at"
  ],
  [
    "at-vbg-vs-803211",
    "vslrk",
    "Volksschule Lustenau-Rotkreuz",
    "vslrk.vobs.at"
  ],
  [
    "at-vbg-vs-803201",
    "vslrd",
    "Volksschule Lustenau-Rheindorf",
    "vslrd.vobs.at"
  ],
  [
    "at-vbg-vs-803191",
    "vslkd",
    "Volksschule Lustenau-Kirchdorf",
    "vslkd.vobs.at"
  ],
  [
    "at-vbg-vs-803181",
    "vslhf",
    "Volksschule Lustenau-Hasenfeld",
    "vslhf.vobs.at"
  ],
  [
    "at-vbg-vs-804251",
    "vsme",
    "Volksschule Meiningen",
    "vsme.vobs.at"
  ],
  [
    "at-vbg-vs-mellau",
    "vsml",
    "Volksschule Mellau",
    "vsml.vobs.at"
  ],
  [
    "at-vbg-vs-802461",
    "802461",
    "Volksschule Mittelberg",
    "vsmittelberg.at"
  ],
  [
    "at-vbg-vs-804241",
    "804241",
    "Volksschule Mäder",
    "vsmaeder.at"
  ],
  [
    "at-vbg-vs-802491",
    "vsmo",
    "Volksschule Möggers",
    "vsmo.vobs.at"
  ],
  [
    "at-vbg-vs-801321",
    "vsneh",
    "Volksschule Nenzing-Halden",
    "vsneh.vobs.at"
  ],
  [
    "at-vbg-vs-801291",
    "801291",
    "Volksschule Nenzing",
    "vsne.at"
  ],
  [
    "at-vbg-vs-801301",
    "vsneb",
    "Volksschule Beschling",
    "schulen-ne.at"
  ],
  [
    "at-vbg-vs-801341",
    "vsnu",
    "Volksschule Nüziders",
    "vsnu.vobs.at"
  ],
  [
    "at-vbg-vs-801351",
    "vsra",
    "Volksschule Raggal",
    "vsra.vobs.at"
  ],
  [
    "at-vbg-vs-804421",
    "vsrmo",
    "Volksschule Rankweil-Montfort",
    "vsrmo.vobs.at"
  ],
  [
    "at-vbg-vs-804261",
    "vsrma",
    "Volksschule Rankweil-Markt (mit angeschl. ASO)",
    "vsrma.vobs.at"
  ],
  [
    "at-vbg-vs-804271",
    "vsrbr",
    "Volksschule Rankweil-Brederis",
    "vsrbr.vobs.at"
  ],
  [
    "at-vbg-vs-804411",
    "804411",
    "Private Volksschule und Mittelschule (Entdeckerschule) der Freikirchen in Österreich des Schulvereins \"Wertvoll\")",
    "entdeckerschule.at"
  ],
  [
    "at-vbg-vs-802501",
    "vsre",
    "Volksschule Reuthe",
    "vsre.vobs.at"
  ],
  [
    "at-vbg-vs-802511",
    "vsrb",
    "Volksschule Riefensberg",
    "vsrb.vobs.at"
  ],
  [
    "at-vbg-vs-802481",
    "802481",
    "Volksschule Riezlern",
    "vsriezlern.at"
  ],
  [
    "at-vbg-vs-804281",
    "vsro",
    "Volksschule Röns",
    "vsro.vobs.at"
  ],
  [
    "at-vbg-vs-804291",
    "vsrt",
    "Volksschule Röthis",
    "vsrt.vobs.at"
  ],
  [
    "at-vbg-vs-804301",
    "804301",
    "Volksschule Satteins",
    "vs-satteins.at"
  ],
  [
    "at-vbg-vs-804311",
    "vssc",
    "Volksschule Schlins",
    "vssc.vobs.at"
  ],
  [
    "at-vbg-vs-804023",
    "804023",
    "Paedakoop Privatschule",
    "paedakoop.snv.at"
  ],
  [
    "at-vbg-vs-802521",
    "802521",
    "Volksschule Schnepfau",
    "vs-schnepfau.at"
  ],
  [
    "at-vbg-vs-804321",
    "vssn",
    "Volksschule Schnifis",
    "vssn.vobs.at"
  ],
  [
    "at-vbg-vs-802531",
    "vsse",
    "Volksschule Schoppernau",
    "vsse.vobs.at"
  ],
  [
    "at-vbg-vs-801431",
    "vsshd",
    "Volksschule Schruns",
    "vsshd.vobs.at"
  ],
  [
    "at-vbg-vs-802551",
    "802551",
    "Volksschule Schwarzach",
    "vsschwarzach.at"
  ],
  [
    "at-vbg-vs-802561",
    "vssb",
    "Volksschule Schwarzenberg",
    "vsschwarzenberg.at"
  ],
  [
    "at-vbg-vs-802571",
    "vssi",
    "Volksschule Sibratsgfäll",
    "vssi.vobs.at"
  ],
  [
    "at-vbg-vs-801461",
    "vsst",
    "Volksschule Silbertal",
    "vsst.vobs.at"
  ],
  [
    "at-vbg-vs-801481",
    "vsso",
    "Volksschule Sonntag",
    "vsso.vobs.at"
  ],
  [
    "at-vbg-vs-801381",
    "vssta",
    "Volksschule St. Anton im Montafon",
    "vssta.vobs.at"
  ],
  [
    "at-vbg-vs-801561",
    "vssgg",
    "Volksschule St.Gallenkirch-Galgenul",
    "vssgg.vobs.at"
  ],
  [
    "at-vbg-vs-801391",
    "vssgk",
    "Volksschule St. Gallenkirch",
    "vssgk.vobs.at"
  ],
  [
    "at-vbg-vs-801411",
    "vssgo",
    "Volksschule Gortipohl",
    "vssgo.vobs.at"
  ],
  [
    "at-vbg-vs-801421",
    "vssg",
    "Volksschule St. Gerold",
    "vssg.vobs.at"
  ],
  [
    "at-vbg-vs-804331",
    "vssu",
    "Volksschule Sulz",
    "vssu.vobs.at"
  ],
  [
    "at-vbg-vs-802591",
    "vssut",
    "Volksschule Sulzberg-Thal",
    "vssut.vobs.at"
  ],
  [
    "at-vbg-vs-802581",
    "vssub",
    "Volksschule Sulzberg",
    "vssub.vobs.at"
  ],
  [
    "at-vbg-vs-801511",
    "vsth",
    "Volksschule Thüringen",
    "vsth.vobs.at"
  ],
  [
    "at-vbg-vs-801521",
    "vstb",
    "Volksschule Thüringerberg",
    "vstb.vobs.at"
  ],
  [
    "at-vbg-vs-801531",
    "vstsc",
    "Volksschule Tschagguns",
    "vstsc.vobs.at"
  ],
  [
    "at-vbg-vs-801551",
    "vsva",
    "Volksschule Vandans (mit angeschl. ASO)",
    "vsva.vobs.at"
  ],
  [
    "at-vbg-vs-804351",
    "vsvb",
    "Volksschule Viktorsberg",
    "vsvb.vobs.at"
  ],
  [
    "at-vbg-vs-802541",
    "vssr",
    "Volksschule Warth-Schröcken",
    "vssr.vobs.at"
  ],
  [
    "at-vbg-vs-804361",
    "804361",
    "Volksschule Weiler",
    "vs-weiler.at"
  ],
  [
    "at-vbg-vs-802621",
    "802621",
    "Volksschule Wolfurt-Mähdle",
    "vsmaehdle.at"
  ],
  [
    "at-vbg-vs-802611",
    "vswob",
    "Volksschule Wolfurt-Bütze",
    "vswob.vobs.at"
  ],
  [
    "at-vbg-vs-804341",
    "804341",
    "Volksschule Übersaxen",
    "vs-uebersaxen.at"
  ],
  [
    "at-vbg-vs-804371",
    "vsbt",
    "Volksschule Zwischenwasser-Batschuns",
    "vsbt.vobs.at"
  ],
  [
    "at-vbg-vs-804451",
    "vszd",
    "Volksschule Zwischenwasser-Dafins",
    "vszd.vobs.at"
  ],
  [
    "at-vbg-vs-804381",
    "vszw",
    "Volksschule Zwischenwasser-Muntlix",
    "vszw.vobs.at"
  ]
];

export const INITIAL_VERIFIED_AUSTRIAN_SCHOOLS: Array<Omit<SchoolRecord, 'createdAt' | 'updatedAt'>> =
  VORARLBERG_VS.map(([id, code, name, emailDomain]) => ({
    id, code, name, country: 'AT', federalState: 'Vorarlberg',
    domains: [emailDomain], status: 'verified',
  }));
