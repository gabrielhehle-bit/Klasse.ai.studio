export type RiddleCategory = 'deutsch' | 'mathe' | 'logik' | 'spass' | 'funke';
export type MatheLevel = 1 | 2 | 3 | 4;

export interface Riddle {
  id: string;
  category: RiddleCategory;
  question: string;
  answer: string;
  level?: MatheLevel; // For Mathe
  isCustom?: boolean;
}

export const PRESET_RIDDLES: Omit<Riddle, 'id'>[] = [
  // --- KREATIVER FUNKE (3-Minuten Stunden-Ausklang) ---
  { category: 'funke', question: 'Wusstest du, dass Haie älter sind als Bäume?', answer: 'Ja, Haie gibt es seit etwa 400 Millionen Jahren auf der Erde! Die ersten Bäume entwickelten sich dagegen erst vor rund 350 Millionen Jahren. Haie sind sogar älter als die Ringe des Saturns!' },
  { category: 'funke', question: 'Wusstest du, dass Bananen botanisch gesehen Beeren sind, Erdbeeren aber nicht?', answer: 'Botanisch gesehen wachsen Bananen aus einem einzigen Fruchtknoten und sind echte Beeren. Erdbeeren dagegen sind sogenannte Sammelnussfrüchte, weil die eigentlichen Früchte die winzigen Nüsschen (Samen) auf der gelben Außenhaut sind!' },
  { category: 'funke', question: 'Wusstest du, dass es auf den Planeten Neptun und Uranus Diamanten regnet?', answer: 'Wissenschaftler glauben, dass der extreme Druck tief in der Atmosphäre dieser Gasriesen Kohlenstoffatome so stark zusammenpresst, dass sie zu echten Diamanten werden und wie Hagelkörner herabrechnen!' },
  { category: 'funke', question: 'Wusstest du, dass Tintenfische (Oktopusse) drei Herzen und blaues Blut haben?', answer: 'Zwei ihrer Herzen pumpen Blut ausschließlich zu den Kiemen, während das dritte Herz den Rest des Körpers versorgt. Ihr Blut funkelt blau, weil es ein kupferhaltiges Protein statt unseres eisenhaltigen roten Farbstoffs verwendet!' },
  { category: 'funke', question: 'Das Gehirn-Paradoxon: Was passiert, wenn Pinocchio sagt: "Meine Nase wächst jetzt"?', answer: 'Das ist ein echtes logisches Paradoxon! Wenn seine Nase NICHT wächst, hat er gelogen – also müsste sie wachsen. Wenn sie aber wächst, hat er die Wahrheit gesagt – dann dürfte sie aber gar nicht wachsen! Eine unendliche Schleife!' },
  { category: 'funke', question: 'Wusstest du, dass Wolken tonnenschwer sind, obwohl sie elegant im Himmel fliegen?', answer: 'Eine durchschnittliche Schäfchenwolke wiegt etwa 500.000 Kilogramm – das ist so schwer wie 100 ausgewachsene Elefanten! Sie schweben nur, weil diese enorme Masse über ein riesiges Volumen verteilt ist und die aufsteigende warme Luft sie trägt.' },
  { category: 'funke', question: 'Wusstest du, dass Honig die einzige Nahrung ist, die niemals verdirbt?', answer: 'Bienenhonig hat extrem wenig Feuchtigkeit und viel Zucker, weshalb Keime keine Chance haben. Archäologen haben in ägyptischen Pharaonengräbern über 3.000 Jahre alten Honig gefunden, der noch völlig unversehrt und theoretisch genießbar war!' },
  { category: 'funke', question: 'Wusstest du, dass Kühe feste beste Freunde haben und traurig werden, wenn man sie trennt?', answer: 'Kühe sind unglaublich soziale Tiere! Sie verbringen am liebsten Zeit mit ihrer Herzensfreundin auf der Weide. Wird die Partnerkuh weggenommen, steigt ihr Herzschlag messbar an und sie zeigen klare Anzeichen von Stress und Trauer.' },
  { category: 'funke', question: 'Das Sand-Rätsel: Wusstest du, dass es auf der Erde mehr Bäume gibt als Sterne in unserer Galaxie?', answer: 'In unserer Milchstraße gibt es geschätzt 100 bis 400 Milliarden Sterne. Auf der Erde stehen dagegen astronomische 3.000 Milliarden (3 Billionen) Bäume! Das bedeutet, es gibt etwa siebenmal so viele Bäume auf der Erde wie Sterne in unserer Galaxie.' },
  { category: 'funke', question: 'Wusstest du, dass Wassertropfen auf einer glühend heißen Pfanne schweben können?', answer: 'Dieser physikalische Effekt heißt "Leidenfrost-Effekt". Wenn die Pfanne sehr heiß ist, verdampft die Unterseite des Tropfens sofort. Es entsteht ein winziges Luftkissen aus Wasserdampf, auf dem das Kügelchen wie ein fliegender Teppich hin- und hergleitet!' },

  // --- DEUTSCH (Wort des Tages) ---
  { category: 'deutsch', question: 'Authentisch', answer: 'In echt, unverfälscht, genau so, wie etwas wirklich ist. Wenn jemand authentisch ist, verstellt er sich nicht.' },
  { category: 'deutsch', question: 'Zufriedenheit', answer: 'Ein glückliches Gefühl, wenn man keinen weiteren Wunsch mehr hat und alles gut ist, wie es ist.' },
  { category: 'deutsch', question: 'Toleranz', answer: 'Jemanden so zu akzeptieren, wie er ist, auch wenn er anders denkt, aussieht oder andere Dinge mag als man selbst.' },
  { category: 'deutsch', question: 'Inspiration', answer: 'Eine tolle Idee oder eine Eingebung. Wenn dich zum Beispiel eine schöne Blume dazu bringt, ein Bild zu malen.' },
  { category: 'deutsch', question: 'Kompromiss', answer: 'Wenn sich zwei Leute streiten und sich dann so einigen, dass beide ein bisschen nachgeben. Beide sind am Ende einverstanden.' },
  { category: 'deutsch', question: 'Vielseitig', answer: 'Wenn jemand sehr viele verschiedene Dinge gut kann oder wenn man ein Werkzeug für sehr viele Sachen benutzen kann.' },
  { category: 'deutsch', question: 'Optimismus', answer: 'Wenn man immer das Gute in allen Dingen sieht und fest daran glaubt, dass alles gut wird.' },
  { category: 'deutsch', question: 'Kreativität', answer: 'Die Fähigkeit, sich etwas Neues auszudenken, tolle Bilder zu malen oder Geschichten zu erfinden. Mit Fantasie etwas Neues schaffen!' },
  { category: 'deutsch', question: 'Faszination', answer: 'Wenn man von etwas so begeistert ist, dass man nicht mehr wegschauen möchte (z.B. ein cooler Zaubertrick).' },
  { category: 'deutsch', question: 'Verantwortung', answer: 'Dafür sorgen, dass etwas gut klappt oder beschützt wird. Wenn du auf ein Haustier aufpasst, trägst du Verantwortung.' },
  { category: 'deutsch', question: 'Solidarität', answer: 'Dass man fest zusammenhält und sich gegenseitig hilft. Einer für alle, alle für einen!' },
  { category: 'deutsch', question: 'Empathie', answer: 'Sich gut in andere Menschen hineinversetzen zu können – verstehen, wie sich ein anderer fühlt (z.B. wenn er traurig ist).' },
  { category: 'deutsch', question: 'Neugier', answer: 'Der starke Wunsch, ganz viel zu lernen und herauszufinden, wie die Welt funktioniert.' },
  { category: 'deutsch', question: 'Mut', answer: 'Wenn man etwas macht, obwohl man Angst davor hat, und sich trotzdem traut. Das Gegenteil von feige sein.' },
  { category: 'deutsch', question: 'Harmonie', answer: 'Wenn Menschen gut miteinander auskommen und sich nicht streiten. Wie Instrumente in einem Orchester, die gut zusammenpassen.' },

  // --- MATHE (Klasse 1: ZR 10 + -) ---
  { category: 'mathe', level: 1, question: '5 + 4 = ?', answer: '9' },
  { category: 'mathe', level: 1, question: '10 - 7 = ?', answer: '3' },
  { category: 'mathe', level: 1, question: 'Lara hat 3 rote und 2 gelbe Äpfel. Wie viele Äpfel sind das?', answer: '5 Äpfel' },
  { category: 'mathe', level: 1, question: '8 - 4 = ?', answer: '4' },
  { category: 'mathe', level: 1, question: '2 + 5 + 1 = ?', answer: '8' },
  { category: 'mathe', level: 1, question: 'Auf dem Baum sitzen 7 Vögel. 3 fliegen weg. Wie viele sind noch da?', answer: '4 Vögel' },
  { category: 'mathe', level: 1, question: '1 + 9 = ?', answer: '10' },

  // --- MATHE (Klasse 2: ZR 100 + -, Malreihen) ---
  { category: 'mathe', level: 2, question: '45 + 12 = ?', answer: '57' },
  { category: 'mathe', level: 2, question: '83 - 25 = ?', answer: '58' },
  { category: 'mathe', level: 2, question: '5 mal 4 = ?', answer: '20' },
  { category: 'mathe', level: 2, question: 'Tim hat 50 Cent. Er kauft ein Eis für 35 Cent. Wie viel bekommt er zurück?', answer: '15 Cent' },
  { category: 'mathe', level: 2, question: '7 * 6 = ?', answer: '42' },
  { category: 'mathe', level: 2, question: 'In einer Kiste sind 10 Eier. Wie viele Eier sind in 4 Kisten?', answer: '40 Eier' },
  { category: 'mathe', level: 2, question: '90 - 45 = ?', answer: '45' },

  // --- MATHE (Klasse 3: +, -, *, /) ---
  { category: 'mathe', level: 3, question: '450 + 325 = ?', answer: '775' },
  { category: 'mathe', level: 3, question: '24 geteilt durch 6 = ?', answer: '4' },
  { category: 'mathe', level: 3, question: '12 * 5 = ?', answer: '60' },
  { category: 'mathe', level: 3, question: 'Frau Mayer teilt 36 Zuckerl gerecht auf 6 Kinder auf. Wie viele bekommt jedes?', answer: 'Jedes Kind bekommt 6 Zuckerl.' },
  { category: 'mathe', level: 3, question: '64 geteilt durch 8 = ?', answer: '8' },
  { category: 'mathe', level: 3, question: '1000 - 350 = ?', answer: '650' },
  { category: 'mathe', level: 3, question: '9 * 7 = ?', answer: '63' },

  // --- MATHE (Klasse 4: ZR 10.000) ---
  { category: 'mathe', level: 4, question: '4500 + 2800 = ?', answer: '7300' },
  { category: 'mathe', level: 4, question: '10000 - 4550 = ?', answer: '5450' },
  { category: 'mathe', level: 4, question: '345 * 4 = ?', answer: '1380' },
  { category: 'mathe', level: 4, question: '4500 geteilt durch 9 = ?', answer: '500' },
  { category: 'mathe', level: 4, question: 'Ein Auto kostet 8500 Euro. Der Käufer hat schon 5300 Euro gespart. Wie viel fehlt?', answer: 'Es fehlen noch 3200 Euro.' },
  { category: 'mathe', level: 4, question: '9000 - 1 = ?', answer: '8999' },
  { category: 'mathe', level: 4, question: '7020 + 1980 = ?', answer: '9000' },

  // --- LOGIK-RÄTSEL ---
  { category: 'logik', question: 'Welches Rad dreht sich an einem Fahrrad nicht mit, wenn man nach rechts abbiegt?', answer: 'Das Ersatzrad (falls überhaupt vorhanden!). Rätsel-Lösung: Ein Fahrrad hat kein Ersatzrad. (Bei einem Auto wäre es das Ersatzrad).' },
  { category: 'logik', question: 'Welcher Baum hat keine Blätter und keine Wurzeln?', answer: 'Der Purzelbaum! (Oder der Stammbaum)' },
  { category: 'logik', question: 'Ich habe Städte, aber keine Häuser. Ich habe Berge, aber keine Bäume. Ich habe Wasser, aber keine Fische. Was bin ich?', answer: 'Eine Landkarte!' },
  { category: 'logik', question: 'Welcher Monat hat 28 Tage?', answer: 'Jeder Monat hat mindestens 28 Tage!' },
  { category: 'logik', question: 'Ich bin immer da, du kannst mich aber nicht sehen. Wenn du mich verschenkst, kannst du mich trotzdem behalten. Was bin ich?', answer: 'Ein Versprechen (oder ein Lächeln).' },
  { category: 'logik', question: 'Ein Hahn legt ein Ei auf das Dach der Scheune. Auf welche Seite rollt es?', answer: 'Auf gar keine, ein Hahn legt keine Eier!' },
  { category: 'logik', question: 'Wer hat Ohren, kann aber nichts hören, und viele Körner, ist aber kein Sand?', answer: 'Der Maiskolben!' },

  // --- SPASS-RÄTSEL ---
  { category: 'spass', question: 'Was wird nass, während es trocknet?', answer: 'Das Handtuch!' },
  { category: 'spass', question: 'Welches Tier dreht sich um 360 Grad und ist danach immer noch am selben Ort?', answer: 'Das Karussellpferd (oder eine Schildkröte, wenn sie sehr langsam ist). Richtige Antwort: Ein Kreisel, aber das ist kein Tier!' },
  { category: 'spass', question: 'Wer kann alle Sprachen der Welt sprechen?', answer: 'Das Echo!' },
  { category: 'spass', question: 'Welcher Vogel hat keine Flügel, keine Federn und keinen Schnabel?', answer: 'Der Spaßvogel!' },
  { category: 'spass', question: 'Was liegt zwischen Berg und Tal?', answer: 'Das "und".' },
  { category: 'spass', question: 'Zwei Mütter und zwei Töchter gehen einkaufen. Sie kaufen 3 Äpfel und jede bekommt genau einen. Wie geht das?', answer: 'Es waren Oma, Mutter und Kind (Die Mutter ist gleichzeitig Tochter der Oma).' },
  { category: 'spass', question: 'Wo kommt Silvester vor Weihnachten?', answer: 'Im Wörterbuch!' }
];

export const MOCK_RIDDLE_DB = PRESET_RIDDLES.map((r, i) => ({ ...r, id: `db-${i}` }));
