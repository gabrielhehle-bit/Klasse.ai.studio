/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, memo } from "react";
import { useApp } from "../context/AppContext";
import {
  generateClassPetMission,
  generatePetChatResponse,
  generatePetSpeech,
} from "../services/aiService";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Heart,
  Gift,
  RotateCcw,
  Volume2,
  ShieldCheck,
  Settings as SettingsIcon,
  Check,
  Wind,
  Music,
  Smile,
  RefreshCw,
  X,
  Send,
  Mic,
  MessageSquare,
  VolumeX,
} from "lucide-react";
import { ClassPetCanvas, ClassPetCanvasRef } from "./ClassPetCanvas";

export interface Accessory {
  id: string;
  name: string;
  icon: string;
  styleClass: string;
}

export const AVAILABLE_ACCESSORIES: Accessory[] = [
  {
    id: "crown",
    name: "Königliche Krone",
    icon: "👑",
    styleClass:
      "absolute top-[-0.65em] left-1/2 -translate-x-1/2 text-[0.85em] z-10 pointer-events-none select-none",
  },
  {
    id: "party_hat",
    name: "Bunter Partyhut",
    icon: "🥳",
    styleClass:
      "absolute top-[-0.75em] left-1/2 -translate-x-1/2 text-[0.85em] z-10 pointer-events-none select-none",
  },
  {
    id: "wizard_hat",
    name: "Schlauer Zauberhut",
    icon: "🎩",
    styleClass:
      "absolute top-[-0.7em] left-1/2 -translate-x-1/2 text-[0.85em] z-10 pointer-events-none select-none",
  },
  {
    id: "glasses",
    name: "Coole Brille",
    icon: "👓",
    styleClass:
      "absolute top-[0.1em] left-1/2 -translate-x-1/2 text-[0.6em] z-10 pointer-events-none select-none",
  },
  {
    id: "tie",
    name: "Schicke Krawatte",
    icon: "👔",
    styleClass:
      "absolute bottom-[-0.2em] left-1/2 -translate-x-1/2 text-[0.65em] z-10 pointer-events-none select-none",
  },
  {
    id: "flower",
    name: "Blume im Haar",
    icon: "🌸",
    styleClass:
      "absolute top-[-0.45em] right-[0.05em] text-[0.65em] z-10 pointer-events-none select-none",
  },
  {
    id: "detective",
    name: "Detektiv-Lupe",
    icon: "🔍",
    styleClass:
      "absolute bottom-[-0.15em] left-[-0.15em] text-[0.6em] z-10 pointer-events-none select-none",
  },
];

export interface PetBreed {
  id:
    | "trax"
    | "dog"
    | "cat"
    | "owl"
    | "dino"
    | "frog"
    | "pig"
    | "dobby"
    | "unicorn"
    | "dragon"
    | "panda"
    | "pikachu"
    | "axolotl"
    | "capybara"
    | "shiba"
    | "totoro"
    | "chopper"
    | "appa"
    | "grogu"
    | "spongebob"
    | "patrick"
    | "hello_kitty"
    | "bluey"
    | "snoopy"
    | "garfield";
  nameDefault: string;
  emoji: string;
  breedLabel: string;
  baseReaction: string;
}

export const PET_BREEDS: PetBreed[] = [
  {
    id: "trax",
    nameDefault: "Rechenrabe Trax",
    emoji: "🐦‍⬛🧮",
    breedLabel: "Rechenrabe Trax",
    baseReaction: "krächzt fröhlich ein Rechenrätsel und schlägt ein Rad! 🐦‍⬛✨",
  },
  {
    id: "dog",
    nameDefault: "Bello",
    emoji: "🐶",
    breedLabel: "Treuer Hund",
    baseReaction: "wedelt freudig mit dem Schwanz! 🐶",
  },
  {
    id: "cat",
    nameDefault: "Minka",
    emoji: "🐱",
    breedLabel: "Schlaue Katze",
    baseReaction: "schnurrt zufrieden! 🐱",
  },
  {
    id: "owl",
    nameDefault: "Oli",
    emoji: "🦉",
    breedLabel: "Weise Eule",
    baseReaction: "schaut aufmerksam! 🦉",
  },
  {
    id: "dino",
    nameDefault: "Spike",
    emoji: "🦕",
    breedLabel: "Lern-Dino",
    baseReaction: "brüllt leise! 🦕",
  },
  {
    id: "frog",
    nameDefault: "Froschi",
    emoji: "🐸",
    breedLabel: "Flinker Frosch",
    baseReaction: "quakt fröhlich! 🐸",
  },
  {
    id: "pig",
    nameDefault: "Peppa",
    emoji: "🐷",
    breedLabel: "Glücksschwein",
    baseReaction: "grunzt zufrieden! 🐷",
  },
  {
    id: "dobby",
    nameDefault: "Dobby",
    emoji: "🧦",
    breedLabel: "Hauself Dobby",
    baseReaction: "freut sich riesig über eine Socke! 🧦",
  },
  {
    id: "unicorn",
    nameDefault: "Goldi",
    emoji: "🦄",
    breedLabel: "Magisches Einhorn",
    baseReaction: "glitzert magisch im Regenbogenlicht! 🦄",
  },
  {
    id: "dragon",
    nameDefault: "Drago",
    emoji: "🐲",
    breedLabel: "Glitzer-Drache",
    baseReaction: "stößt eine kleine Wolke aus buntem Glitzer-Feuer aus! 🐲",
  },
  {
    id: "panda",
    nameDefault: "Bao",
    emoji: "🐼",
    breedLabel: "Gemütlicher Panda",
    baseReaction: "kaut genüsslich auf Bambus! 🐼",
  },
  {
    id: "pikachu",
    nameDefault: "Pika",
    emoji: "⚡",
    breedLabel: "Elektro-Maus",
    baseReaction: "versprüht gelbe Elektro-Funken vor Freude! ⚡",
  },
  {
    id: "axolotl",
    nameDefault: "Loti",
    emoji: "🦎",
    breedLabel: "Unterwasser-Axolotl",
    baseReaction: "schwimmt fröhlich umher und wechselt die Farbe! 🦎",
  },
  {
    id: "capybara",
    nameDefault: "Cappy",
    emoji: "🦦",
    breedLabel: "Tiefenentspanntes Capybara",
    baseReaction: "chillt im Wasser und verströmt pure Ruhe! 🦦",
  },
  {
    id: "shiba",
    nameDefault: "Shibi",
    emoji: "🐕",
    breedLabel: "Verspielter Shiba Inu",
    baseReaction: "dreht sich freudig im Kreis und gibt Pfötchen! 🐕",
  },
  {
    id: "totoro",
    nameDefault: "Totoro",
    emoji: "🐨",
    breedLabel: "Waldgeist Totoro",
    baseReaction:
      "gähnt ein riesiges, gemütliches Gähnen und lässt Blätter tanzen! 🍃",
  },
  {
    id: "chopper",
    nameDefault: "Chopper",
    emoji: "🦌",
    breedLabel: "Rentier-Arzt Chopper",
    baseReaction:
      "versteckt sich falsch herum hinter der Ecke und freut sich riesig über dein Lob! 🌸",
  },
  {
    id: "appa",
    nameDefault: "Appa",
    emoji: "🐃",
    breedLabel: "Himmelsbison Appa",
    baseReaction:
      "macht 'Yip-Yip' und fliegt eine kleine Runde durch die Luft! ☁️",
  },
  {
    id: "grogu",
    nameDefault: "Grogu",
    emoji: "🟢",
    breedLabel: "Machtbegabtes Findelkind",
    baseReaction:
      "trinkt gemütlich aus seiner Suppentasse und lässt mit der Macht ein paar Blätter schweben! 🍲✨",
  },
  {
    id: "spongebob",
    nameDefault: "Spongebob",
    emoji: "🧽",
    breedLabel: "Lustiger Schwamm",
    baseReaction:
      "lacht sein typisches Schwammkopf-Lachen und fängt an Quallen zu fischen! 🫧",
  },
  {
    id: "patrick",
    nameDefault: "Patrick",
    emoji: "⭐",
    breedLabel: "Treuer Seestern",
    baseReaction:
      "legt sich auf den Boden und macht ein Nickerchen unter seinem Stein! 💤",
  },
  {
    id: "hello_kitty",
    nameDefault: "Kitty",
    emoji: "🎀",
    breedLabel: "Freundliches Kätzchen",
    baseReaction:
      "verteilt unsichtbare Umarmungen und winkt fröhlich! 🎀",
  },
  {
    id: "bluey",
    nameDefault: "Bluey",
    emoji: "🐶💙",
    breedLabel: "Verspielter Heeler",
    baseReaction:
      "spielt eine lustige Runde 'Omas' und kichert laut! 🎈",
  },
  {
    id: "snoopy",
    nameDefault: "Snoopy",
    emoji: "🐶🏠",
    breedLabel: "Schlauer Beagle",
    baseReaction:
      "legt sich entspannt auf sein rotes Hundehaus und träumt vom Fliegen! ☁️",
  },
  {
    id: "garfield",
    nameDefault: "Garfield",
    emoji: "🐱🍝",
    breedLabel: "Oranger Kater",
    baseReaction:
      "gähnt laut und hält Ausschau nach einer großen Portion Lasagne! 🍝",
  },
];

export const BREED_SAYINGS: Record<string, string[]> = {
  trax: [
    "Krächz! Hast du schon nachgerechnet? Mathe macht schlau! 🐦‍⬛🧮",
    "Krächz! Eins plus eins ist zwei, lernen ist keine Hexerei! 🧮✨",
    "Krächz! Schaut mal, wie schnell ich diese Aufgabe lösen kann! ➕➖",
    "Krächz! Du machst das raben-stark! Weiter so! 🐦‍⬛⭐",
  ],
  dog: [
    "Wuff! Ich hab dich lieb! Lass uns lernen! 🐶",
    "Wuff wuff! Spielst du mit mir? Du machst das toll! 🐕",
    "Hauuu! Bringst du mir ein Stöckchen? 🦴",
    "Wuff! Du bist heute richtig fleißig! 🌟",
  ],
  cat: [
    "Miau! Schnurrr... du bist der beste Lehrer! 🐱",
    "Miau! Eine Streicheleinheit bitte! 🐾",
    "Schnurrr... Ich passe gut auf dich auf! 🐈",
    "Miau! Welches Thema lernen wir als nächstes? 🐟",
  ],
  owl: [
    "Huu-huu! Sehr klug gelöst! Weiter so! 🦉",
    "Huuu! Die Weisheit liegt im Lernen. 📚",
    "Blinzelt weise... Du machst das fantastisch! ✨",
    "Huu-huu! Ein großartiger Tag zum Lernen! 🦉",
  ],
  dino: [
    "Roar! Gemeinsam sind wir unschlagbar! 🦕",
    "Raaaaaar! Ich liebe spannende Aufgaben! 🦖",
    "Urzeitlicher Spaß! Lass uns loslegen! 🌴",
    "Roar! Du machst das dino-tastisch! 🦕",
  ],
  frog: [
    "Quak! Ein Riesensprung nach vorne! 🐸",
    "Quak quak! Hüpfen wir zum nächsten Thema? 🟢",
    "Ribbit! Du bist heute richtig flink! 💦",
    "Quak! Lernen macht einen Riesenspaß! 🐸",
  ],
  pig: [
    "Oink! Das bringt uns richtig viel Glück! 🐷",
    "Oink oink! Ich liebe es, wenn wir zusammen lernen! 🍀",
    "Grunz... Ein absoluter Glückstag heute! 🐽",
    "Oink! Du machst das saugut! 🐷",
  ],
  dobby: [
    "Dobby hat einen Klick bekommen! Herr hat Dobby geklickt! 🧦",
    "Dobby ist frei und glücklich mit dir! ✨",
    "Dobby wird alles tun, um der Klasse zu helfen! 🧙‍♂️",
    "Dobby freut sich riesig über deine Aufmerksamkeit! 🧦",
  ],
  unicorn: [
    "Glitzer! Du versprühst heute magische Energie! 🦄",
    "Glaube an deine Träume! *regenbogenglow* 🌈",
    "Magie liegt heute in der Luft! ✨",
    "Glitzerglanz! Du hast fabelhafte Ideen! 🦄",
  ],
  dragon: [
    "Fffrrr! Ein feuriger Lern-Eifer in der Klasse! 🐲",
    "Pustet bunten Glitzer... Du bist einfach spitze! 🔥",
    "Mein kleiner Drachenhort an Wissen wächst! 💎",
    "Fffrrr! Lass uns die Welt erobern! 🐲",
  ],
  panda: [
    "Mampf... So gemütlich hier mit euch! 🐼",
    "Immer mit der Ruhe, wir schaffen das! 🎋",
    "Zeit für ein kurzes Päuschen? Oder weiterlernen? 💤",
    "Mampf! Bambus schmeckt lecker, aber Lernen ist auch toll! 🐼",
  ],
  pikachu: [
    "Pika-Pika! Blitzschnell verstanden! ⚡",
    "Pikachuuuu! Meine Wangen kribbeln vor Freude! 🟡",
    "Pika! Voller Energie für die nächste Aufgabe! ✨",
    "Pika-pika! Du bist geladen mit guten Ideen! ⚡",
  ],
  axolotl: [
    "Blubb! Ich finde dich absolut klasse! 🦎",
    "Unterwasser-Highfive! Du machst das super! 🌊",
    "Ich schillere vor Freude, wenn du mich anklickst! 💖",
    "Blubb blubb! Schwimmen wir im Wissens-Ozean! 🦎",
  ],
  capybara: [
    "Ok, ich pull up! Alles ist super entspannt. 🦦",
    "Don't worry, be Cappy! Du machst das hervorragend. 🌴",
    "Genieße den Moment. Pure Gelassenheit! 🍊",
    "Cappy-Hugs für alle! Bleib entspannt! 🦦",
  ],
  shiba: [
    "Woof! High-five! Du bist mein Lieblingsmensch! 🐕",
    "Wow! Such learning! Very smart! 🐾",
    "Dreht sich freudig... Ein super Klick! Pfötchen! 🌟",
    "Woof! Du bist der absolute Knaller! 🐕",
  ],
  totoro: [
    "Riesiges gemütliches Gähnen... Ein wundervoller Wald-Tag! 🍃",
    "Lass uns den Samen des Wissens wachsen lassen! 🌲",
    "Spürst du den sanften Wind? Du bist großartig! ☁️",
    "Totoro schnurrt gemütlich... Brrrr! 🍃",
  ],
  chopper: [
    "K-Klick mich nicht so an, du Dummkopf! Das freut mich überhaupt nicht! 🌸",
    "Ich bin ein toller Arzt-Begleiter und passe auf dich auf! 🦌",
    "Zuckerwatte?! Hat jemand Zuckerwatte gesagt? 🍬",
    "Chopper tanzt verlegen vor Freude! 🌸",
  ],
  appa: [
    "Yip-Yip! Ab in die Wolken! ☁️",
    "Macht ein tiefes, zufriedenes Bison-Schnauben... 🐃",
    "Der Wind trägt uns zu neuen Höhen! 🌀",
    "Yip-Yip! Ein Himmels-Klick! ☁️",
  ],
  grogu: [
    "Trinkt gemütlich Suppe... Schlürf... das schmeckt! 🍲",
    "Die Macht ist stark in dir! *lässt Blätter schweben* ✨",
    "Streckt die kleine Hand aus... Das ist der Weg! 🟢",
    "Grogu gluckst zufrieden vor Freude! 🍲",
  ],
  spongebob: [
    "Ich bin bereit! Ich bin bereit! Ich bin bereit! 🧽",
    "Krosse Krabbe Pizza ist die beste Pizza! 🍕",
    "Fantasie! 🌈",
    "Quallenfischen macht am meisten Spaß! 🫧",
  ],
  patrick: [
    "Ist das die Krosse Krabbe? Nein, hier ist Patrick! ⭐",
    "Das innere Geheimnis meiner Seele ist ein Enigma. 🥛",
    "Wissen ist keine Macht, Mayonnaise ist Macht! 🍔",
    "Lass uns Seifenblasen machen! 🫧",
  ],
  hello_kitty: [
    "Man kann nie zu viele Freunde haben! 🎀",
    "Lass uns zusammen Kuchen backen! 🍰",
    "Du bist mein Lieblingsmensch! 💖",
    "Hello Kitty schenkt dir eine große Umarmung! 🌸",
  ],
  bluey: [
    "Fürs echte Leben?! 🎈",
    "Lass uns Zauberspargel spielen! 🪄",
    "Aaaaaah! 🐶",
    "Oma ist da! Zeit für ein Schläfchen! 👵",
  ],
  snoopy: [
    "Ich brauche mehr Schlaf! 💤",
    "Wo ist Woodstock? 🐤",
    "Ein Tag ohne Lachen ist ein verlorener Tag! 🐾",
    "Es ist Zeit für einen Snack! 🍕",
  ],
  garfield: [
    "Ich hasse Montage! 😫",
    "Ich bin nicht übergewichtig, ich bin untergroß. 🐱",
    "Wo ist meine Lasagne?! 🍝",
    "Schlafen ist meine Lieblingsbeschäftigung! 💤",
  ],
};

interface PlayAction {
  id: string;
  label: string;
  desc: string;
  icon: string;
  knowledgeBonus?: number;
  hungerBonus?: number;
  funBonus?: number;
  klassenglasDelta?: number;
  responseTemplate: (petName: string) => string;
}

const PET_ACTIONS: PlayAction[] = [
  {
    id: "feed_stars",
    label: "Fokus-Snacks",
    desc: "Lern-Snack geben",
    icon: "🍪",
    hungerBonus: 20,
    funBonus: 5,
    responseTemplate: (name) =>
      `🍪 Mampf-mampf! ${name} knabbert glücklich am Fokus-Snack und fängt an leise vor Wohlbedacht zu glitzern!`,
  },
  {
    id: "read_book",
    label: "Wissen sammeln",
    desc: "Bücher lesen",
    icon: "📚",
    knowledgeBonus: 25,
    funBonus: -5,
    hungerBonus: -10,
    responseTemplate: (name) =>
      `📚 Wow! ${name} liest begeistert mit und das Gehirn wächst!`,
  },
  {
    id: "praise_class",
    label: "Mitarbeit sammeln",
    desc: "Lob-Dusche / Punkte",
    icon: "💖",
    funBonus: 10,
    knowledgeBonus: 10,
    klassenglasDelta: 1,
    responseTemplate: (name) =>
      `💖 Tolle Mitarbeit! ${name} jubelt - ein weiterer Kristall für das Klassenglas!`,
  },
  {
    id: "dance_break",
    label: "Spiel & Tanz",
    desc: "Gemeinsam zappeln",
    icon: "🎵",
    funBonus: 30,
    hungerBonus: -15,
    klassenglasDelta: 0,
    responseTemplate: (name) =>
      `🎵 Shake-it! Alle wackeln mit! ${name} legt einen weltmeisterlichen Tanz hin!`,
  },
  {
    id: "pet_pet",
    label: "Haustier streicheln",
    desc: "Kraulen am Bäuchlein",
    icon: "🙌",
    funBonus: 15,
    knowledgeBonus: 0,
    responseTemplate: (name) =>
      `🙌 Kraul kraul! Ohhh, wie gemütlich! ${name} schnurrt zufrieden, reckt sich ganz lang in die Höhe und wirft herzerwärmende rote Küsse in die Luft! ❤️`,
  },
  {
    id: "magic_trick",
    label: "Zaubertrick / Salto",
    desc: "Einen Trick vorführen",
    icon: "✨",
    funBonus: 20,
    knowledgeBonus: 15,
    responseTemplate: (name) =>
      `✨ Simsalabim! ${name} macht einen riesengroßen Rückwärtssalto, fliegt einmal rund herum im Kreis und zaubert funkelnde bunte Regenbogen-Sterne herbei! 🌈🌟`,
  },
  {
    id: "tell_joke",
    label: "Witz erzählen",
    desc: "Lustige Geschichte",
    icon: "😂",
    funBonus: 25,
    knowledgeBonus: 5,
    responseTemplate: (name) =>
      `😂 Haha! ${name} kichert laut und erzählt einen lustigen Quatsch-Witz: "Was macht ein Ei, wenn es auf ein anderes trifft? Es sagt: Ei-gude, wie!" 🥚🎉`,
  },
  {
    id: "sing_song",
    label: "Liedchen singen",
    desc: "Fröhliche Melodie",
    icon: "🎶",
    funBonus: 25,
    knowledgeBonus: 5,
    responseTemplate: (name) =>
      `🎶 Tralala! ${name} trällert ein wunderschönes kleines Liedchen und bringt gute Laune ins Cockpit!`,
  },
  {
    id: "calm_down",
    label: "Gemeinsam atmen",
    desc: "Ruhig werden",
    icon: "🧘",
    funBonus: 10,
    knowledgeBonus: 10,
    responseTemplate: (name) =>
      `🧘 Einatmen... Ausatmen... ${name} macht es vor und die ganze Klasse wird sofort wunderbar ruhig.`,
  },
  {
    id: "cheer_up",
    label: "High-Five",
    desc: "Motivation",
    icon: "✋",
    funBonus: 20,
    knowledgeBonus: 5,
    responseTemplate: (name) =>
      `✋ Yeah! Ein motivierendes High-Five von ${name}! Volle Energie für die nächste Aufgabe!`,
  },
];

const WEBSITE_TIPS = [
  "Tipp: Unter 'Schüler' kannst du jedem Kind direkt ein Förderziel für die Woche eintragen.",
  "Tipp: Nutze das 'Morgen-Briefing' im Dashboard, um optimal in den Tag zu starten.",
  "Wusstest du? Du kannst eigene Checklisten (z.B. für Ausflüge) in der Seitenleiste anlegen.",
  "Tipp: Die Sitzplan-Funktion hilft dir, neue Konstellationen und Methoden wie Think-Pair-Share auszuprobieren.",
  "Tipp: Nutze die Druckstation, um den Wochenplan als PDF zu exportieren.",
  "Aktiviere das 'Klassenglas' im Wir-Gefühl-Tab, um die Klasse für gutes Verhalten zu belohnen.",
  "Tipp: Die KI hilft dir gerne: Erstelle mit einem Klick Elternbriefe beim jeweiligen Schüler-Profil.",
  "Die Statistik-Seite wertet für dich automatisch Diagnostik-Daten deiner ganzen Klasse aus.",
];

const ClassPetWidget = memo(() => {
  const { app, setApp } = useApp();

  // Local active screen states
  const [showSettings, setShowSettings] = useState(false);
  const [activeMode, setActiveMode] = useState<"lehrer" | "klasse">("lehrer");
  const petCanvasRef = useRef<ClassPetCanvasRef>(null);
  const [lastActionResponse, setLastActionResponse] = useState<string>("");
  const [animationTrigger, setAnimationTrigger] = useState<boolean>(false);
  const [clickAnimationType, setClickAnimationType] = useState<"jump" | "spin">("jump");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<
    "log" | "missions" | "discoveries"
  >("log");
  const [isGeneratingMission, setIsGeneratingMission] = useState(false);
  const [aiMissionResult, setAiMissionResult] = useState<{
    message: string;
    missions: any[];
  } | null>(null);
  const [levelUpAward, setLevelUpAward] = useState<number | null>(null);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatAudio, setChatAudio] = useState<HTMLAudioElement | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // Riddle items for the Pet trivia game
  const PET_RIDDLES = [
    { q: "Was hat Zähne und kann doch nicht beißen?", a: "Ein Kamm 🪮" },
    {
      q: "Welcher Vogel hat keine Federn, keine Flügel und keinen Schnabel?",
      a: "Ein Pechvogel 🐦",
    },
    { q: "Was wird beim Trocknen nasser?", a: "Ein Handtuch 🧼" },
    { q: "Welches Hemd hat keine Ärmel?", a: "Das Buchhemd 📚" },
    {
      q: "Was kann laufen, hat aber keine Beine?",
      a: "Die Nase oder Wasser 💧",
    },
    { q: "Wo steht der Samstag vor dem Freitag?", a: "Im Wörterbuch 📖" },
    {
      q: "Was gehört dir, aber andere benutzen es viel öfter als du?",
      a: "Dein Name 🏷️",
    },
    { q: "Was hat vier Beine und kann nicht laufen?", a: "Ein Tisch 🪑" },
  ];

  const PET_DISCOVERIES = [
    "einen glitzernden Kieselstein 💎",
    "eine goldene Büroklammer 🖇️",
    "ein vergessenes Glanzbildchen ✨",
    "ein vierblättriges Kleeblatt 🍀",
    "einen magischen Bleistift-Stumpf ✏️",
    "ein schönes herbstliches Eichenblatt 🍂",
    "einen uralten Drachenzahn-Knopf 🦖",
    "ein Stück funkelnde Sternschnuppe 💫",
  ];

  const [activePetRiddle, setActivePetRiddle] = useState<{
    q: string;
    a: string;
  } | null>(null);
  const [showRiddleAnswer, setShowRiddleAnswer] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  const [explorationResult, setExplorationResult] = useState<string | null>(
    null,
  );

  // Lazy-initialize the class pet state if it does not exist
  const petState = app.classPet || {
    enabled: true,
    animalType: "trax",
    name: "Rechenrabe Trax",
    energy: 50,
    knowledge: 50,
    hunger: 50,
    fun: 50,
    accessories: [],
    history: [],
    level: 1,
    xp: 0,
    discoveries: [],
    mood: 75,
    behaviorMode: "auto",
    isLocked: false,
    lastInteraction: new Date().toISOString(),
  };

  const currentBreed =
    PET_BREEDS.find((b) => b.id === petState.animalType) || PET_BREEDS[0];

  const containerRef = useRef<HTMLDivElement>(null);
  const [animCtx, setAnimCtx] = useState<{
    state: "idle" | "spawning" | "despawning";
    targetX: number;
    targetY: number;
  }>({ state: "idle", targetX: 0, targetY: 0 });

  const updatePet = (
    updater: (prev: typeof petState) => Partial<typeof petState>,
  ) => {
    setApp((prev) => {
      const current = prev.classPet || {
        enabled: true,
        animalType: "trax",
        name: "Rechenrabe Trax",
        energy: 50,
        knowledge: 50,
        hunger: 50,
        fun: 50,
        accessories: [],
        history: [],
        level: 1,
        xp: 0,
        discoveries: [],
        mood: 75,
        lastInteraction: new Date().toISOString(),
      };
      const updated = { ...current, ...updater(current) };
      return {
        ...prev,
        classPet: updated,
      };
    });
  };

  // Toggle active / inactive pet state
  const handleToggleEnabled = () => {
    const willEnable =
      petState.enabled === undefined ? false : !petState.enabled;

    // Calculate widget position
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }

    if (willEnable) {
      setAnimCtx({ state: "spawning", targetX, targetY });
      setTimeout(() => {
        updatePet((prev) => ({ enabled: true }));
        setAnimCtx((prev) => ({ ...prev, state: "idle" }));
      }, 3000);
    } else {
      setAnimCtx({ state: "despawning", targetX, targetY });
      // We wait for user-requested animation sequence before disabling
      setTimeout(() => {
        updatePet((prev) => ({ enabled: false }));
        setAnimCtx((prev) => ({ ...prev, state: "idle" }));
      }, 4000);
    }
  };

  const handleBreedChange = (type: typeof petState.animalType) => {
    const breed = PET_BREEDS.find((b) => b.id === type) || PET_BREEDS[0];
    const isDefaultName =
      PET_BREEDS.some((b) => b.nameDefault === petState.name) ||
      petState.name === "Spike" ||
      petState.name === "Dragi" ||
      petState.name === "Oli" ||
      petState.name === "Kiki" ||
      petState.name === "Poldi" ||
      petState.name === "Bello" ||
      petState.name === "Minka" ||
      petState.name === "Froschi" ||
      petState.name === "Peppa";

    updatePet((prev) => ({
      animalType: type,
      name: isDefaultName ? breed.nameDefault : prev.name,
    }));
    setLastActionResponse(
      `Verwandlung! Dein Begleiter ist jetzt eine Gestalt namens ${breed.breedLabel}.`,
    );
    triggerBounce();
  };

  const checkIsAutoBirthday = (geburtstagStr: string | undefined | null) => {
    if (!geburtstagStr) return false;
    let bday: Date;
    const parts = geburtstagStr.split(".");
    const today = new Date();
    if (parts.length === 3) {
      bday = new Date(
        today.getFullYear(),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
    } else {
      bday = new Date(geburtstagStr);
    }

    if (isNaN(bday.getTime())) return false;

    const tMonth = today.getMonth();
    const tDate = today.getDate();
    const tDay = today.getDay();

    let dashboardSettings = { moveWeekendBirthdays: "none" };
    try {
      const saved = localStorage.getItem("dashboard_settings_v7");
      if (saved) dashboardSettings = JSON.parse(saved);
    } catch {}

    if (bday.getMonth() === tMonth && bday.getDate() === tDate) {
      if (tDay === 0 || tDay === 6) {
        return (
          dashboardSettings?.moveWeekendBirthdays !== "friday" &&
          dashboardSettings?.moveWeekendBirthdays !== "monday"
        );
      }
      return true;
    }

    if (dashboardSettings?.moveWeekendBirthdays === "friday" && tDay === 5) {
      const sat = new Date(today.getFullYear(), tMonth, tDate + 1);
      const sun = new Date(today.getFullYear(), tMonth, tDate + 2);
      if (
        (bday.getMonth() === sat.getMonth() &&
          bday.getDate() === sat.getDate()) ||
        (bday.getMonth() === sun.getMonth() && bday.getDate() === sun.getDate())
      ) {
        return true;
      }
    }

    if (dashboardSettings?.moveWeekendBirthdays === "monday" && tDay === 1) {
      const sun = new Date(today.getFullYear(), tMonth, tDate - 1);
      const sat = new Date(today.getFullYear(), tMonth, tDate - 2);
      if (
        (bday.getMonth() === sat.getMonth() &&
          bday.getDate() === sat.getDate()) ||
        (bday.getMonth() === sun.getMonth() && bday.getDate() === sun.getDate())
      ) {
        return true;
      }
    }

    return false;
  };

  const handleNameChange = (newName: string) => {
    updatePet(() => ({ name: newName }));
  };

  const handleToggleAccessory = (id: string) => {
    const isWorn = petState.accessories.includes(id);
    const updated = isWorn
      ? petState.accessories.filter((a: string) => a !== id)
      : [...petState.accessories, id];

    updatePet(() => ({ accessories: updated }));
    triggerBounce();
  };

  const handleScaleChange = (delta: number) => {
    const currentScale = petState.scale || 1.0;
    const newScale = Math.min(2.5, Math.max(0.4, currentScale + delta));
    updatePet(() => ({ scale: newScale }));
  };

  // Mood Decay On Mount Calculation (pro vollem Tag seit letzteInteraktion -8 Punkte, Untergrenze 30)
  useEffect(() => {
    return () => {
      if (chatAudio) {
        chatAudio.pause();
        chatAudio.src = "";
      }
    };
  }, [chatAudio]);

  const handleSpeakText = async (text: string) => {
    if (isSpeaking) {
      if (chatAudio) {
        chatAudio.pause();
        setIsSpeaking(false);
      }
      return;
    }

    try {
      setIsSpeaking(true);
      const audioBase64 = await generatePetSpeech(text, "Kore");
      if (audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        setChatAudio(audio);
        audio.onended = () => setIsSpeaking(false);
        audio.play();
      }
    } catch (error) {
      console.error("Speech generation failed", error);
      setIsSpeaking(false);
    }
  };

  const handlePetChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isAiLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setIsAiLoading(true);

    try {
      // Small bounce for feedback
      triggerBounce();

      const response = await generatePetChatResponse({
        petName: petState.name,
        petType: currentBreed.nameDefault,
        energy: petState.energy,
        mood: petState.mood,
        userMessage: userMsg,
        currentActivity: petState.behaviorMode || "idle",
        activeWidgets: [],
      });

      if (response) {
        setLastActionResponse(response);
        triggerBounce();

        // Add to history
        const newHistoryItem = {
          id: crypto.randomUUID(),
          action: "Chat 💬",
          datum: new Date().toISOString(),
          energyDelta: 2,
          text: `Kind: "${userMsg}" | ${petState.name}: "${response}"`,
        };

        updatePet((prev) => ({
          mood: Math.min(100, (prev.mood || 75) + 2),
          energy: Math.min(100, (prev.energy || 50) + 1),
          history: [newHistoryItem, ...(prev.history || [])].slice(0, 15),
        }));

        if (autoSpeak) {
          handleSpeakText(response);
        }
      }
    } catch (error) {
      console.error("Pet chat failed", error);
    } finally {
      setIsAiLoading(false);
    }
  };
  useEffect(() => {
    if (!petState.enabled) return;
    try {
      const lastInter = petState.lastInteraction || new Date().toISOString();
      const lastTime = new Date(lastInter).getTime();
      const nowTime = Date.now();
      const mDiff = nowTime - lastTime;
      if (mDiff > 0) {
        const daysPassed = Math.floor(mDiff / (1000 * 60 * 60 * 24));
        if (daysPassed > 0) {
          const currentMood = petState.mood !== undefined ? petState.mood : 75;
          const loss = daysPassed * 8;
          const finalMood = Math.max(30, currentMood - loss);
          if (finalMood !== petState.mood) {
            updatePet(() => ({ mood: finalMood }));
          }
        }
      }
    } catch (err) {
      console.error("Defensive mood date parsing error: ", err);
      updatePet(() => ({ lastInteraction: new Date().toISOString() }));
    }
  }, [petState.enabled]);

  // Automated Daily Reset Logic
  useEffect(() => {
    if (!petState.dailyReset || !petState.enabled) return;

    const today = new Date().toISOString().split("T")[0];
    if (petState.lastResetDate !== today) {
      updatePet((prev: any) => ({
        energy: 75,
        hunger: 70,
        fun: 70,
        knowledge: 70,
        lastResetDate: today,
        history: [
          {
            id: crypto.randomUUID(),
            action: "Tages-Reset ☀️",
            datum: new Date().toISOString(),
            energyDelta: 20,
            text: `Guten Morgen! ${petState.name} hat gut geschlafen und ist bereit für den neuen Tag! ☀️`,
          },
          ...(prev.history || []),
        ].slice(0, 15),
      }));
    }
  }, [
    petState.dailyReset,
    petState.enabled,
    petState.lastResetDate,
    petState.name,
  ]);

  const triggerBounce = () => {
    if (petCanvasRef.current) petCanvasRef.current.bounce();
    setAnimationTrigger(true);
    setTimeout(() => setAnimationTrigger(false), 850);
  };

  const handlePetClick = () => {
    // Quiet/Rest mode: clicking triggers a very gentle sleepy bounce, without speaking or sounds to avoid distraction.
    if (petCanvasRef.current) {
      petCanvasRef.current.bounce();
    }
    setClickAnimationType("jump");
    setAnimationTrigger(true);
    setTimeout(() => setAnimationTrigger(false), 850);
  };

  const handlePerformAction = (action: PlayAction) => {
    if (petCanvasRef.current) {
      if (action.id === "magic_trick") {
        petCanvasRef.current.celebrate();
      } else if (action.id === "pet_pet") {
        petCanvasRef.current.bounce();
      } else if (action.id === "tell_joke") {
        petCanvasRef.current.bounce();
        setTimeout(() => {
          if (petCanvasRef.current) petCanvasRef.current.bounce();
        }, 300);
      } else if (
        action.hungerBonus ||
        action.funBonus ||
        action.knowledgeBonus
      ) {
        petCanvasRef.current.feed(action.icon);
      }
    }

    // Calculate new properties bounds
    const newHunger = Math.min(
      100,
      Math.max(0, (petState.hunger || 50) + (action.hungerBonus || 0)),
    );
    const newFun = Math.min(
      100,
      Math.max(0, (petState.fun || 50) + (action.funBonus || 0)),
    );
    const newKnowledge = Math.min(
      100,
      Math.max(0, (petState.knowledge || 50) + (action.knowledgeBonus || 0)),
    );

    // Overall energy is an average of the three needs
    const newEnergy = Math.round((newHunger + newFun + newKnowledge) / 3);
    const energyDelta = newEnergy - petState.energy;

    const response = action.responseTemplate(petState.name);

    // Optional Klassenglas Contribution
    if (action.klassenglasDelta && action.klassenglasDelta > 0) {
      setApp((prev) => ({
        ...prev,
        klassenglas_count:
          (prev.klassenglas_count || 0) + action.klassenglasDelta!,
      }));
    }

    // XP Calculation
    const xpBonus =
      Math.round(
        ((action.hungerBonus || 0) +
          (action.funBonus || 0) +
          (action.knowledgeBonus || 0)) *
          0.8,
      ) || 10;
    const prevXp = petState.xp || 0;
    const prevLevel = petState.level || 1;
    let newXp = prevXp + xpBonus;
    let newLevel = prevLevel;
    let didLevelUp = false;

    if (newXp >= 100) {
      newLevel += 1;
      newXp = newXp - 100;
      didLevelUp = true;
    }

    const newHistoryItem = {
      id: crypto.randomUUID(),
      action: action.label,
      datum: new Date().toISOString(),
      energyDelta: energyDelta,
      text: response,
    };

    const extraHistoryItems = [];
    if (didLevelUp) {
      extraHistoryItems.push({
        id: crypto.randomUUID(),
        action: "Level Up! 🏆",
        datum: new Date().toISOString(),
        energyDelta: 0,
        text: `🏆 LEVEL UP! ${petState.name} hat Stufe ${newLevel} erreicht! Alle klatschen Beifall!`,
      });

      setLevelUpAward(newLevel);

      setTimeout(() => {
        if (petCanvasRef.current) petCanvasRef.current.celebrate();
      }, 500);
    }

    let moodBonus = 0;
    if (action.id === "feed_stars" || action.id === "pet_pet") {
      moodBonus = 25;
    } else if (action.id === "magic_trick") {
      moodBonus = 10;
    } else if (action.hungerBonus && action.hungerBonus > 0) {
      moodBonus = 25;
    }

    const currentMood = petState.mood !== undefined ? petState.mood : 75;
    const newMood = Math.min(100, currentMood + moodBonus);
    const isReconciliation = currentMood < 70 && newMood >= 70;

    if (isReconciliation && petCanvasRef.current) {
      setTimeout(() => {
        if (petCanvasRef.current) petCanvasRef.current.celebrate();
      }, 150);
    }

    updatePet((prev) => ({
      energy: newEnergy,
      hunger: newHunger,
      fun: newFun,
      knowledge: newKnowledge,
      xp: newXp,
      level: newLevel,
      mood: newMood,
      lastInteraction: new Date().toISOString(),
      history: [
        ...extraHistoryItems,
        newHistoryItem,
        ...(prev.history || []),
      ].slice(0, 15), // keep last 15 actions
    }));

    setLastActionResponse(
      didLevelUp
        ? `🏆 LEVEL UP! Ich bin jetzt Stufe ${newLevel}! ${response}`
        : response,
    );
    triggerBounce();

    // Play sound if supported
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(
          didLevelUp ? 880 : 659.25,
          ctx.currentTime,
        );
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {}
  };

  // Listen to class point score changes to reward the pet
  // If the user disabled the class pet, show a beautiful, friendly disabled placeholder

  const handleGenerateAiMissions = async () => {
    setIsGeneratingMission(true);
    setAiMissionResult(null);
    try {
      const studentNames = (app.schueler || [])
        .map((s: any) => s.name)
        .join(", ");
      const activeNotes = (app.denkzettelNotes || [])
        .filter((n: any) => !n.completed)
        .map((n: any) => n.text)
        .join("; ");
      const contextData = {
        students: studentNames,
        recentClassNotes: activeNotes,
        currentEnergy: petState.energy,
      };

      const result = await generateClassPetMission(contextData);
      if (result && result.missions) {
        setAiMissionResult(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingMission(false);
    }
  };

  const handleAddAiMission = (mission: any) => {
    setApp((prev) => ({
      ...prev,
      klassenglas_missions: [
        ...(prev.klassenglas_missions || []),
        {
          id: "ai-" + Date.now() + Math.random(),
          title: `${mission.icon} ${mission.title}`,
          description: mission.description,
          rewardClassMarbles: mission.rewardClassMarbles || 3,
          category: mission.category,
        },
      ],
    }));
    setAiMissionResult(null); // Close the AI UI after acceptance
    setLastActionResponse(
      `Ich hab dir die Mission "${mission.title}" ins Klassenglas gelegt!`,
    );
    triggerBounce();
  };

  const toggleDenkzettelNote = (id: string) => {
    setApp((prev) => ({
      ...prev,
      denkzettelNotes: (prev.denkzettelNotes || []).map((n: any) =>
        n.id === id ? { ...n, completed: !n.completed } : n,
      ),
    }));
  };

  const handleTriggerRiddle = () => {
    const randomRiddle =
      PET_RIDDLES[Math.floor(Math.random() * PET_RIDDLES.length)];
    setActivePetRiddle(randomRiddle);
    setShowRiddleAnswer(false);
    setLastActionResponse(
      `Ich habe ein Rätsel für euch! 🧠 Könnt ihr es lösen?`,
    );
    triggerBounce();
  };

  const handleSolveRiddle = () => {
    if (!activePetRiddle) return;

    const energyBonus = 10;
    const xpBonus = 25;
    const newEnergy = Math.min(100, petState.energy + energyBonus);

    const prevXp = petState.xp || 0;
    const prevLevel = petState.level || 1;
    let newXp = prevXp + xpBonus;
    let newLevel = prevLevel;
    let didLevelUp = false;

    if (newXp >= 100) {
      newLevel += 1;
      newXp = newXp - 100;
      didLevelUp = true;
    }

    const response = `🎉 Super gelöst! Die Antwort war: "${activePetRiddle.a}". Ihr seid spitze!`;

    const newHistoryItem = {
      id: crypto.randomUUID(),
      action: "Rätsel gelöst 🧠",
      datum: new Date().toISOString(),
      energyDelta: energyBonus,
      text: response,
    };

    const extraHistoryItems = [];
    if (didLevelUp) {
      extraHistoryItems.push({
        id: crypto.randomUUID(),
        action: "Level Up! 🏆",
        datum: new Date().toISOString(),
        energyDelta: 0,
        text: `🏆 LEVEL UP! ${petState.name} hat Stufe ${newLevel} erreicht! Alle klatschen Beifall!`,
      });
      setLevelUpAward(newLevel);
      setTimeout(() => {
        if (petCanvasRef.current) petCanvasRef.current.celebrate();
      }, 500);
    }

    updatePet((prev) => ({
      energy: newEnergy,
      xp: newXp,
      level: newLevel,
      history: [
        ...extraHistoryItems,
        newHistoryItem,
        ...(prev.history || []),
      ].slice(0, 15),
    }));

    setLastActionResponse(response);
    setActivePetRiddle(null);
    triggerBounce();
  };

  const handleTriggerExplore = () => {
    if (isExploring) return;
    setIsExploring(true);
    setExplorationResult(null);
    setLastActionResponse(
      `Ich gehe auf Entdeckungstour im LEHRERCOCKPIT... Schnüffel-schnüffel! 🗺️`,
    );
    triggerBounce();

    setTimeout(() => {
      const randomItem =
        PET_DISCOVERIES[Math.floor(Math.random() * PET_DISCOVERIES.length)];
      setIsExploring(false);

      const xpBonus = 20;
      const prevXp = petState.xp || 0;
      const prevLevel = petState.level || 1;
      let newXp = prevXp + xpBonus;
      let newLevel = prevLevel;
      let didLevelUp = false;

      if (newXp >= 100) {
        newLevel += 1;
        newXp = newXp - 100;
        didLevelUp = true;
      }

      const response = `🔍 Fundstück! Ich habe ${randomItem} unter einem Pult gefunden!`;

      const newHistoryItem = {
        id: crypto.randomUUID(),
        action: "Entdeckungstour 🗺️",
        datum: new Date().toISOString(),
        energyDelta: 0,
        text: `${petState.name} hat ${randomItem} gefunden!`,
      };

      const extraHistoryItems = [];
      if (didLevelUp) {
        extraHistoryItems.push({
          id: crypto.randomUUID(),
          action: "Level Up! 🏆",
          datum: new Date().toISOString(),
          energyDelta: 0,
          text: `🏆 LEVEL UP! ${petState.name} hat Stufe ${newLevel} erreicht! Alle klatschen Beifall!`,
        });
        setLevelUpAward(newLevel);
        setTimeout(() => {
          if (petCanvasRef.current) petCanvasRef.current.celebrate();
        }, 500);
      }

      updatePet((prev) => {
        const currentDiscoveries = prev.discoveries || [];
        const nextDiscoveries = currentDiscoveries.includes(randomItem)
          ? currentDiscoveries
          : [randomItem, ...currentDiscoveries];
        return {
          xp: newXp,
          level: newLevel,
          discoveries: nextDiscoveries,
          history: [
            ...extraHistoryItems,
            newHistoryItem,
            ...(prev.history || []),
          ].slice(0, 15),
        };
      });

      setLastActionResponse(response);
      triggerBounce();
    }, 2500);
  };

  const [currentTip, setCurrentTip] = useState(WEBSITE_TIPS[0]);

  useEffect(() => {
    setCurrentTip(
      WEBSITE_TIPS[Math.floor(Math.random() * WEBSITE_TIPS.length)],
    );
  }, [activeMode]);

  const renderAnimationOverlay = () => {
    if (animCtx.state === "idle") return null;
    return (
      <div className="fixed inset-0 z-[99999] pointer-events-none ">
        {animCtx.state === "spawning" && (
          <motion.div
            initial={{ x: window.innerWidth / 2 - 50, y: window.innerHeight }}
            animate={{
              x: [
                window.innerWidth / 2 - 50,
                window.innerWidth / 2 - 50,
                animCtx.targetX - 50,
              ],
              y: [
                window.innerHeight,
                window.innerHeight / 2 - 50,
                animCtx.targetY - 50,
              ],
              scale: [0.5, 1.2, 1],
            }}
            transition={{
              duration: 3.0,
              times: [0, 0.4, 1],
              ease: "easeInOut",
            }}
            className="absolute w-[100px] h-[100px] drop-shadow-xl"
          >
            <div className="w-full h-full text-[5rem] flex items-center justify-center -scale-x-100">
              {currentBreed.emoji || "🦖"}
            </div>
            {/* Added dust particles animation */}
            <motion.div
              animate={{ opacity: [0, 1, 0], scale: [1, 2, 3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center text-[1.5rem] leading-normal"
            >
              ✨
            </motion.div>
          </motion.div>
        )}
        {animCtx.state === "despawning" && (
          <motion.div
            initial={{
              x: window.innerWidth / 2 - 50,
              y: window.innerHeight,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: [
                window.innerWidth / 2 - 50,
                window.innerWidth / 2 - 50,
                animCtx.targetX - 50,
              ],
              y: [
                window.innerHeight,
                window.innerHeight / 2 - 50,
                animCtx.targetY - 50,
              ],
              scale: [1, 1.2, 0],
              opacity: [1, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 4.0,
              times: [0, 0.4, 1],
              ease: "easeInOut",
            }}
            className="fixed z-[9999] w-[100px] h-[100px] flex items-center justify-center drop-shadow-2xl"
          >
            <div className="absolute -top-12 bg-white border-2 border-slate-200 text-slate-800 text-[0.6875rem] font-black py-1.5 px-4 rounded-xl shadow-lg whitespace-nowrap z-10 animate-bounce">
              Ab ins Widgetboard! 👋
            </div>
            <div className="text-[5rem]">{currentBreed.emoji || "Rex"}</div>
          </motion.div>
        )}
      </div>
    );
  };



  // Render only the beautiful interactive ClassPetWidget
  return (
    <>
      <div
        ref={containerRef}
        className="bg-white p-6 rounded-[2.5rem] border border-slate-105 shadow-sm flex flex-col justify-between h-full font-sans min-h-0 w-full relative"
      >
        {/* Ambient glow matching pet presence */}
        <div className="absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-5 bg-indigo-500" />

        {/* Simplified Header with Name Input */}
        <div className="flex flex-col items-center text-center pb-3 border-b border-slate-100 w-full shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[1.5rem]" role="img" aria-label="emoji">
              {currentBreed.emoji}
            </span>
            <input
              type="text"
              value={petState.name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={14}
              className="text-[1.25rem] font-black text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-slate-50 border-b border-dashed border-slate-300 hover:border-indigo-500 outline-none transition-all px-1.5 py-0.5 text-center max-w-[180px]"
              title="Klicke um den Namen zu ändern"
            />
          </div>
          <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {currentBreed.breedLabel} • Ruhemodus 💤
          </p>
        </div>

        {/* MAIN GAMEPLAY AREA */}
        <div className="flex-1 flex flex-col justify-center items-center py-4 min-h-0 w-full relative z-20">

          {/* Interactive Pet Visual Container with springy Framer Motion on Click */}
          <motion.div
            className="relative w-60 h-60 flex items-center justify-center shrink-0 bg-gradient-to-b from-indigo-50/20 to-white/60 border border-indigo-100/40 shadow-inner rounded-full overflow-hidden cursor-pointer"
            onClick={handlePetClick}
            animate={
              animationTrigger
                ? clickAnimationType === "spin"
                  ? {
                      rotate: [0, 360],
                      scale: [1, 1.15, 0.95, 1],
                      y: [0, -20, 0],
                    }
                  : {
                      y: [0, -50, 10, -5, 0],
                      scale: [1, 1.12, 0.88, 1.05, 1],
                      rotate: [0, -6, 6, -3, 0],
                    }
                : { y: 0, scale: 1, rotate: 0 }
            }
            transition={{
              duration: 0.85,
              ease: "easeInOut",
            }}
            whileHover={{ scale: 1.03 }}
            title="Klick mich für einen sanften Gruß!"
          >
            {/* Standard Pet Canvas overlayed inside */}
            <div className="absolute inset-0 pointer-events-none z-10 w-full h-full flex items-center justify-center">
              <ClassPetCanvas
                ref={petCanvasRef}
                isCalm={true}
                animalType={currentBreed.id}
                accessories={[]}
                behaviorMode="sleep"
                energy={100}
                scale={1.2}
                mood={100}
                onFeed={() => {}}
              />
            </div>

            {/* Peaceful sleep state indicator */}
            <div className="absolute bottom-3 text-[0.625rem] font-black uppercase tracking-wider text-slate-400 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-slate-100 select-none pointer-events-none z-20 shadow-sm flex items-center gap-1">
              <span>💤</span>
              <span>Schläft leise...</span>
            </div>
          </motion.div>
        </div>

        {/* Row of different pets to switch between */}
        <div className="w-full mt-4 pt-4 border-t border-slate-100 shrink-0 z-10">
          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block text-center mb-2.5">
            Begleiter auswählen:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-2 px-1 style-scrollbar snap-x scroll-smooth">
            {PET_BREEDS.map((breed) => (
              <button
                key={breed.id}
                onClick={() => {
                  handleBreedChange(breed.id);
                  setLastActionResponse(""); // reset response
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 shrink-0 transition-all cursor-pointer snap-center \${
                  petState.animalType === breed.id
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm font-black scale-[1.02]"
                    : "bg-white hover:bg-slate-50 border-slate-100 text-slate-500 font-semibold hover:text-slate-800"
                }`}
              >
                <span className="text-[1.15rem] leading-none">{breed.emoji}</span>
                <span className="text-[0.7rem] leading-none">{breed.nameDefault}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  );
});

export default ClassPetWidget;
