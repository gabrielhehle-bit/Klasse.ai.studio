import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Printer, GraduationCap, Rocket, CheckSquare, Clock, Heart, 
  CreditCard, ChevronLeft, ChevronRight, BookOpen, Calculator, Compass, 
  Award, Star, List, Calendar, ArrowRight, Sparkles, TrendingUp, 
  Info, AlertTriangle, Smile, FileText, Compass as CompassIcon, ShieldAlert,
  Maximize2, Minimize2, Edit3, Save, Check, CheckCircle2, CheckCircle, Map, Flag, RefreshCw,
  Zap, MessageSquare, Activity, Loader2, Target
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { askAI } from '../services/aiService';
import { exportSchuelerPDF } from '../lib/exportService';
import { FlowerChart, DEVELOPMENT_DIAGRAM_FIELDS } from './FlowerChart';
import { Student, SkillRadar } from '../types';
import {
  getStudentAttendanceSummary,
  getStudentBehaviorSummary,
  getStudentFinanceSummary,
  getStudentNotes
} from '../lib/studentMetrics';

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

const KEL_TRANSLATIONS: Record<string, Record<string, { label: string; kindgerecht: string }>> = {
  de: {
    zuzuhoeren: { label: 'Zuhören & Verstehen', kindgerecht: 'Ich kann gut zuhören und verstehe, was zu tun ist.' },
    lesen: { label: 'Lesefreude & Technik', kindgerecht: 'Ich lese gerne und verstehe, was ich lese.' },
    rechnen: { label: 'Mathematisches Denken', kindgerecht: 'Mir gefällt das Rechnen und ich finde Lösungen.' },
    sprechen: { label: 'Ausdruck & Wortschatz', kindgerecht: 'Ich kann meine Gedanken gut in Worte fassen.' },
    konzentration: { label: 'Ausdauer & Fokus', kindgerecht: 'Ich arbeite konzentriert an einer Sache.' },
    ordnung: { label: 'Ordnung & Materialien', kindgerecht: 'Ich halte meinen Platz und meine Sachen ordentlich.' },
    selbststaendigkeit: { label: 'Selbstständiges Arbeiten', kindgerecht: 'Ich fange eigenständig mit der Arbeit an.' },
    tempo: { label: 'Arbeitstempo', kindgerecht: 'Ich teile mir meine Zeit gut ein.' },
    hilfsbereitschaft: { label: 'Empathie & Hilfe', kindgerecht: 'Ich helfe anderen Kindern gerne.' },
    regeln: { label: 'Regeln & Vereinbarungen', kindgerecht: 'Ich halte mich an unsere Klassenregeln.' },
    konflikte: { label: 'Konfliktlösung', kindgerecht: 'Ich versuche Streit friedlich zu lösen.' },
    mitarbeit_gruppe: { label: 'Teamarbeit', kindgerecht: 'In der Gruppe arbeite ich gut mit anderen zusammen.' },
    neues: { label: 'Neugier & Mut', kindgerecht: 'Ich traue mir Neues zu.' },
    kreativitaet: { label: 'Kreatives Gestalten', kindgerecht: 'Ich habe eigene Ideen beim Malen, Bauen oder Basteln.' },
    bewegung: { label: 'Sport & Bewegung', kindgerecht: 'Ich bewege mich gerne und probiere Sportarten aus.' }
  },
  tr: {
    zuzuhoeren: { label: 'Dinleme ve Anlama', kindgerecht: 'İyi dinleyebiliyorum ve ne yapmam gerektiğini anlıyorum.' },
    lesen: { label: 'Okuma Sevgisi ve Tekniği', kindgerecht: 'Severek okuyorum ve okuduğumu anlıyorum.' },
    rechnen: { label: 'Matematiksel Düşünme', kindgerecht: 'Hesap yapmayı seviyorum ve çözümler buluyorum.' },
    sprechen: { label: 'İfade ve Kelime Dağarcığı', kindgerecht: 'Düşüncelerimi kolayca ifade edebiliyorum.' },
    konzentration: { label: 'Dayanıklılık ve Odaklanma', kindgerecht: 'Bir işe konsantre olarak çalışabiliyorum.' },
    ordnung: { label: 'Düzen ve Malzemeler', kindgerecht: 'Yerimi ve eşyalarımı düzenli tutuyorum.' },
    selbststaendigkeit: { label: 'Bağımsız Çalışma', kindgerecht: 'Çalışmaya kendi başıma başlayabiliyorum.' },
    tempo: { label: 'Çalışma Temposu', kindgerecht: 'Zamanımı iyi yönetebiliyorum.' },
    hilfsbereitschaft: { label: 'Empati ve Yardım', kindgerecht: 'Diğer çocuklara severek yardım ediyorum.' },
    regeln: { label: 'Kurallar ve Anlaşmalar', kindgerecht: 'Sınıf kurallarımıza uyuyorum.' },
    konflikte: { label: 'Çatışma Çözümü', kindgerecht: 'Tartışmaları barışçıl yollarla çözmeye çalışıyorum.' },
    mitarbeit_gruppe: { label: 'Grup Çalışması', kindgerecht: 'Grup içinde diğerleriyle uyumlu işbirliği yapıyorum.' },
    neues: { label: 'Merak ve Medeni Cesaret', kindgerecht: 'Yeni şeyler denemekte cesurluk gösteriyorum.' },
    kreativitaet: { label: 'Yaratıcı Tasarım', kindgerecht: 'Çizgi çizerken, nesneler inşa ederken veya el işi yaparken kendime özgü fikirlerim var.' },
    bewegung: { label: 'Spor ve Hareket', kindgerecht: 'Hareket etmeyi seviyorum ve yeni sporlar deniyorum.' }
  },
  bks: {
    zuzuhoeren: { label: 'Slušanje i razumijevanje', kindgerecht: 'Mogu dobro slušati i razumijem šta treba raditi.' },
    lesen: { label: 'Čitanje i tehnika', kindgerecht: 'Rado čitam i razumijem ono što čitam.' },
    rechnen: { label: 'Matematičko razmišljanje', kindgerecht: 'Uživam u računanju i pronalasku rješenja.' },
    sprechen: { label: 'Izražavanje i rječnik', kindgerecht: 'Mogu dobro izraziti svoje misli riječima.' },
    konzentration: { label: 'Istrajnost i fokus', kindgerecht: 'Radim koncentrisano na jednoj stvari.' },
    ordnung: { label: 'Urednost i materijali', kindgerecht: 'Svoje mjesto i stvari držim urednima.' },
    selbststaendigkeit: { label: 'Samostalan rad', kindgerecht: 'Samostalno započinjem sa radom.' },
    tempo: { label: 'Tempo rada', kindgerecht: 'Dobro organizujem svoje vrijeme.' },
    hilfsbereitschaft: { label: 'Empatija i pomoć', kindgerecht: 'Rado pomažem drugoj djeci.' },
    regeln: { label: 'Pravila i dogovori', kindgerecht: 'Pridržavam se naših razrednih pravila.' },
    konflikte: { label: 'Rješavanje konflikata', kindgerecht: 'Pokušavam mirno riješiti nesuglasice.' },
    mitarbeit_gruppe: { label: 'Grupni rad', kindgerecht: 'U grupi dobro sarađujem s drugima.' },
    neues: { label: 'Znatiželja i hrabrost', kindgerecht: 'Imam hrabrosti za nove izazove.' },
    kreativitaet: { label: 'Kreativno stvaralaštvo', kindgerecht: 'Imam vlastite ideje dok crtam, gradim ili stvaram.' },
    bewegung: { label: 'Sport i kretanje', kindgerecht: 'Rado se krećem i isprobavam razne sportove.' }
  },
  en: {
    zuzuhoeren: { label: 'Listening & Understanding', kindgerecht: 'I listen carefully and understand what to do.' },
    lesen: { label: 'Reading Joy & Technique', kindgerecht: 'I enjoy reading and understand what I read.' },
    rechnen: { label: 'Mathematical Thinking', kindgerecht: 'I like math and finding solutions.' },
    sprechen: { label: 'Expression & Vocabulary', kindgerecht: 'I can state my thoughts clearly with words.' },
    konzentration: { label: 'Stamina & Focus', kindgerecht: 'I work with concentration on a single task.' },
    ordnung: { label: 'Order & Materials', kindgerecht: 'I keep my desk and materials neat.' },
    selbststaendigkeit: { label: 'Independent Work', kindgerecht: 'I start tasks on my own.' },
    tempo: { label: 'Work Pace', kindgerecht: 'I manage my time well.' },
    hilfsbereitschaft: { label: 'Empathy & Help', kindgerecht: 'I enjoy helping other classmates.' },
    regeln: { label: 'Rules & Agreements', kindgerecht: 'I stick to our class rules.' },
    konflikte: { label: 'Conflict Resolution', kindgerecht: 'I try to settle disputes peacefully.' },
    mitarbeit_gruppe: { label: 'Teamwork', kindgerecht: 'I collaborate well with others in a group.' },
    neues: { label: 'Curiosity & Courage', kindgerecht: 'I am brave in trying new activities.' },
    kreativitaet: { label: 'Creative Design', kindgerecht: 'I have unique ideas when painting, building, or crafting.' },
    bewegung: { label: 'Sports & Movement', kindgerecht: 'I love moving around and trying new sports.' }
  },
  ar: {
    zuzuhoeren: { label: 'الإصغاء والفهم', kindgerecht: 'أستطيع الاستماع جيداً وأفهم المطلوب مني.' },
    lesen: { label: 'حب القراءة والمهارة', kindgerecht: 'أحب القراءة وأفهم ما أقرأه.' },
    rechnen: { label: 'التفكير الرياضي الحسابي', kindgerecht: 'أحب الحساب وأجد الحلول بنفسي.' },
    sprechen: { label: 'التعبير والمفردات', kindgerecht: 'أستطيع التعبير عن أفكاري بوضوح.' },
    konzentration: { label: 'التركيز والمثابرة', kindgerecht: 'أعمل بتركيز على موضوع واحد.' },
    ordnung: { label: 'الترتيب والأدوات', kindgerecht: 'أحافظ على ترتيب طاولتي وأدواتي.' },
    selbststaendigkeit: { label: 'العمل المستقل', kindgerecht: 'أبدأ عملي بنفسي وبشكل مستقل.' },
    tempo: { label: 'سرعة الإنجاز والوقت', kindgerecht: 'أنظم وقتي بشكل جيد.' },
    hilfsbereitschaft: { label: 'التعاطف ومساعدة الآخرين', kindgerecht: 'أحب مساعدة الأطفال الآخرين.' },
    regeln: { label: 'القوانين والاتفاقيات', kindgerecht: 'ألتزم بقواعد الصف المتفق عليها.' },
    konflikte: { label: 'حل النزاعات والصلح', kindgerecht: 'أحاول حل الخلافات بطرق سلمية.' },
    mitarbeit_gruppe: { label: 'العمل الجماعي', kindgerecht: 'أتعاون وأعمل بشكل رائع مع الآخرين في الفريق.' },
    neues: { label: 'الفضول المعرفي والشجاعة', kindgerecht: 'أتحلى بالشجاعة لتجربة أشياء جديدة.' },
    kreativitaet: { label: 'التصميم الإبداعي والتعبير', kindgerecht: 'لدي أفكاري الخاصة عند الرسم، البناء أو الحرف اليدوية.' },
    bewegung: { label: 'الرياضة والحركة الإبداعية', kindgerecht: 'أحب الحركة والنشاط وأحب تجربة مختلف الرياضات.' }
  }
};

const UI_LANG_DATA: Record<string, Record<string, string>> = {
  de: {
    langSelect: 'Präsentationssprache',
    welcome: 'Herzlich willkommen zum KEL-Gespräch!',
    flowerTitle: 'Kollaboratives Entwicklungsdiagramm',
    flowerSubtitle: 'Selbsteinschätzung & Feedback im direkten Abgleich',
    behaviorTitle: 'Verhalten und Schulalltag',
    behaviorSubtitle: 'Soziales Verhalten, Anwesenheit und Organisation',
    portfolioTitle: 'Portfolio & Besondere Erfolge',
    portfolioSubtitle: 'Eine Sammlung deiner Sternstunden im Unterricht',
    goalsTitle: 'Ziele & Vereinbarungen',
    goalsSubtitle: 'Lernwege gemeinsam für das nächste Halbjahr planen',
    agreement: 'Gleichklang',
    agreementCountLabel: 'im Gleichklang',
    assessmentCompare: 'Abgleich der Einschätzungen',
    assessmentAreas: 'Einschätzungsbereiche',
    interactiveFlowerTitle: 'Interaktive KEL-Reflexion',
    flowerHugeTitle: 'Kollaboratives Entwicklungsdiagramm',
    scaleLabel: 'Skala: 5 (Außen) bis 0 (Mitte)',
    filterView: 'Ansicht filtern:',
    studView: 'Schülersicht',
    teachView: 'Lehrersicht',
    hide: 'Ausblenden',
    perfectMatch: '🌟 Perfekt übereinstimmend',
    deviation: 'Abweichung',
    noNotes: 'Keine Anmerkung',
    liveNoteSec: 'Detail & Live-Notiz',
    liveStatus: 'Live',
    studentSelfRating: 'Selbsteinschätzung (Kind)',
    teacherFeedback: 'Feedback (Lehrkraft)',
    noteStudent: 'Notiz Kind (Du)',
    noteStudentPl: 'Anmerkung oder Gedanke des Kindes...',
    noteTeacher: 'Notiz Lehrkraft',
    noteTeacherPl: 'Notiz oder pädagogische Ergänzungen...',
    liveSaved: 'Änderungen werden live gesichert',
    prevBtn: 'Zurück',
    nextBtn: 'Weiter',
    fullscreenBtn: 'Vollbild',
    closeBtn: 'Schließen',
    gradesOverview: 'Schulfächer im Überblick',
    gradesSubtitle: 'Deine schulischen Leistungen',
    classAvg: 'Klasse Ø',
    homework: 'Hausübungen',
    homeworkSub: 'Nicht abgegeben',
    participation: 'Mitarbeit',
    participationPoints: 'Punkte',
    evaluationPeriod: 'Beurteilungszeitraum',
    saTitle: 'Schularbeiten (SA)',
    saNo: 'Keine Schularbeiten erfasst',
    wpTitle: 'Wochenplanergebnisse (WP)',
    wpNo: 'Keine Wochenpläne erfasst',
    lzkTitle: 'Lernkontrollen & Tests (LZK)',
    lzkNo: 'Keine Tests erfasst',
    miTitle: 'Mitarbeit & Fleiß',
    miSub: 'Unterrichtsmitarbeit',
    hueTitle: 'Hausübungsmoral',
    noGrade: 'Keine Noten',
    back: 'Beenden',
    prioSubject: 'KERNBEREICH PRIO',
    fachFocus: 'Fach-Fokus',
    subjectAverage: 'DURCHSCHNITT'
  },
  tr: {
    langSelect: 'Sunum Dili',
    welcome: 'KEL Gelişim Görüşmesine Hoş Geldiniz!',
    flowerTitle: 'Öz değerlendirme ve Geri Bildirim',
    flowerSubtitle: 'Yetkinlik alanlarının doğrudan karşılaştırılması',
    behaviorTitle: 'Davranış ve Okul Yaşamı',
    behaviorSubtitle: 'Sosyal davranış, katılım ve organizasyon',
    portfolioTitle: 'Portfolyo ve Özel Başarılar',
    portfolioSubtitle: 'Derslerdeki parlak anlarının bir koleksiyonu',
    goalsTitle: 'Hedefler ve Anlaşmalar',
    goalsSubtitle: 'Gelecek dönem için öğrenim yollarını birlikte planlamak',
    agreement: 'Uyum',
    agreementCountLabel: 'uyum içinde',
    assessmentCompare: 'Değerlendirmelerin Karşılaştırılması',
    assessmentAreas: 'Değerlendirme Alanları',
    interactiveFlowerTitle: 'İnteraktif Değerlendirme Aracı',
    flowerHugeTitle: 'Büyük Çiçek Diyagramı',
    scaleLabel: 'Ölçek: 4 (En dış) ile 1 (Merkez) arası',
    filterView: 'Görünümü Filtrele:',
    studView: 'Öğrenci Bakışı',
    teachView: 'Öğretmen Görüşü',
    hide: 'Gizle',
    perfectMatch: '🌟 Kusursuz Uyum',
    deviation: 'Fark',
    noNotes: 'Not eklenmemiş',
    liveNoteSec: 'Detay ve Canlı Not',
    liveStatus: 'Canlı',
    studentSelfRating: 'Öz Değerlendirme (Öğrenci)',
    teacherFeedback: 'Geri Bildirim (Öğretmen)',
    noteStudent: 'Öğrenci Notu (Sen)',
    noteStudentPl: 'Çocuğunun düşünceleri veya yorumları...',
    noteTeacher: 'Öğretmen Notu',
    noteTeacherPl: 'Pedagojik eklemeler veya notlar...',
    liveSaved: 'Değişiklikler anında kaydediliyor',
    prevBtn: 'Geri',
    nextBtn: 'İleri',
    fullscreenBtn: 'Tam Ekran',
    closeBtn: 'Kapat',
    gradesOverview: 'Derslere Genel Bakış',
    gradesSubtitle: 'Okul Eğitimi Performansı',
    classAvg: 'Sınıf Ort.',
    homework: 'Ödevler',
    homeworkSub: 'Teslim edilmeyen',
    participation: 'Derse Katılım',
    participationPoints: 'Puan',
    evaluationPeriod: 'Değerlendirme Dönemi',
    saTitle: 'Yazılı Sınavlar (SA)',
    saNo: 'Yazılı sınav kaydı bulunmamaktadır',
    wpTitle: 'Haftalık Çalışma Raporu (WP)',
    wpNo: 'Kayıt bulunamadı',
    lzkTitle: 'Kısa Sınavlar ve Testler (LZK)',
    lzkNo: 'Kayıtlı test bulunmamaktadır',
    miTitle: 'Gayret & Katılım',
    miSub: 'Sınıf İçi Katılımı',
    hueTitle: 'Ödev Sorumluluğu',
    noGrade: 'Not Yok',
    back: 'Bitir',
    prioSubject: 'ÖNCELİKLİ ALAN',
    fachFocus: 'Ders Odağı',
    subjectAverage: 'ORTALAMA'
  },
  bks: {
    langSelect: 'Jezik prezentacije',
    welcome: 'Dobrodošli na KEL razgovor o razvoju!',
    flowerTitle: 'Samoocjenjivanje i povratna informacija',
    flowerSubtitle: 'Direktno poređenje područja kompetencija',
    behaviorTitle: 'Ponašanje i školski život',
    behaviorSubtitle: 'Socijalno ponašanje, prisustvo i organizacija',
    portfolioTitle: 'Portfolio i posebni uspjesi',
    portfolioSubtitle: 'Zbirka tvojih zvjezdanih trenutaka tokom nastave',
    goalsTitle: 'Ciljevi i dogovori',
    goalsSubtitle: 'Zajedničko planiranje učenja za sljedeće polugodište',
    agreement: 'Sklad',
    agreementCountLabel: 'u skladu',
    assessmentCompare: 'Poređenje procjena',
    assessmentAreas: 'Područja procjene',
    interactiveFlowerTitle: 'Interaktivni alat za procjenu',
    flowerHugeTitle: 'Veliki cvjetni dijagram',
    scaleLabel: 'Skala: 4 (Vani) do 1 (Sredina)',
    filterView: 'Filtriraj prikaz:',
    studView: 'Pogled djeteta',
    teachView: 'Mišljenje nastavnika',
    hide: 'Sakrij',
    perfectMatch: '🌟 Savršeno usklađeno',
    deviation: 'Odstupanje',
    noNotes: 'Nema napomene',
    liveNoteSec: 'Detalji i bilješka',
    liveStatus: 'Uživo',
    studentSelfRating: 'Samoocjena (Dijete)',
    teacherFeedback: 'Mišljenje nastavnika',
    noteStudent: 'Zabilješka djeteta',
    noteStudentPl: 'Komentar ili misao djeteta...',
    noteTeacher: 'Bilješka nastavnika',
    noteTeacherPl: 'Pedagoške dopune ili bilješke...',
    liveSaved: 'Promjene se odmah spremaju',
    prevBtn: 'Nazad',
    nextBtn: 'Dalje',
    fullscreenBtn: 'Pun ekran',
    closeBtn: 'Zatvori',
    gradesOverview: 'Pregled školskih predmeta',
    gradesSubtitle: 'Tvoji školski uspjesi',
    classAvg: 'Prosjek razreda',
    homework: 'Domaći zadaci',
    homeworkSub: 'Nepredato',
    participation: 'Aktivnost na času',
    participationPoints: 'Bodova',
    evaluationPeriod: 'Period ocjenjivanja',
    saTitle: 'Školski pismeni radovi (SA)',
    saNo: 'Nema zabilježenih pismenih radova',
    wpTitle: 'Rezultati sedmičnog plana (WP)',
    wpNo: 'Nema zabilježenih rezultata',
    lzkTitle: 'Kontrolni radovi i testovi (LZK)',
    lzkNo: 'Nema zabilježenih testova',
    miTitle: 'Marljivost i zalaganje',
    miSub: 'Zalaganje na času',
    hueTitle: 'Domaći zadaci (redovnost)',
    noGrade: 'Bez ocjena',
    back: 'Završi',
    prioSubject: 'PRIORITETNI SEKTOR',
    fachFocus: 'Fokus predmeta',
    subjectAverage: 'PROSJEK'
  },
  en: {
    langSelect: 'Presentation Language',
    welcome: 'Welcome to the KEL Meeting!',
    flowerTitle: 'Self-Assessment & Feedback',
    flowerSubtitle: 'Direct comparison of competency areas',
    behaviorTitle: 'Behavior & School Life',
    behaviorSubtitle: 'Social behavior, attendance & organization',
    portfolioTitle: 'Portfolio & Special Achievements',
    portfolioSubtitle: 'A collection of your stellar class moments',
    goalsTitle: 'Goals & Agreements',
    goalsSubtitle: 'Co-planning learning paths for the next semester',
    agreement: 'Alignment',
    agreementCountLabel: 'in alignment',
    assessmentCompare: 'Assessment Comparison',
    assessmentAreas: 'Assessment Areas',
    interactiveFlowerTitle: 'Interactive Assessment Tool',
    flowerHugeTitle: 'Large Flower Diagram',
    scaleLabel: 'Scale: 4 (Outer) to 1 (Center)',
    filterView: 'Filter View:',
    studView: 'Student View',
    teachView: 'Teacher Feedback',
    hide: 'Hide/Collapse',
    perfectMatch: '🌟 Perfect Match',
    deviation: 'Deviation',
    noNotes: 'No note added',
    liveNoteSec: 'Details & Live Note',
    liveStatus: 'Live',
    studentSelfRating: 'Self-Assessment (Child)',
    teacherFeedback: 'Feedback (Teacher)',
    noteStudent: 'Student Comment (You)',
    noteStudentPl: 'Thoughts or remarks from the child...',
    noteTeacher: 'Teacher Comment',
    noteTeacherPl: 'Pedagogical additions or notes...',
    liveSaved: 'Changes are saved live instantly',
    prevBtn: 'Back',
    nextBtn: 'Next',
    fullscreenBtn: 'Fullscreen',
    closeBtn: 'Close',
    gradesOverview: 'Subjects Overview',
    gradesSubtitle: 'Your Academic Performance',
    classAvg: 'Class Avg.',
    homework: 'Homework',
    homeworkSub: 'Missing assignments',
    participation: 'Class Participation',
    participationPoints: 'Points',
    evaluationPeriod: 'Evaluation Period',
    saTitle: 'Written Exams (SA)',
    saNo: 'No exams recorded yet',
    wpTitle: 'Weekly Plan Outcomes (WP)',
    wpNo: 'No weekly plans found',
    lzkTitle: 'Quizzes & Short Tests (LZK)',
    lzkNo: 'No tests recorded yet',
    miTitle: 'Engagement & Diligence',
    miSub: 'In-Class Participation',
    hueTitle: 'Homework Discipline',
    noGrade: 'No grades',
    back: 'Exit',
    prioSubject: 'CORE PRIORITY',
    fachFocus: 'Subject Focus',
    subjectAverage: 'AVERAGE'
  },
  ar: {
    langSelect: 'لغة العرض التقديمي',
    welcome: 'أهلاً وسهلاً بك في اجتماع تقييم وتوجيه الطالب (KEL)!',
    flowerTitle: 'التقييم الذاتي والملاحظات التوجيهية',
    flowerSubtitle: 'المقارنة المباشرة لمجالات الكفاءة والأداء',
    behaviorTitle: 'السلوك والحياة المدرسية اليومية',
    behaviorSubtitle: 'السلوك الاجتماعي، الحضور والتنظيم المنهجي',
    portfolioTitle: 'الملف الإنجازي والنجاحات المميزة',
    portfolioSubtitle: 'مجموعة من لحظاتك المميزة واللامعة في الفصول الدراسية',
    goalsTitle: 'الأهداف والاتفاقيات المشتركة',
    goalsSubtitle: 'التخطيط معاً لمسارات التعلم للفصل الدراسي القادم',
    agreement: 'التوافق والانسجام',
    agreementCountLabel: 'منسجم ومتوافق',
    assessmentCompare: 'مقارنة التقييمات التوجيهية',
    assessmentAreas: 'مجالات التقييم الفردية',
    interactiveFlowerTitle: 'شاشة التقييم التفاعلي',
    flowerHugeTitle: 'المخطط الزهري الكبير للأداء',
    scaleLabel: 'المقياس: 4 (الأعلى في الخارج) إلى 1 (المركز)',
    filterView: 'تصفية العرض والبيانات:',
    studView: 'وجهة نظر الطالب',
    teachView: 'تقييم المعلم والملحوظات',
    hide: 'إخفاء العرض',
    perfectMatch: '🌟 توافق وانسجام تام',
    deviation: 'الانحراف والفرق',
    noNotes: 'لا توجد ملاحظات مضافة',
    liveNoteSec: 'التفاصيل والملاحظات الفورية',
    liveStatus: 'مباشر',
    studentSelfRating: 'التقييم الذاتي (للطالب)',
    teacherFeedback: 'آراء وتقييمات (المعلم)',
    noteStudent: 'ملاحظة الطالب (أنت)',
    noteStudentPl: 'تعليق أو أفكار الطالب الخاصة...',
    noteTeacher: 'ملاحظة المعلم الأكاديمية',
    noteTeacherPl: 'الإضافات التربوية والتعليمية الفورية للمعلم...',
    liveSaved: 'يتم حفظ جميع التعديلات مباشرة ولحظياً',
    prevBtn: 'السابق',
    nextBtn: 'التالي',
    fullscreenBtn: 'ملء الشاشة',
    closeBtn: 'إغلاق',
    gradesOverview: 'نظرة عامة على المواد والمعدلات',
    gradesSubtitle: 'أدائك وإنجازاتك الدراسية الحالية',
    classAvg: 'متوسط الصف الدراسي',
    homework: 'الواجبات المنزلية',
    homeworkSub: 'المفقودة / غير المسلمة',
    participation: 'المشاركة الفعالة بالفصل',
    participationPoints: 'نقاط المشاركة',
    evaluationPeriod: 'فترة التقييم الحالية',
    saTitle: 'الامتحانات التحريرية (SA)',
    saNo: 'لم يتم تسجيل امتحانات تحريرية',
    wpTitle: 'نتائج خطة العمل الأسبوعية (WP)',
    wpNo: 'لا توجد نتائج مسلّمة',
    lzkTitle: 'الاختبارات والتقييمات القصيرة (LZK)',
    lzkNo: 'لم يتم تسجيل اختبارات قصيرة',
    miTitle: 'الجهد والمشاركة الفعّالة',
    miSub: 'المشاركة الصفية المباشرة',
    hueTitle: 'الانضباط في الواجبات المنزليّة',
    noGrade: 'لا توجد درجات',
    back: 'إنهاء',
    prioSubject: 'المجال الأساسي ذو الأولوية',
    fachFocus: 'تركيز المادة',
    subjectAverage: 'المعدل العام'
  }
};

const SUBJECT_TRANSLATIONS: Record<string, Record<string, string>> = {
  de: {
    Deutsch: 'Deutsch',
    Mathematik: 'Mathematik',
    Sachunterricht: 'Sachunterricht',
    Englisch: 'Englisch',
    Musik: 'Musik',
    Religion: 'Religion',
    'Kunst & Gestalten': 'Kunst & Gestalten',
    'Sport & Bewegung': 'Sport & Bewegung',
    'Werken': 'Werken'
  },
  tr: {
    Deutsch: 'Almanca 🇩🇪',
    Mathematik: 'Matematik 📐',
    Sachunterricht: 'Hayat Bilgisi 🌍',
    Englisch: 'İngilizce 🇬🇧',
    Musik: 'Müzik 🎵',
    Religion: 'Din Kültürü 🕋',
    'Kunst & Gestalten': 'Görsel Sanatlar 🎨',
    'Sport & Bewegung': 'Beden Eğitimi 🏃‍♂️',
    'Werken': 'Tasarım ve Beceri 🔨'
  },
  bks: {
    Deutsch: 'Njemački jezik 🇩🇪',
    Mathematik: 'Matematika 📐',
    Sachunterricht: 'Priroda i društvo 🌍',
    Englisch: 'Engleski jezik 🇬🇧',
    Musik: 'Muzička kultura 🎵',
    Religion: 'Vjeronauka 🕌',
    'Kunst & Gestalten': 'Likovna kultura 🎨',
    'Sport & Bewegung': 'Tjelesni odgoj 🏃',
    'Werken': 'Tehnička kultura 🔨'
  },
  en: {
    Deutsch: 'German 🇩🇪',
    Mathematik: 'Mathematics 📐',
    Sachunterricht: 'General Studies 🌍',
    Englisch: 'English 🇬🇧',
    Musik: 'Music 🎵',
    Religion: 'Religion ⛪',
    'Kunst & Gestalten': 'Art & Crafts 🎨',
    'Sport & Bewegung': 'Physical Education 🏃',
    'Werken': 'Handicrafts 🔨'
  },
  ar: {
    Deutsch: 'اللغة الألمانية 🇩🇪',
    Mathematik: 'الرياضيات 📐',
    Sachunterricht: 'العلوم والبيئة 🌍',
    Englisch: 'اللغة الإنجليزية 🇬🇧',
    Musik: 'الموسيقى 🎵',
    Religion: 'التربية الدينية 🕌',
    'Kunst & Gestalten': 'التربية الفنية 🎨',
    'Sport & Bewegung': 'الرياضة البدنية 🏃',
    'Werken': 'الأعمال اليدوية 🔨'
  }
};

const getLocalizedSubject = (fach: string, lang: string) => {
  return SUBJECT_TRANSLATIONS[lang]?.[fach] || fach;
};

const getSafeNum = (v: any, fallback: number): number => {
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
};

class SlideErrorBoundary extends React.Component<
  { children: React.ReactNode, onReset: () => void, onSkip: () => void },
  { hasError: boolean, error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Slide Render Crash caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-rose-50/50 rounded-3xl border border-rose-150">
          <span className="text-4xl">🩹</span>
          <h3 className="text-[1.125rem] leading-normal font-black text-rose-950 uppercase tracking-wider font-sans">Hoppla! Folie konnte nicht geladen werden</h3>
          <p className="text-[0.75rem] leading-tight text-rose-900/80 font-bold max-w-md mx-auto leading-relaxed">
            Möglicherweise sind manche IKM Plus Empfehlungen oder Notendaten in einem ungültigen Format oder unvollständig.
            {this.state.error?.message && (
              <code className="block mt-1.5 p-1.5 bg-white/75 rounded text-[0.625rem] text-red-700 font-mono select-all">
                {this.state.error.message}
              </code>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.props.onReset();
                this.setState({ hasError: false, error: null });
              }}
              className="px-4 py-2 bg-rose-600 text-white font-black text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl hover:bg-rose-700 transition-all shadow-sm active:scale-95 cursor-pointer font-sans"
            >
              Daten reparieren & neu laden 🛠️
            </button>
            <button
              onClick={() => {
                this.props.onSkip();
                this.setState({ hasError: false, error: null });
              }}
              className="px-4 py-2 bg-slate-200 text-slate-800 font-black text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl hover:bg-slate-300 transition-all active:scale-95 cursor-pointer font-sans"
            >
              Folie überspringen ⏭️
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface KELPresentationProps {
  student: any;
  app: any;
  sem: string;
  activeFaecher: string[];
  onClose: () => void;
  getAttendanceStats: (studentId: string) => any;
  berechne: (app: any, studentId: string, fach: string, sem: string) => number | null;
  STANDARD_KEL_BEREICHE: any[];
}

export default function KELPresentation({
  student,
  app: initialApp,
  sem,
  activeFaecher,
  onClose,
  getAttendanceStats,
  berechne,
  STANDARD_KEL_BEREICHE
}: KELPresentationProps) {
  const { app, setApp } = useApp();

  const lastDataUpdate = useMemo(() => {
    let latest = 0;
    if (app.activityLog && app.activityLog.length > 0) {
      latest = Math.max(...app.activityLog.map((log: any) => log.timestamp || 0));
    }
    if (latest === 0) {
      return new Date();
    }
    return new Date(latest);
  }, [app.activityLog]);

  // Sync with FlowerChart Data (Kollaboratives Entwicklungsdiagramm)
  const skillData = useMemo(() => {
    return DEVELOPMENT_DIAGRAM_FIELDS
      .map(field => {
        const lehrerValue = student?.foerderprofil?.skillRadar?.[field.id as keyof SkillRadar];
        return { ...field, value: lehrerValue };
      })
      .filter((field): field is typeof field & { value: number } =>
        typeof field.value === 'number' && Number.isFinite(field.value)
      )
      .sort((a, b) => b.value - a.value);
  }, [student?.foerderprofil?.skillRadar]);

  const strengths = useMemo(() => skillData.filter(s => s.value >= 4).slice(0, 3), [skillData]);
  const challenges = useMemo(() => skillData.filter(s => s.value <= 2).slice(0, 2), [skillData]);

  const handleRepairIkmData = () => {
    setApp((prev: any) => {
      const cleanNumber = (value: any) =>
        typeof value === 'number' && Number.isFinite(value) ? value : undefined;

      const updatedIkmRecords = (prev.ikmRecords || []).map((record: any) => {
        if (record.schuelerId !== student.id) return record;

        const cleanedDetails = record.matheDetails && typeof record.matheDetails === 'object'
          ? Object.fromEntries(
              Object.entries(record.matheDetails)
                .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
            )
          : undefined;

        return {
          ...record,
          mathematikPR: cleanNumber(record.mathematikPR),
          deutschLesenPR: cleanNumber(record.deutschLesenPR),
          deutschZuhoerenPR: cleanNumber(record.deutschZuhoerenPR),
          deutschSprachbewusstseinPR: cleanNumber(record.deutschSprachbewusstseinPR),
          ...(cleanedDetails && Object.keys(cleanedDetails).length > 0
            ? { matheDetails: cleanedDetails }
            : { matheDetails: undefined })
        };
      });

      return { ...prev, ikmRecords: updatedIkmRecords };
    });
  };
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [selectedLang, setSelectedLang] = useState<string>('de');
  const [presentationView, setPresentationView] = useState<'slides' | 'dossier'>('slides');
  const [selectedChartType, setSelectedChartType] = useState<'column' | 'bar' | 'line' | 'area' | 'pie'>('area');
  const [dossierChartType, setDossierChartType] = useState<'column' | 'line' | 'area' | 'radar'>('column');

  const [kelMode, setKelMode] = useState<'einfach' | 'experte'>(() => {
    return (localStorage.getItem('kel_presentation_mode') as 'einfach' | 'experte') || 'einfach';
  });

  const [visibleSlidesConfig, setVisibleSlidesConfig] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kel_visible_slides_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      cover: true,
      badges: true,
      subject_Deutsch: true,
      subject_Mathematik: true,
      subject_Sachunterricht: true,
      subject_other: true,
      ikm: true,
      ratgeber: true,
      flower: true,
      behavior: true,
      portfolio: true,
      ziele: true,
    };
  });

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // AI translations cache for custom languages from student list
  const [aiTranslations, setAiTranslations] = useState<Record<string, { kel: any; ui: any; subjects: any }>>({});
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // Dynamically extract student languages from the class list
  const getSuggestedLanguages = React.useCallback(() => {
    const students = app?.schueler || [];
    const langs = new Set<string>();
    students.forEach((s: any) => {
      if (s.erstsprache) langs.add(s.erstsprache.trim());
      if (s.zweitsprache) langs.add(s.zweitsprache.trim());
    });
    
    const list: { id: string; label: string; flag: string; num: string }[] = [
      { id: 'de', label: 'Deutsch', flag: '🇦🇹', num: 'DE' },
      { id: 'tr', label: 'Türkisch', flag: '🇹🇷', num: 'TR' },
      { id: 'bks', label: 'BKS', flag: '🇧🇦', num: 'BKS' },
      { id: 'en', label: 'Englisch', flag: '🇬🇧', num: 'EN' },
      { id: 'ar', label: 'Arabisch', flag: '🇸🇾', num: 'AR' }
    ];
    
    langs.forEach((langStr) => {
      if (!langStr) return;
      const clean = langStr.toLowerCase();
      
      // Skip defaults
      if (clean.includes('deutsch') || clean === 'de') return;
      if (clean.includes('türk') || clean === 'tr') return;
      if (clean.includes('bks') || clean.includes('bosn') || clean.includes('kroat') || clean.includes('serb')) return;
      if (clean.includes('engli') || clean === 'en') return;
      if (clean.includes('arab') || clean === 'ar') return;
      
      // Determine match emoji / flag
      const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
      const match = langStr.match(emojiRegex);
      const flag = match ? match[0] : '🌐';
      
      // Clean name
      const nameOnly = langStr.replace(emojiRegex, '').trim();
      if (!nameOnly) return;
      const cleanId = nameOnly.toLowerCase().substring(0, 3);
      
      const alreadyInList = list.some(l => l.id === cleanId || l.label.toLowerCase() === nameOnly.toLowerCase());
      if (alreadyInList) return;
      
      list.push({
        id: cleanId,
        label: nameOnly,
        flag: flag,
        num: nameOnly.substring(0, 3).toUpperCase()
      });
    });
    
    return list;
  }, [app?.schueler]);

  // Merge pre-defined translations with custom AI translated ones
  const activeTranslations = useMemo(() => {
    const customTrans = aiTranslations[selectedLang];
    if (customTrans) {
      return {
        kel: {
          ...KEL_TRANSLATIONS.de,
          ...customTrans.kel
        },
        ui: {
          ...UI_LANG_DATA.de,
          ...customTrans.ui
        },
        subjects: {
          ...SUBJECT_TRANSLATIONS.de,
          ...customTrans.subjects
        }
      };
    }
    return {
      kel: KEL_TRANSLATIONS[selectedLang] || KEL_TRANSLATIONS.de,
      ui: UI_LANG_DATA[selectedLang] || UI_LANG_DATA.de,
      subjects: SUBJECT_TRANSLATIONS[selectedLang] || SUBJECT_TRANSLATIONS.de
    };
  }, [selectedLang, aiTranslations]);

  // Auto-translate selected non-standard language on the fly
  useEffect(() => {
    const standardLangs = ['de', 'tr', 'bks', 'en', 'ar'];
    if (standardLangs.includes(selectedLang)) return;
    if (aiTranslations[selectedLang]) return;

    const allLangs = getSuggestedLanguages();
    const currentLangObj = allLangs.find(l => l.id === selectedLang);
    const targetLangName = currentLangObj ? currentLangObj.label : selectedLang;

    const translateContent = async () => {
      setIsTranslating(true);
      try {
        const prompt = `Du bist ein professioneller Fremdsprachen-Übersetzer für Grundschulen in Österreich.
Übersetze die folgenden deutschen Texte für das KEL-Gespräch (Kinder-Eltern-Lehrer) präzise und kindgerecht in die Sprache: "${targetLangName}".

Hier ist das deutsche JSON-Objekt, das übersetzt werden soll:
${JSON.stringify({
  kel: KEL_TRANSLATIONS.de,
  ui: {
    langSelect: UI_LANG_DATA.de.langSelect,
    welcome: UI_LANG_DATA.de.welcome,
    flowerTitle: UI_LANG_DATA.de.flowerTitle,
    flowerSubtitle: UI_LANG_DATA.de.flowerSubtitle,
    behaviorTitle: UI_LANG_DATA.de.behaviorTitle,
    behaviorSubtitle: UI_LANG_DATA.de.behaviorSubtitle,
    portfolioTitle: UI_LANG_DATA.de.portfolioTitle,
    portfolioSubtitle: UI_LANG_DATA.de.portfolioSubtitle,
    goalsTitle: UI_LANG_DATA.de.goalsTitle,
    goalsSubtitle: UI_LANG_DATA.de.goalsSubtitle,
    studentSelfRating: UI_LANG_DATA.de.studentSelfRating,
    teacherFeedback: UI_LANG_DATA.de.teacherFeedback,
    noteStudent: UI_LANG_DATA.de.noteStudent,
    noteTeacher: UI_LANG_DATA.de.noteTeacher,
    liveSaved: UI_LANG_DATA.de.liveSaved,
    prevBtn: UI_LANG_DATA.de.prevBtn,
    nextBtn: UI_LANG_DATA.de.nextBtn,
    fullscreenBtn: UI_LANG_DATA.de.fullscreenBtn,
    closeBtn: UI_LANG_DATA.de.closeBtn,
    noGrade: UI_LANG_DATA.de.noGrade,
    back: UI_LANG_DATA.de.back,
  },
  subjects: SUBJECT_TRANSLATIONS.de
}, null, 2)}

Antworte AUSSCHLIESSLICH mit dem übersetzten JSON-Objekt in exakt derselben Struktur. Behalte die Schlüssel (wie 'zuzuhoeren', 'lesen', 'welcome') 1:1 bei, übersetze nur die Werte. Gib keinen zusätzlichen Text oder Markdown-Formatierung (wie \`\`\`json) aus.`;

        const responseText = await askAI('ki-helfer', prompt);
        if (responseText) {
          let cleanJsonStr = responseText.trim();
          if (cleanJsonStr.startsWith('```')) {
            cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
          }
          const cleanedData = JSON.parse(cleanJsonStr);
          setAiTranslations(prev => ({
            ...prev,
            [selectedLang]: cleanedData
          }));
        }
      } catch (err) {
        console.error("AI translation error:", err);
      } finally {
        setIsTranslating(false);
      }
    };

    translateContent();
  }, [selectedLang, aiTranslations, getSuggestedLanguages]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [editVereinbarung, setEditVereinbarung] = useState<string>('');
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [showStudentView, setShowStudentView] = useState<boolean>(true);
  const [showTeacherView, setShowTeacherView] = useState<boolean>(true);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('zuzuhoeren');

  const [ikmTab, setIkmTab] = useState<'diagnose' | 'schatzkarte'>('diagnose');
  const [ikmChartModus, setIkmChartModus] = useState<'mathe' | 'deutsch'>('mathe');
  const [isAnalyzingProfile, setIsAnalyzingProfile] = useState<boolean>(false);

  const generateFallbackAnalysis = (_student: any, ikmRecord: any, currentApp: any, _sem: string) => {
    const existingPath = currentApp.lernpfade?.[student.id] || {};
    return {
      staerken: typeof ikmRecord?.diagnoseStaerken === 'string' ? ikmRecord.diagnoseStaerken : '',
      herausforderungen: typeof ikmRecord?.diagnoseHerausforderungen === 'string' ? ikmRecord.diagnoseHerausforderungen : '',
      stationen: Array.isArray(existingPath.stationen) ? existingPath.stationen : [],
      elternTipps: Array.isArray(existingPath.elternTipps) ? existingPath.elternTipps : []
    };
  };
  const runProfileAnalysis = async () => {
    setIsAnalyzingProfile(true);
    const ikmRecord: any = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id) || null;
    try {
      const mathGrade = berechne ? berechne(app, student.id, 'Mathematik', sem) : null;
      const deutschGrade = berechne ? berechne(app, student.id, 'Deutsch', sem) : null;
      const suGrade = berechne ? berechne(app, student.id, 'Sachunterricht', sem) : null;

      const sanitizedIkm = ikmRecord ? {
        mathematikPR: ikmRecord.mathematikPR,
        deutschLesenPR: ikmRecord.deutschLesenPR,
        deutschZuhoerenPR: ikmRecord.deutschZuhoerenPR,
        deutschSprachbewusstseinPR: ikmRecord.deutschSprachbewusstseinPR,
        diagnoseStaerken: ikmRecord.diagnoseStaerken,
        diagnoseHerausforderungen: ikmRecord.diagnoseHerausforderungen
      } : null;

      const badgeNames = (student.badges || [])
        .map((b: any) => typeof b === 'string' ? b : b.name)
        .filter(Boolean);
      const foerderZiele = (student.foerderprofil?.foerderziele || [])
        .map((z: any) => z.ziel ? `${z.ziel} (${z.bereich || 'ohne Bereichsangabe'})` : '')
        .filter(Boolean);
      const documentedStrengths = (student.foerderprofil?.staerken || []).filter(Boolean);
      const observations = getStudentNotes(app, student.id)
        .slice(0, 8)
        .map((note: any) => note.inhalt || note.notiz || note.text || note.titel)
        .filter(Boolean);

      const gradeData = [
        mathGrade !== null ? `Mathematik: ${Number(mathGrade).toFixed(2)}` : '',
        deutschGrade !== null ? `Deutsch: ${Number(deutschGrade).toFixed(2)}` : '',
        suGrade !== null ? `Sachunterricht: ${Number(suGrade).toFixed(2)}` : ''
      ].filter(Boolean);

      const hasEvidence = Boolean(
        sanitizedIkm ||
        gradeData.length ||
        badgeNames.length ||
        foerderZiele.length ||
        documentedStrengths.length ||
        observations.length
      );
      if (!hasEvidence) return;

      const promptText = `Erstelle einen KEL-Entwurf ausschließlich aus den folgenden dokumentierten Daten für ein pseudonymisiertes Kind (Kind A).
Erfinde keine Persönlichkeit, Motivation, Stärken, Schwächen, Diagnosen, Leistungen, Förderbedarfe oder häuslichen Umstände.
Wenn eine Aussage durch die Daten nicht belegt ist, lasse sie weg. Formuliere Vorschläge ausdrücklich als Vorschläge, nicht als Tatsachen.

Schulstufe: ${app.stufe ? `${app.stufe}. Schulstufe` : 'nicht erfasst'}
IKM-/Diagnostikdaten: ${sanitizedIkm ? JSON.stringify(sanitizedIkm) : 'nicht vorhanden'}
Erfasste Leistungswerte: ${gradeData.length ? gradeData.join('; ') : 'nicht vorhanden'}
Dokumentierte Stärken/Badges: ${[...documentedStrengths, ...badgeNames].join('; ') || 'nicht vorhanden'}
Vorhandene Förderziele: ${foerderZiele.join('; ') || 'nicht vorhanden'}
Dokumentierte Beobachtungen: ${observations.join('; ') || 'nicht vorhanden'}

Antworte ausschließlich als JSON:
{
  "staerken": "Nur belegte Stärken; sonst leerer String",
  "herausforderungen": "Nur belegte bzw. bereits dokumentierte nächste Ziele; sonst leerer String",
  "stationen": [
    { "titel": "Vorschlag", "aufgabe": "konkrete Übung auf Basis eines belegten Ziels", "ziel": "zugehöriges belegtes Ziel", "icon": "map" }
  ],
  "elternTipps": ["Optionaler Vorschlag auf Basis eines belegten Ziels"]
}`;

      const responseText = await askAI('ki-lernpfad', promptText);
      if (!responseText) return;

      let cleanText = responseText.trim()
        .replace(/^\`\`\`json\s*/i, '')
        .replace(/^\`\`\`\s*/i, '')
        .replace(/\`\`\`$/, '')
        .trim();
      const pathData = JSON.parse(cleanText);

      const safeStations = Array.isArray(pathData.stationen) ? pathData.stationen : [];
      const safeTips = Array.isArray(pathData.elternTipps) ? pathData.elternTipps : [];

      setApp(prev => {
        const newLernpfade = {
          ...(prev.lernpfade || {}),
          [student.id]: {
            stationen: safeStations,
            elternTipps: safeTips,
            source: 'ai-draft',
            generatedAt: new Date().toISOString()
          }
        };

        const existingRecords = prev.ikmRecords || [];
        const recIdx = existingRecords.findIndex((r: any) => r.schuelerId === student.id);
        let updatedIkmRecords = existingRecords;

        if (recIdx >= 0) {
          updatedIkmRecords = [...existingRecords];
          updatedIkmRecords[recIdx] = {
            ...updatedIkmRecords[recIdx],
            diagnoseStaerken: typeof pathData.staerken === 'string' && pathData.staerken.trim()
              ? pathData.staerken.trim()
              : updatedIkmRecords[recIdx].diagnoseStaerken,
            diagnoseHerausforderungen: typeof pathData.herausforderungen === 'string' && pathData.herausforderungen.trim()
              ? pathData.herausforderungen.trim()
              : updatedIkmRecords[recIdx].diagnoseHerausforderungen,
          };
        }

        return { ...prev, lernpfade: newLernpfade, ikmRecords: updatedIkmRecords };
      });
    } catch (error) {
      console.error('AI profile analysis failed; no fallback content was created.', error);
    } finally {
      setIsAnalyzingProfile(false);
    }
  };
  const handleSaveAreaComment = (areaId: string, type: 'teacher' | 'student', text: string) => {
    setApp(prev => {
      const kelGespraeche = prev.kelGespraeche || [];
      const existingIndex = kelGespraeche.findIndex((k: any) => k.schuelerId === student.id);
      
      let updated;
      const targetMeeting = existingIndex >= 0 
        ? kelGespraeche[existingIndex] 
        : {
            id: 'kel-' + Date.now(),
            schuelerId: student.id,
            datum: new Date().toISOString().split('T')[0],
            schuljahr: prev.schuljahr || '',
            teilnehmer: [student.vorname, 'Lehrkraft'],
            selbsteinschaetzungKind: {},
            einschaetzungLehrperson: {},
            elternEindruck: '',
            zieleKind: [],
            vereinbarungen: '',
            naechsterTermin: '',
            unterschriftKind: false,
            unterschriftEltern: false,
            unterschriftLehrperson: false,
            notiz: ''
          };

      const key = type === 'teacher' ? 'einschaetzungLehrperson' : 'selbsteinschaetzungKind';
      const existingVal = targetMeeting[key]?.[areaId] || { kommentar: '' };
      
      const updatedMeeting = {
        ...targetMeeting,
        [key]: {
          ...targetMeeting[key],
          [areaId]: {
            ...existingVal,
            kommentar: text
          }
        }
      };

      if (existingIndex >= 0) {
        const list = [...kelGespraeche];
        list[existingIndex] = updatedMeeting;
        updated = list;
      } else {
        updated = [...kelGespraeche, updatedMeeting];
      }

      return {
        ...prev,
        kelGespraeche: updated
      };
    });
  };

  const handleSaveAreaRating = (areaId: string, type: 'teacher' | 'student', rValue: number) => {
    setApp(prev => {
      const kelGespraeche = prev.kelGespraeche || [];
      const existingIndex = kelGespraeche.findIndex((k: any) => k.schuelerId === student.id);
      
      let updated;
      const targetMeeting = existingIndex >= 0 
        ? kelGespraeche[existingIndex] 
        : {
            id: 'kel-' + Date.now(),
            schuelerId: student.id,
            datum: new Date().toISOString().split('T')[0],
            schuljahr: prev.schuljahr || '',
            teilnehmer: [student.vorname, 'Lehrkraft'],
            selbsteinschaetzungKind: {},
            einschaetzungLehrperson: {},
            elternEindruck: '',
            zieleKind: [],
            vereinbarungen: '',
            naechsterTermin: '',
            unterschriftKind: false,
            unterschriftEltern: false,
            unterschriftLehrperson: false,
            notiz: ''
          };

      const key = type === 'teacher' ? 'einschaetzungLehrperson' : 'selbsteinschaetzungKind';
      const existingVal = targetMeeting[key]?.[areaId] || { kommentar: '' };
      
      const updatedMeeting = {
        ...targetMeeting,
        [key]: {
          ...targetMeeting[key],
          [areaId]: {
            ...existingVal,
            wert: rValue as 1 | 2 | 3 | 4
          }
        }
      };

      if (existingIndex >= 0) {
        const list = [...kelGespraeche];
        list[existingIndex] = updatedMeeting;
        updated = list;
      } else {
        updated = [...kelGespraeche, updatedMeeting];
      }

      return {
        ...prev,
        kelGespraeche: updated
      };
    });
  };

  const slidesContainerRef = useRef<HTMLDivElement>(null);

  // Autofocus presentations-container on view, fullscreen, or slide index change
  useEffect(() => {
    if (presentationView === 'slides' && slidesContainerRef.current) {
      if (document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        slidesContainerRef.current.focus();
      }
    }
  }, [presentationView, isFullscreen, slideIndex]);

  // --- KEL PRESENTATION SPEAKING TIMEOUT COUNTDOWN TIMER ---
  const [timerSeconds, setTimerSeconds] = useState<number>(15 * 60); // 15 mins default
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerInitial, setTimerInitial] = useState<number>(15 * 60);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const formatTimerTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateAverageOfList = (list: any[]): number => {
    if (!list || list.length === 0) return 0;
    const sum = list.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    return sum / list.length;
  };

  const getMitarbeitNumGrade = (points: number, studentId: string, fachName: string): number => {
    const studentGrades = app.noten?.[studentId]?.[fachName]?.[sem];
    if (studentGrades?.miDirekt !== undefined && studentGrades?.miDirekt !== null) {
      return Number(studentGrades.miDirekt);
    }

    const s = app.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' };
    
    if (s.mode === 'relative' && s.relative_confirmed) {
      const activeValues = app.schueler.map((st: any) => app.mitarbeit?.[st.id]?.[fachName]?.[sem] || 0);
      const avgScore = activeValues.length > 0 ? activeValues.reduce((a: number, b: number) => a + b, 0) / activeValues.length : 0;
      const rel = s.relative_thresholds || { 1: 20, 2: 10, 3: 0, 4: -10 };
      
      if (points >= avgScore * (1 + rel[1]/100)) return 1;
      if (points >= avgScore * (1 + rel[2]/100)) return 2;
      if (points >= avgScore * (1 + rel[3]/100)) return 3;
      if (points >= avgScore * (1 + rel[4]/100)) return 4;
      return 5;
    }

    const t = s.thresholds || { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 };
    if (points >= (t[1] || 13)) return 1;
    if (points >= (t[2] || 10)) return 2;
    if (points >= (t[3] || 7)) return 3;
    if (points >= (t[4] || 4)) return 4;
    return 5;
  };

  // 1. Core Profile Stats
  const birthDateStr = student.geburtstag;
  
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return null;
    let birthDate: Date;
    if (dateStr.includes('-')) {
      birthDate = new Date(dateStr);
    } else {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else {
        return null;
      }
    }
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  const age = calculateAge(birthDateStr);

  const faecherGrades = useMemo(() => {
    return activeFaecher.map(fach => {
      const avg = berechne(app, student.id, fach, sem);
      const allGrads = app.schueler
        .map((s: any) => berechne(app, s.id, fach, sem))
        .filter((g: any) => g !== null) as number[];
      const classAvg = allGrads.length > 0 ? allGrads.reduce((a, b) => a + b, 0) / allGrads.length : null;
      return { 
        fach, 
        avg: avg !== null ? Number(avg.toFixed(2)) : null,
        classAvg: classAvg !== null ? Number(classAvg.toFixed(2)) : null
      };
    });
  }, [activeFaecher, app, student.id, sem, berechne]);

  const activeGradesToRender = useMemo(() => {
    return faecherGrades.filter(g => g.avg !== null);
  }, [faecherGrades]);

  const gesamtSchnitt = useMemo(() => {
    return activeGradesToRender.length > 0
      ? Number((activeGradesToRender.reduce((sum, item) => sum + (item.avg || 0), 0) / activeGradesToRender.length).toFixed(2))
      : null;
  }, [activeGradesToRender]);

  const overallClassSchnitt = useMemo(() => {
    const list: number[] = [];
    activeFaecher.forEach(fach => {
      app.schueler.forEach((s: any) => {
        const g = berechne(app, s.id, fach, sem);
        if (g !== null) list.push(g);
      });
    });
    return list.length > 0 ? Number((list.reduce((a, b) => a + b, 0) / list.length).toFixed(2)) : null;
  }, [activeFaecher, app, sem, berechne]);

  // General comparative chart data
  const overallChartData = useMemo(() => {
    return activeGradesToRender.map(g => ({
      name: g.fach,
      "Schüler (Du)": g.avg,
      "Klasse (Ø)": g.classAvg
    }));
  }, [activeGradesToRender]);

  // 2. Attendance Stats
  const attendance = useMemo(
    () => getStudentAttendanceSummary(app, student.id),
    [app.anwesenheit, student.id]
  );

  const classAvgAttendance = useMemo(() => {
    const students = app.schueler || [];
    if (students.length === 0) return { excused: 0, unexcused: 0, total: 0 };
    let excusedSum = 0;
    let unexcusedSum = 0;
    students.forEach((s: any) => {
      const stats = getStudentAttendanceSummary(app, s.id);
      excusedSum += stats.excused || 0;
      unexcusedSum += stats.unexcused || 0;
    });
    return {
      excused: Number((excusedSum / students.length).toFixed(1)),
      unexcused: Number((unexcusedSum / students.length).toFixed(1)),
      total: Number(((excusedSum + unexcusedSum) / students.length).toFixed(1))
    };
  }, [app, app.schueler]);

  const attendanceChartData = useMemo(() => {
    return [
      {
        name: 'Du',
        'Entschuldigt': attendance.excused,
        'Unentschuldigt': attendance.unexcused,
      },
      {
        name: 'Klasse Ø',
        'Entschuldigt': classAvgAttendance.excused,
        'Unentschuldigt': classAvgAttendance.unexcused,
      }
    ];
  }, [attendance, classAvgAttendance]);

  // 3. Behavior Status
  const behaviorSummary = useMemo(
    () => getStudentBehaviorSummary(app, student.id),
    [app.behavior_stages, app.behavior_status, app.behavior_default_stage_id, app.statusLog, student.id]
  );
  const behaviorStages = behaviorSummary.stages;
  const behaviorStage = behaviorSummary.stage;

  const studentBehaviorPieData = useMemo(() => {
    const logs = (app.statusLog || []).filter((log: any) => log.schuelerId === student.id);
    const counts: Record<string, number> = {};
    
    logs.forEach((log: any) => {
      const stageId = log.iconId || '3';
      counts[stageId] = (counts[stageId] || 0) + 1;
    });

    return behaviorStages.map((stage: any) => {
      const count = counts[stage.id] || 0;
      return {
        name: `${stage.icon} ${stage.label}`,
        value: count,
        color: stage.color,
      };
    }).filter(item => item.value > 0);
  }, [app.statusLog, student.id, behaviorStages]);

  // 4. Klassenkasse
  const financeSummary = useMemo(
    () => getStudentFinanceSummary(app, student.id),
    [app.klassenkasse?.sammlungen, student.id]
  );
  const totalKasseOwed = financeSummary.due;
  const totalKassePaid = financeSummary.paid;
  const isKasseBalanced = financeSummary.isBalanced;
  const kasseDifference = financeSummary.open;

  // 5. Portfolio Notes & Timeline
  const deduplicatedNotes = useMemo(
    () => getStudentNotes(app, student.id),
    [app.notizen, app.notes, app.journal, student.id]
  );

  // 6. KEL Self Assessment Compare
  const latestKel = (app.kelGespraeche || []).find((k: any) => k.schuelerId === student.id);
  const hasKelAssessmentData = Boolean(latestKel && (
    Object.values(latestKel.selbsteinschaetzungKind || {}).some((entry: any) => entry?.wert !== undefined && entry?.wert !== null) ||
    Object.values(latestKel.einschaetzungLehrperson || {}).some((entry: any) => entry?.wert !== undefined && entry?.wert !== null)
  ));
  const SMILEYS: Record<number, { icon: string, label: string }> = {
    5: { icon: '🏆', label: 'Hervorragend / Immer' },
    4: { icon: '🌟', label: 'Sehr gut / Fast immer' },
    3: { icon: '👍', label: 'Gut / Meistens' },
    2: { icon: '✍️', label: 'Teilweise / Manchmal' },
    1: { icon: '⏳', label: 'In Ansätzen / Selten' },
    0: { icon: '🌑', label: 'Nicht beobachtet / Hilfe nötig' }
  };

  const mergedFlowerFields = useMemo(() => {
    // Start with Standard KEL fields
    const base = [...STANDARD_KEL_BEREICHE];
    
    // Add missing Development fields if not already present
    DEVELOPMENT_DIAGRAM_FIELDS.forEach(f => {
      if (!base.find(b => b.id === f.id)) {
        base.push({
          id: f.id,
          label: f.label,
          kategorie: f.kategorie as any,
          kindgerecht: f.kindgerecht
        });
      }
    });

    // Add any fields that exist in the database but not in the standard lists
    // This handles "Reflexionskatalog" fields if they are custom
    if (latestKel) {
      const allDbKeys = new Set([
        ...Object.keys(latestKel.selbsteinschaetzungKind || {}),
        ...Object.keys(latestKel.einschaetzungLehrperson || {})
      ]);

      allDbKeys.forEach(key => {
        if (!base.find(b => b.id === key)) {
          base.push({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            kategorie: 'lernen', // Default
            kindgerecht: ''
          });
        }
      });
    }

    return base;
  }, [STANDARD_KEL_BEREICHE, latestKel]);

  const kelComparisons = useMemo(() => {
    const normalizeValue = (v: any) => {
      if (v === undefined || v === null) return null;
      return Number(v);
    };

    return mergedFlowerFields.map(field => {
      const dbKind = latestKel?.selbsteinschaetzungKind?.[field.id];
      const dbLehr = latestKel?.einschaetzungLehrperson?.[field.id];
      
      const kindValue = normalizeValue(dbKind?.wert);
      const teacherValue = normalizeValue(dbLehr?.wert);
      
      const kindSmiley = kindValue !== null ? (SMILEYS[kindValue] || SMILEYS[3]) : null;
      const teacherSmiley = teacherValue !== null ? (SMILEYS[teacherValue] || SMILEYS[3]) : null;
      const isAgreement = kindValue !== null && teacherValue !== null && kindValue === teacherValue;
      
      return {
        id: field.id,
        label: activeTranslations.kel?.[field.id]?.label || field.label,
        kategorie: field.kategorie,
        statement: activeTranslations.kel?.[field.id]?.kindgerecht || field.kindgerecht,
        kindVal: kindValue,
        teacherVal: teacherValue,
        kindIcon: kindSmiley?.icon || '–',
        teacherIcon: teacherSmiley?.icon || '–',
        kindLabel: kindSmiley?.label || 'Noch nicht eingeschätzt',
        teacherLabel: teacherSmiley?.label || 'Noch nicht eingeschätzt',
        isAgreement
      };
    }).filter(item => item.kindVal !== null || item.teacherVal !== null);
  }, [latestKel, mergedFlowerFields, activeTranslations]);

  const { agreementCount, totalKelFields, agreementPercentage } = useMemo(() => {
    const agreement = kelComparisons.filter(c => c.isAgreement).length;
    const total = kelComparisons.length;
    return {
      agreementCount: agreement,
      totalKelFields: total,
      agreementPercentage: total > 0 ? Math.round((agreement / total) * 100) : 0
    };
  }, [kelComparisons]);

  const presentationFlowerData = useMemo(() => {
    return mergedFlowerFields.map(bereich => {
      const dbKind = latestKel?.selbsteinschaetzungKind?.[bereich.id];
      const dbLehr = latestKel?.einschaetzungLehrperson?.[bereich.id];
      
      const kindRaw = dbKind?.wert !== undefined ? Number(dbKind.wert) : null;
      const lehrRaw = dbLehr?.wert !== undefined ? Number(dbLehr.wert) : null;

      return {
        id: bereich.id,
        label: activeTranslations.kel?.[bereich.id]?.label || bereich.label,
        subject: activeTranslations.kel?.[bereich.id]?.label || bereich.label,
        kindgerecht: activeTranslations.kel?.[bereich.id]?.kindgerecht || bereich.kindgerecht,
        kategorie: bereich.kategorie,
        'Kind (Du)': kindRaw ?? 0,
        'Lehrkraft': lehrRaw ?? 0,
        kindRaw,
        lehrRaw,
        studentNote: dbKind?.kommentar || '',
        teacherNote: dbLehr?.kommentar || '',
        fullMark: 5
      };
    }).filter(item => item.kindRaw !== null || item.lehrRaw !== null);
  }, [latestKel, mergedFlowerFields, activeTranslations]);

  const selectedData = useMemo(() => {
    return presentationFlowerData.find(d => d.id === selectedAreaId) || presentationFlowerData[0];
  }, [presentationFlowerData, selectedAreaId]);

  const [localTeacherComment, setLocalTeacherComment] = useState('');
  const [localStudentComment, setLocalStudentComment] = useState('');

  useEffect(() => {
    if (selectedData) {
      setLocalTeacherComment(selectedData.teacherNote || '');
      setLocalStudentComment(selectedData.studentNote || '');
    }
  }, [selectedAreaId, selectedData]);

  // Motivational quote
  const highlightStrength = useMemo(() => {
    if (student.notiz) return student.notiz.trim();
    return `Heute schauen wir gemeinsam darauf, was ${student.vorname} bereits gut gelingt und welcher nächste Schritt sinnvoll ist.`;
  }, [student.notiz, student.vorname]);

  // Sync live latestKel.vereinbarungen to edit state
  useEffect(() => {
    if (latestKel) {
      setEditVereinbarung(latestKel.vereinbarungen || '');
    } else {
      setEditVereinbarung('');
    }
  }, [latestKel?.id, latestKel?.vereinbarungen]);

  const handleSaveLiveVereinbarungen = (newVal: string) => {
    setEditVereinbarung(newVal);
    
    setApp(prev => {
      const kelGespraeche = prev.kelGespraeche || [];
      const existingIndex = kelGespraeche.findIndex((k: any) => k.schuelerId === student.id);
      
      let updated;
      if (existingIndex >= 0) {
        const existing = kelGespraeche[existingIndex];
        const updatedKel = {
          ...existing,
          vereinbarungen: newVal,
        };
        const list = [...kelGespraeche];
        list[existingIndex] = updatedKel;
        updated = list;
      } else {
        const newKel: any = {
          id: 'kel-' + Date.now(),
          schuelerId: student.id,
          datum: new Date().toISOString().split('T')[0],
          schuljahr: app.schuljahr || '',
          teilnehmer: ['Eltern', 'Schüler', 'Lehrperson'],
          selbsteinschaetzungKind: {},
          einschaetzungLehrperson: {},
          elternEindruck: '',
          zieleKind: [],
          vereinbarungen: newVal,
          naechsterTermin: '',
          unterschriftKind: false,
          unterschriftEltern: false,
          unterschriftLehrperson: false,
          notiz: ''
        };
        updated = [...kelGespraeche, newKel];
      }
      return {
        ...prev,
        kelGespraeche: updated
      };
    });
    
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  const dossierAgreementSuggestions = useMemo(() => {
    const goals = (student.foerderprofil?.foerderziele || [])
      .filter((goal: any) => goal.status === 'offen' || goal.status === 'in Arbeit');
    const activeGoalIds = new Set(goals.map((goal: any) => goal.id));
    const measures = (student.foerderprofil?.massnahmen || [])
      .filter((measure: any) => !measure.zielId || activeGoalIds.has(measure.zielId));

    return [
      ...goals.map((goal: any) => ({
        id: `goal-${goal.id}`,
        title: goal.bereich || 'Förderziel',
        text: goal.ziel,
        prefix: `• Unser Ziel: ${goal.ziel}${goal.zielDatum ? ` (gemeinsamer Blick bis ${new Date(`${goal.zielDatum}T12:00:00`).toLocaleDateString('de-AT')})` : ''}.`,
        kind: 'Ziel'
      })),
      ...measures.map((measure: any) => ({
        id: `measure-${measure.id}`,
        title: measure.bezeichnung || 'Unterstützung',
        text: measure.beschreibung || 'Dokumentierte pädagogische Unterstützung',
        prefix: `• So unterstützen wir: ${measure.bezeichnung || 'Vereinbarte Maßnahme'}${measure.beschreibung ? ` – ${measure.beschreibung}` : ''}${measure.kontrollDatum ? ` (Rückblick am ${new Date(`${measure.kontrollDatum}T12:00:00`).toLocaleDateString('de-AT')})` : ''}.`,
        kind: 'Unterstützung'
      }))
    ].slice(0, 6);
  }, [student.foerderprofil?.foerderziele, student.foerderprofil?.massnahmen]);

  // Dynamic Slides Construction
  const slides = useMemo(() => {
    const list: any[] = [];
    
    // Slide 1: Welcome Intro
    list.push({
      type: 'cover',
      title: `${student.vorname} ${student.nachname}`,
      subtitle: activeTranslations.ui?.welcome || 'Herzlich willkommen zum KEL-Gespräch!',
    });

    list.push({
      type: 'overview',
      title: 'Unser gemeinsamer Überblick',
      subtitle: 'Das Wichtigste verständlich zusammengefasst'
    });

    // Slide 2: Strengths & Badges (if available)
    if (student.badges && student.badges.length > 0) {
      if (kelMode !== 'einfach' || visibleSlidesConfig.badges !== false) {
        if (visibleSlidesConfig.badges !== false) {
          list.push({
            type: 'badges',
            title: 'Meine Stärken & Talente',
            subtitle: 'Was mich besonders auszeichnet',
            badges: student.badges
          });
        }
      }
    }

    // Priority Subject Slides: Deutsch, Mathematik, Sachunterricht first!
    const prioritizedSubjects = ['Deutsch', 'Mathematik', 'Sachunterricht'];
    const remainingSubjects = activeFaecher.filter(f => !prioritizedSubjects.includes(f));
    const orderedSubjects = [
      ...prioritizedSubjects.filter(f => activeFaecher.includes(f)),
      ...remainingSubjects
    ];

    orderedSubjects.forEach(fach => {
      const isPriority = prioritizedSubjects.includes(fach);
      
      // Filter based on kelMode and visibleSlidesConfig
      if (kelMode === 'einfach' && !isPriority) {
        // Simple mode excludes non-priority subjects
        return;
      }
      
      if (isPriority) {
        if (visibleSlidesConfig[`subject_${fach}`] === false) return;
      } else {
        if (visibleSlidesConfig.subject_other === false) return;
      }

      const avgGrade = berechne(app, student.id, fach, sem);
      
      // Calculate missing homework and participation points
      const miPoints = app.mitarbeit?.[student.id]?.[fach]?.[sem] || 0;
      const miDirekt = app.noten?.[student.id]?.[fach]?.[sem]?.miDirekt;
      const hueCount = app.noten?.[student.id]?.[fach]?.[sem]?.hue || 0;

      // Extract grades list
      const studentSa = app.noten?.[student.id]?.[fach]?.[sem]?.sa || [];
      const studentWp = app.noten?.[student.id]?.[fach]?.[sem]?.wp || [];
      const studentLzk = app.noten?.[student.id]?.[fach]?.[sem]?.lzk || [];
      const subjectRecord = app.noten?.[student.id]?.[fach]?.[sem];
      const hasParticipationData = (
        miDirekt !== undefined && miDirekt !== null && (miDirekt as any) !== ''
      ) || app.mitarbeit?.[student.id]?.[fach]?.[sem] !== undefined;
      const hasHomeworkData = Boolean(
        subjectRecord && Object.prototype.hasOwnProperty.call(subjectRecord, 'hue')
      );
      const hasSubjectData = avgGrade !== null ||
        studentSa.length > 0 ||
        studentWp.length > 0 ||
        studentLzk.length > 0 ||
        hasParticipationData ||
        hasHomeworkData;

      // Leere Fachfolien liefern keinen Gesprächswert und dürfen keine Scheinnoten erzeugen.
      if (!hasSubjectData) return;

      // Calculate category metrics for personal and class averages
      const classSaList = app.schueler.flatMap((s: any) => app.noten?.[s.id]?.[fach]?.[sem]?.sa || []).filter((g: any) => g !== null);
      const classWpList = app.schueler.flatMap((s: any) => app.noten?.[s.id]?.[fach]?.[sem]?.wp || []).filter((g: any) => g !== null);
      const classLzkList = app.schueler.flatMap((s: any) => app.noten?.[s.id]?.[fach]?.[sem]?.lzk || []).filter((g: any) => g !== null);

      const avgClassSa = classSaList.length > 0 ? calculateAverageOfList(classSaList) : null;
      const avgClassWp = classWpList.length > 0 ? calculateAverageOfList(classWpList) : null;
      const avgClassLzk = classLzkList.length > 0 ? calculateAverageOfList(classLzkList) : null;

      const getHueNumGrade = (count: number): number => {
        if (count === 0) return 1;
        if (count === 1) return 2;
        if (count === 2) return 3;
        if (count === 3 || count === 4) return 4;
        return 5;
      };

      const studentMiGrade = hasParticipationData ? getMitarbeitNumGrade(miPoints, student.id, fach) : null;
      const classMiList = app.schueler.map((s: any) => {
        const direct = app.noten?.[s.id]?.[fach]?.[sem]?.miDirekt;
        const points = app.mitarbeit?.[s.id]?.[fach]?.[sem];
        if ((direct === undefined || direct === null || (direct as any) === '') && points === undefined) return null;
        return direct !== undefined && direct !== null && (direct as any) !== ''
          ? Number(direct)
          : getMitarbeitNumGrade(Number(points), s.id, fach);
      }).filter((value: any): value is number => value !== null && Number.isFinite(value));
      const avgClassMi = classMiList.length > 0 ? calculateAverageOfList(classMiList) : null;

      const studentHueGrade = hasHomeworkData ? getHueNumGrade(hueCount) : null;
      const classHueList = app.schueler.map((s: any) => {
        const record = app.noten?.[s.id]?.[fach]?.[sem];
        if (!record || !Object.prototype.hasOwnProperty.call(record, 'hue')) return null;
        const hCount = Number(record.hue || 0);
        return getHueNumGrade(hCount);
      }).filter((value: any): value is number => value !== null && Number.isFinite(value));
      const avgClassHue = classHueList.length > 0 ? calculateAverageOfList(classHueList) : null;

      // Comparative chart categories
      const detailsChartData = [
        {
          name: activeTranslations.ui?.saTitle || 'Schularbeiten',
          'Du': studentSa.length > 0 ? Number(calculateAverageOfList(studentSa).toFixed(2)) : null,
          'Klasse Ø': avgClassSa !== null ? Number(avgClassSa.toFixed(2)) : null
        },
        {
          name: activeTranslations.ui?.wpTitle || 'Wochenpläne',
          'Du': studentWp.length > 0 ? Number(calculateAverageOfList(studentWp).toFixed(2)) : null,
          'Klasse Ø': avgClassWp !== null ? Number(avgClassWp.toFixed(2)) : null
        },
        {
          name: activeTranslations.ui?.lzkTitle || 'Lernkontrollen',
          'Du': studentLzk.length > 0 ? Number(calculateAverageOfList(studentLzk).toFixed(2)) : null,
          'Klasse Ø': avgClassLzk !== null ? Number(avgClassLzk.toFixed(2)) : null
        },
        {
          name: activeTranslations.ui?.participation || 'Mitarbeit',
          'Du': studentMiGrade,
          'Klasse Ø': avgClassMi !== null ? Number(avgClassMi.toFixed(2)) : null
        },
        {
          name: activeTranslations.ui?.homework || 'Hausübungen',
          'Du': studentHueGrade,
          'Klasse Ø': avgClassHue !== null ? Number(avgClassHue.toFixed(2)) : null
        }
      ].filter(item => item['Du'] !== null || item['Klasse Ø'] !== null);

      list.push({
        type: 'subject',
        fach,
        avgGrade,
        miPoints,
        miDirekt,
        hasParticipationData,
        hueCount,
        hasHomeworkData,
        studentSa,
        studentWp,
        studentLzk,
        detailsChartData,
        isPriority: prioritizedSubjects.includes(fach)
      });
    });

    // Slide: IKM Plus results if available
    const ikmRecord = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id);
    if (ikmRecord && kelMode !== 'einfach' && visibleSlidesConfig.ikm !== false) {
      list.push({
        type: 'ikm',
        record: ikmRecord,
        title: 'Ergebnisse aus IKM Plus',
        subtitle: 'Was die Kompetenzmessung zeigt – verständlich erklärt'
      });
    }

    if (ikmRecord && kelMode !== 'einfach' && visibleSlidesConfig.ratgeber !== false) {
      let rawLernpfad = null;
      try {
        rawLernpfad = ikmRecord.kommentar ? JSON.parse(ikmRecord.kommentar) : null;
      } catch (e) {}
      
      // Show Ratgeber, it will use AI data if available or display fallbacks
      list.push({
        type: 'ratgeber',
        record: ikmRecord,
        title: 'Praktische Ideen für zu Hause',
        subtitle: 'Einfache Übungen und Unterstützung im Alltag'
      });
    }

    // Slide: Kompetenzen / Flower Chart
    if (visibleSlidesConfig.flower !== false && hasKelAssessmentData) {
      list.push({
        type: 'flower',
        title: '🌸 So schätzen wir die Entwicklung ein',
        subtitle: activeTranslations.ui?.flowerSubtitle || 'Die Sicht des Kindes und der Lehrperson im Vergleich'
      });
    }

    // Slide: Verhalten, Fehlzeiten & Finanzen
    if (kelMode !== 'einfach' && visibleSlidesConfig.behavior !== false) {
      list.push({
        type: 'behavior',
        title: activeTranslations.ui?.behaviorTitle || 'Verhalten & Schulalltag',
        subtitle: activeTranslations.ui?.behaviorSubtitle || 'Soziales Verhalten, Anwesenheit & Organisation'
      });
    }

    // Slide: Portfolio, Meilensteine & Lob
    if (kelMode !== 'einfach' && visibleSlidesConfig.portfolio !== false) {
      list.push({
        type: 'portfolio',
        title: activeTranslations.ui?.portfolioTitle || 'Portfolio & Besondere Erfolge',
        subtitle: activeTranslations.ui?.portfolioSubtitle || 'Besondere Lernmomente und dokumentierte Erfolge'
      });
    }

    // Slide: Goals & Agreements
    if (visibleSlidesConfig.ziele !== false) {
      list.push({
        type: 'ziele',
        title: activeTranslations.ui?.goalsTitle || 'Ziele & Vereinbarungen',
        subtitle: sem === '2'
          ? 'Nächste Schritte und Unterstützung gemeinsam vereinbaren'
          : activeTranslations.ui?.goalsSubtitle || 'Lernwege gemeinsam für das nächste Halbjahr planen'
      });
    }

    return list;
  }, [student, activeFaecher, app, sem, berechne, activeTranslations, kelMode, visibleSlidesConfig, hasKelAssessmentData]);

  // Clamping slideIndex when slides list changes
  useEffect(() => {
    if (slides.length > 0 && slideIndex >= slides.length) {
      setSlideIndex(slides.length - 1);
    }
  }, [slides, slideIndex]);

  // Handle arrow keys & fullscreen shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input or textarea, let the character type standardly
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }
      
      if (presentationView === 'slides') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          setSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSlideIndex(prev => Math.max(0, prev - 1));
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsFullscreen(prev => {
          if (prev) return false;
          onClose();
          return false;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [presentationView, slides, onClose]);

  const getMitarbeitStatus = (points: number, miDirekt?: number | string | null) => {
    if (miDirekt !== undefined && miDirekt !== null && miDirekt !== '') {
      const g = Number(miDirekt);
      if (g === 1) return { label: 'Hervorragend (Manuell)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', note: 'Note: 1 (Sehr gut)' };
      if (g === 2) return { label: 'Sehr aktiv (Manuell)', color: 'text-blue-700 bg-blue-50 border-blue-200', note: 'Note: 2 (Gut)' };
      if (g === 3) return { label: 'Regelmäßig (Manuell)', color: 'text-amber-700 bg-amber-50 border-amber-200', note: 'Note: 3 (Befriedigend)' };
      if (g === 4) return { label: 'Zurückhaltend (Manuell)', color: 'text-orange-700 bg-orange-50 border-orange-200', note: 'Note: 4 (Genügend)' };
      return { label: 'Ausbaufähig (Manuell)', color: 'text-rose-700 bg-rose-50 border-rose-200', note: 'Note: 5 (Nicht genügend)' };
    }

    const s = app.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' };
    if (s.mode === 'relative' && s.relative_confirmed) {
      const activeValues = app.schueler.map((st: any) => app.mitarbeit?.[st.id]?.[currentSlide?.fach]?.[sem] || 0);
      const avgScore = activeValues.length > 0 ? activeValues.reduce((a: number, b: number) => a + b, 0) / activeValues.length : 0;
      const rel = s.relative_thresholds || { 1: 20, 2: 10, 3: 0, 4: -10 };
      
      if (points >= avgScore * (1 + rel[1]/100)) return { label: 'Hervorragend', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', note: 'Note: 1 (Sehr gut)' };
      if (points >= avgScore * (1 + rel[2]/100)) return { label: 'Sehr aktiv', color: 'text-blue-700 bg-blue-50 border-blue-200', note: 'Note: 2 (Gut)' };
      if (points >= avgScore * (1 + rel[3]/100)) return { label: 'Regelmäßig', color: 'text-amber-700 bg-amber-50 border-amber-200', note: 'Note: 3 (Befriedigend)' };
      if (points >= avgScore * (1 + rel[4]/100)) return { label: 'Zurückhaltend', color: 'text-orange-700 bg-orange-50 border-orange-200', note: 'Note: 4 (Genügend)' };
      return { label: 'Unterstützung nötig', color: 'text-rose-700 bg-rose-50 border-rose-200', note: 'Note: 5 (Nicht genügend)' };
    }

    const t = s.thresholds || { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 };
    if (points >= (t[1] || 13)) return { label: 'Hervorragend', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', note: 'Note: 1 (Sehr gut)' };
    if (points >= (t[2] || 10)) return { label: 'Sehr aktiv', color: 'text-blue-700 bg-blue-50 border-blue-200', note: 'Note: 2 (Gut)' };
    if (points >= (t[3] || 7)) return { label: 'Regelmäßig', color: 'text-amber-700 bg-amber-50 border-amber-200', note: 'Note: 3 (Befriedigend)' };
    if (points >= (t[4] || 4)) return { label: 'Zurückhaltend', color: 'text-orange-700 bg-orange-50 border-orange-200', note: 'Note: 4 (Genügend)' };
    return { label: 'Unterstützung nötig', color: 'text-rose-700 bg-rose-50 border-rose-200', note: 'Note: 5 (Nicht genügend)' };
  };

  const currentSlide = slides[Math.max(0, Math.min(slideIndex, slides.length - 1))] || slides[0];

  // Helper colors based on subject name
  const getSubjectMeta = (fachName: string) => {
    switch (fachName) {
      case 'Deutsch':
        return { color: 'border-red-400 bg-red-50 text-red-700', icon: <BookOpen className="text-red-500 shrink-0" size={24} /> };
      case 'Mathematik':
        return { color: 'border-blue-400 bg-blue-50 text-blue-700', icon: <Calculator className="text-blue-500 shrink-0" size={24} /> };
      case 'Sachunterricht':
        return { color: 'border-emerald-400 bg-emerald-50 text-emerald-700', icon: <Compass className="text-emerald-500 shrink-0" size={24} /> };
      default:
        return { color: 'border-indigo-400 bg-indigo-50 text-indigo-700', icon: <Award className="text-indigo-500 shrink-0" size={24} /> };
    }
  };

  // Recharts custom styling helpers
  const getGradeColor = (g: number) => {
    if (g <= 1.5) return '#10b981'; // Emerald
    if (g <= 2.5) return '#3b82f6'; // Blue
    if (g <= 3.5) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const studentLogs = (app.statusLog || []).filter((l: any) => l.schuelerId === student.id).sort((a: any, b: any) => b.timestamp - a.timestamp);
  const stages = app.behavior_stages || [
    { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
    { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
    { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
    { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
    { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
  ];
  let streak = 0;
  let streakValid = true;
  for (let i = 0; i < studentLogs.length; i++) {
    const sIndex = stages.findIndex((st: any) => st.id === studentLogs[i].iconId);
    if (sIndex === 0 || sIndex === 1) {
      if (streakValid) streak++;
    } else {
      streakValid = false;
      break;
    }
  }

  return (
    <div className={`fixed inset-0 z-[99999] flex flex-col selection:bg-indigo-100 print:bg-white print:overflow-visible print:p-0 print:m-0 print:static print:h-auto print:w-full ${
      isFullscreen ? 'bg-slate-950  w-screen h-screen' : 'bg-stone-100 overflow-y-auto'
    }`}>
      {/* GLOBAL PRINT STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html, #root {
            background: white !important;
            color: #0f172a !important;
            overflow: visible !important;
            height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            position: static !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .print-bento-grid {
            display: block !important;
          }
          .print-card {
            background: white !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            margin-bottom: 24px !important;
            padding: 16px !important;
            page-break-inside: avoid !important;
          }
          .print-page-break {
            page-break-before: always !important;
          }
          .text-gradient {
            background: none !important;
            color: #0f172a !important;
            -webkit-text-fill-color: initial !important;
          }
        }
      ` }} />

      {/* TOPBAR HEADER - Hidden in Fullscreen */}
      {!isFullscreen && (
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between z-50 shadow-xs no-print">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-all hover:scale-105 active:scale-95"
              title="Präsentation beenden (ESC)"
            >
              <X size={18} />
            </button>
            <div className="text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <h2 className="text-[0.75rem] leading-tight font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <GraduationCap size={16} /> KEL-Präsentation • {student.vorname} {student.nachname}
                </h2>
                <span className="inline-flex items-center gap-1 text-[0.5625rem] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200" title="Aktueller Stand der präsentierten Noten und Daten">
                  <Clock size={10} /> Datenstand: {lastDataUpdate.toLocaleDateString('de-DE')} {lastDataUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[0.625rem] text-slate-500 font-bold mt-0.5">Gemeinsames Eltern-Schüler-Lehrer Gespräch</p>
            </div>
          </div>

          {/* HYBRID VIEW SWITCHER */}
          <div className="flex bg-slate-100 p-1 rounded-xl items-center self-center shrink-0">
            <button
              onClick={() => setPresentationView('slides')}
              className={`px-3.5 py-1.5 rounded-lg text-[0.75rem] leading-tight font-black leading-none uppercase tracking-wider transition-all cursor-pointer ${
                presentationView === 'slides' 
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📋 PPT Folien
            </button>
            <button
              onClick={() => setPresentationView('dossier')}
              className={`px-3.5 py-1.5 rounded-lg text-[0.75rem] leading-tight font-black leading-none uppercase tracking-wider transition-all cursor-pointer ${
                presentationView === 'dossier' 
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📊 Gesamt-Dossier
            </button>
          </div>

          {/* KEL PRESENTATION SCOPE SWITCHER */}
          <div className="flex bg-slate-100 p-1 rounded-xl items-center self-center shrink-0">
            <button
              onClick={() => {
                setKelMode('einfach');
                localStorage.setItem('kel_presentation_mode', 'einfach');
              }}
              className={`px-3 py-1.5 rounded-lg text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                kelMode === 'einfach' 
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Einfach-Modus: Zeigt nur die wesentlichen Kernfolien"
            >
              🌱 Einfach
            </button>
            <button
              onClick={() => {
                setKelMode('experte');
                localStorage.setItem('kel_presentation_mode', 'experte');
              }}
              className={`px-3 py-1.5 rounded-lg text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                kelMode === 'experte' 
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Experten-Modus: Zeigt alle Details und zusätzliche Seiten"
            >
              ⚡ Experte
            </button>
            <button
              onClick={() => setShowConfigDrawer(true)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 ml-1 transition-all cursor-pointer flex items-center justify-center"
              title="Foliensichtbarkeit individuell anpassen"
            >
              ⚙️
            </button>
          </div>

          {/* Presenting language switcher for DAZ children */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs max-w-full">
            <span className="text-[0.625rem] font-black uppercase text-slate-400 pl-1.5 pr-1 flex items-center gap-1">
              🌐 <span className="hidden md:inline">SPRACHE / LANGUAGE:</span>
            </span>
            {getSuggestedLanguages().map((langObj) => (
              <button
                key={langObj.id}
                onClick={() => setSelectedLang(langObj.id)}
                className={`px-2 py-1 rounded-lg text-[0.75rem] leading-tight font-bold transition-all flex items-center gap-1 cursor-pointer hover:scale-105 ${
                  selectedLang === langObj.id
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={langObj.label}
              >
                <span>{langObj.flag}</span>
                <span className="text-[0.625rem] font-black">{langObj.num}</span>
              </button>
            ))}
            {isTranslating && (
              <span className="inline-flex items-center gap-1 text-[0.625rem] text-indigo-600 animate-pulse font-bold px-2">
                <RefreshCw size={10} className="animate-spin" /> KI übersetzt...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[0.625rem] uppercase tracking-wider rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 shadow-xs"
              title="Auf Vollbild vergrößern"
            >
              <Maximize2 size={13} /> <span>Vollbild</span>
            </button>
            
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[0.625rem] uppercase tracking-wider rounded-xl transition-all"
            >
              Beenden
            </button>
          </div>
        </div>
      )}

      {/* RENDER MODE A: SLIDES VIEW */}
      {presentationView === 'slides' && (
        <div 
          id="kel-slides-container"
          ref={slidesContainerRef}
          tabIndex={0}
          className={`flex flex-col justify-between select-none no-print bg-slate-950 relative focus:outline-none ${
            isFullscreen 
              ? 'fixed inset-0 z-[99999] w-screen h-screen p-4 sm:p-6 md:p-8' 
              : 'flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto min-h-0'
          }`}
        >
          
          {/* Progress Indicators / Floating Ribbon in Fullscreen */}
          <div className="flex items-center justify-between text-[0.6875rem] font-black tracking-widest text-slate-500 uppercase pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span>{isFullscreen ? '📺 VOLLBILD-PRÄSENTATION' : 'KEL MODERATIONS-MODUS'}</span>
              
              {/* PRESENTATION MODE CONTROLLER */}
              <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg items-center shrink-0">
                <button
                  onClick={() => {
                    setKelMode('einfach');
                    localStorage.setItem('kel_presentation_mode', 'einfach');
                  }}
                  className={`px-2 py-0.5 rounded text-[0.5625rem] font-black transition-all cursor-pointer ${
                    kelMode === 'einfach' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Einfach-Modus: Nur Kernfolien anzeigen"
                >
                  🌱 Einfach
                </button>
                <button
                  onClick={() => {
                    setKelMode('experte');
                    localStorage.setItem('kel_presentation_mode', 'experte');
                  }}
                  className={`px-2 py-0.5 rounded text-[0.5625rem] font-black transition-all cursor-pointer ${
                    kelMode === 'experte' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Experten-Modus: Alle Bereiche anzeigen"
                >
                  ⚡ Experte
                </button>
                <button
                  onClick={() => setShowConfigDrawer(true)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white ml-0.5 transition-all text-[0.5625rem] cursor-pointer"
                  title="Foliensichtbarkeit individuell anpassen"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* INTERAKTIVER REDEZEIT-TIMER */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 text-slate-300 px-3 py-1 rounded-full gap-2 shadow-xs shrink-0 self-center">
              <div className="flex items-center gap-1.5 pr-1 border-r border-slate-800 mr-1">
                <span className={`font-mono text-[0.75rem] leading-tight font-black tracking-normal transition-colors leading-none flex items-center gap-1 ${
                  timerSeconds === 0 
                    ? 'text-rose-500 animate-bounce' 
                    : timerSeconds < 125 
                      ? 'text-amber-500 animate-pulse' 
                      : 'text-emerald-400'
                }`}>
                  <span className={`${timerActive ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }}>⏱️</span> {formatTimerTime(timerSeconds)}
                </span>
                
                {timerSeconds === 0 && (
                  <span className="text-[0.5rem] bg-rose-500 text-white font-black px-1 py-0.5 rounded animate-pulse">ZEIT UM!</span>
                )}
              </div>

              {/* Presets */}
              <div className="hidden sm:flex items-center gap-1">
                {[10, 15, 20].map(mins => (
                  <button
                    key={mins}
                    onClick={() => {
                      setTimerSeconds(mins * 60);
                      setTimerInitial(mins * 60);
                      setTimerActive(false);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[0.5rem] font-black transition-all cursor-pointer ${
                      timerInitial === mins * 60 
                        ? 'bg-indigo-600 text-white border border-indigo-500' 
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-705 border border-transparent'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                
                <button
                  onClick={() => setTimerSeconds(prev => prev + 60)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[0.5rem] font-black cursor-pointer"
                  title="+1 Minute"
                >
                  +1m
                </button>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className={`p-1 rounded-full transition-all cursor-pointer ${
                    timerActive 
                      ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30' 
                      : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                  }`}
                  title={timerActive ? 'Pause' : 'Start'}
                >
                  {timerActive ? <span className="text-[0.625rem] px-1 font-black leading-none">⏸</span> : <span className="text-[0.625rem] px-1 font-black leading-none">▶</span>}
                </button>
                
                <button
                  onClick={() => {
                    setTimerSeconds(timerInitial);
                    setTimerActive(false);
                  }}
                  className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full cursor-pointer transition-all"
                  title="Zurücksetzen"
                >
                  <span className="text-[0.625rem] px-1 font-black leading-none">🔄</span>
                </button>
              </div>
            </div>
            
            {/* Dark themed presenting language switcher for slides/fullscreen */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-800 rounded-full p-0.5 shadow-sm max-w-[280px] sm:max-w-none">
              {getSuggestedLanguages().map((langObj) => (
                <button
                  key={langObj.id}
                  onClick={() => setSelectedLang(langObj.id)}
                  className={`px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
                    selectedLang === langObj.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={langObj.label}
                >
                  <span>{langObj.flag}</span>
                  <span className="text-[0.5rem] font-black">{langObj.num}</span>
                </button>
              ))}
              {isTranslating && (
                <span className="inline-flex items-center gap-0.5 text-[0.5rem] text-indigo-400 animate-pulse font-bold px-1.5">
                  <RefreshCw size={8} className="animate-spin" /> KI...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <span className="hidden md:flex items-center gap-1.5 text-slate-500 text-[0.625rem] font-bold border border-slate-800 rounded-full px-3 py-1 mr-2" title="Aktueller Stand der Daten">
                <Clock size={10} /> Datenstand: {lastDataUpdate.toLocaleDateString('de-DE')}
              </span>
              <button
                onClick={() => exportSchuelerPDF(student.id, app)}
                className="hidden sm:flex px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-full text-[0.625rem] font-bold transition-all uppercase items-center gap-1.5 cursor-pointer shadow-md mr-1"
                title="Dossier als PDF exportieren (Handout)"
              >
                <Printer size={11} />
                <span>Handout PDF</span>
              </button>
              <span className="bg-slate-900 text-slate-300 border border-slate-850 px-3.5 py-1 rounded-full text-[0.625rem] font-bold">
                Folie {slideIndex + 1} von {slides.length}
              </span>
              
              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-full text-[0.625rem] font-bold transition-all uppercase flex items-center gap-1 cursor-pointer shadow-md"
                  title="Vollbild beenden (ESC)"
                >
                  <Minimize2 size={11} />
                  <span>Vollbild beenden</span>
                </button>
              )}
            </div>
          </div>

          {/* Current Slide Container - Dynamic size depending on screen size and fullscreen */}
          <div className={`bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] relative flex flex-col justify-between w-full mx-auto shrink-0 transition-all duration-300 ${
            isFullscreen 
              ? 'h-[calc(100vh-110px)] max-h-[92vh] overflow-y-auto custom-scrollbar' 
              : 'h-[680px] md:h-[725px] lg:h-[765px] overflow-y-auto custom-scrollbar'
          }`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/5 to-purple-500/0 blur-[60px] pointer-events-none rounded-full" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideIndex}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col justify-start h-full"
                >
                  <SlideErrorBoundary
                    onReset={handleRepairIkmData}
                    onSkip={() => {
                      if (slideIndex < slides.length - 1) {
                        setSlideIndex(prev => prev + 1);
                      } else {
                        onClose();
                      }
                    }}
                  >
                {/* 1. COVER SLIDE */}
                {currentSlide.type === 'cover' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6 h-full">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center text-5xl font-black shadow-lg shadow-indigo-500/20 relative animate-pulse">
                      {student.vorname?.[0]}{student.nachname?.[0]}
                      <div className="absolute -bottom-1 -right-1 bg-white text-emerald-600 p-2 rounded-full border border-slate-100 shadow-sm">
                        <Rocket size={18} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                        {currentSlide.title}
                      </h1>
                      <p className="text-[1.25rem] leading-normal font-medium text-indigo-600 italic">
                        {currentSlide.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <span className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-full text-[0.75rem] leading-tight uppercase tracking-wider">
                        Klasse {app.classes?.find((c: any) => c.id === app.activeClassId)?.name || 'Klasse'}
                      </span>
                      {gesamtSchnitt !== null && (
                        <span className="px-4 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-full text-[0.75rem] leading-tight uppercase tracking-wider">
                          Schnitt: {gesamtSchnitt.toFixed(1)}
                        </span>
                      )}
                      <span className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-full text-[0.75rem] leading-tight uppercase tracking-wider">
                        Schuljahr: {app.schuljahr || '2026'}
                      </span>
                      <span className="px-4 py-1.5 bg-violet-50 border border-violet-100 text-violet-700 font-bold rounded-full text-[0.75rem] leading-tight uppercase tracking-wider">
                        {sem}. Semester
                      </span>
                    </div>

                    {/* Leitstern quote block */}
                    <div className="max-w-xl bg-orange-50/40 border border-orange-150 p-4 rounded-2xl text-left mt-6 relative">
                      <span className="text-4xl text-orange-300 absolute -top-1 left-2 select-none font-serif leading-none">“</span>
                      <p className="text-slate-700 font-semibold text-[0.875rem] leading-snug leading-relaxed pl-5 pr-2 pt-1 italic">
                        {highlightStrength}
                      </p>
                      <span className="text-[0.5625rem] uppercase font-black text-orange-600 mt-2 block pl-5 tracking-widest">
                        PÄDAGOGISCHER LEITSTERN
                      </span>
                    </div>
                  </div>
                )}

                {currentSlide.type === 'overview' && (
                  <div className="flex-1 flex flex-col h-full justify-center space-y-6">
                    <div className="text-center">
                      <span className="inline-flex px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[0.625rem] font-black uppercase tracking-wider">
                        Startpunkt für unser Gespräch
                      </span>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-3">{currentSlide.title}</h2>
                      <p className="text-base font-bold text-slate-500 mt-2">{currentSlide.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
                      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-5 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center">
                            <GraduationCap size={20} />
                          </div>
                          <div>
                            <p className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-600">Lernstand</p>
                            <p className="text-xl font-black text-slate-900">
                              {gesamtSchnitt !== null ? `Notenschnitt ${gesamtSchnitt.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Noch keine Noten erfasst'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-3">
                          {gesamtSchnitt !== null ? `Berechnet aus ${activeGradesToRender.length} benoteten Fächern.` : 'Dieser Bereich füllt sich automatisch aus der Notenmappe.'}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Clock size={20} />
                          </div>
                          <div>
                            <p className="text-[0.625rem] font-black uppercase tracking-wider text-emerald-700">Anwesenheit</p>
                            <p className="text-xl font-black text-slate-900">
                              {attendance.hasData ? `${attendance.total} Fehlstunden` : 'Noch nicht erfasst'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-3">
                          {attendance.hasData ? `${attendance.excused} entschuldigt · ${attendance.unexcused} unentschuldigt` : 'Ohne Einträge wird keine Aussage zur Anwesenheit getroffen.'}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-amber-100 text-amber-600 flex items-center justify-center">
                            <Heart size={20} />
                          </div>
                          <div>
                            <p className="text-[0.625rem] font-black uppercase tracking-wider text-amber-700">Schulalltag</p>
                            <p className="text-xl font-black text-slate-900">
                              {behaviorSummary.hasData ? behaviorStage.label : 'Noch keine Beobachtungen'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-3">
                          {behaviorSummary.hasData ? `${behaviorSummary.logs.length} dokumentierte ${behaviorSummary.logs.length === 1 ? 'Beobachtung' : 'Beobachtungen'}.` : 'Wir bewerten nicht automatisch, wenn keine Beobachtungen vorliegen.'}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-violet-100 bg-violet-50/40 p-5 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-violet-100 text-violet-600 flex items-center justify-center">
                            <Target size={20} />
                          </div>
                          <div>
                            <p className="text-[0.625rem] font-black uppercase tracking-wider text-violet-700">Nächster Schritt</p>
                            <p className="text-lg font-black text-slate-900">
                              {latestKel?.vereinbarungen?.trim() || 'Gemeinsam im Gespräch festlegen'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-3">Am Ende halten Kind, Eltern und Lehrperson eine klare Vereinbarung fest.</p>
                      </div>
                    </div>

                    <p className="text-center text-xs font-bold text-slate-400">
                      Fehlende Daten werden bewusst als „noch nicht erfasst“ angezeigt und nicht automatisch bewertet.
                    </p>
                  </div>
                )}

                {/* 2. BADGES SLIDE */}
                {currentSlide.type === 'badges' && (
                  <div className="flex-1 flex flex-col justify-center h-full space-y-10 py-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-none">
                        {currentSlide.title}
                      </h2>
                      <p className="text-[1.25rem] leading-normal font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                        {currentSlide.subtitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto px-4 w-full">
                      {currentSlide.badges?.map((badge: any, idx: number) => {
                        const colors = ['from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500', 'from-indigo-400 to-purple-500', 'from-rose-400 to-pink-500', 'from-cyan-400 to-blue-500'];
                        const bgGradient = colors[idx % colors.length];
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.15, type: 'spring', bounce: 0.4 }}
                            className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all group"
                          >
                            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${bgGradient} text-white flex items-center justify-center text-5xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              {badge.icon}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 leading-tight">
                              {badge.name}
                            </h3>
                            {badge.date && (
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2 bg-slate-50 px-3 py-1 rounded-full">
                                Verliehen am {new Date(badge.date).toLocaleDateString()}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. SUBJECT DETAIL SLIDE */}
                {currentSlide.type === 'subject' && (() => {
                  const sColors = getSubjectMeta(currentSlide.fach);
                  return (
                    <div className="flex-1 flex flex-col justify-between h-full space-y-6">
                      
                      {/* Subject Slide Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${currentSlide.isPriority ? 'bg-amber-50 border-amber-200 shadow-2xs' : 'bg-indigo-50 border-indigo-100'}`}>
                            {sColors.icon}
                          </div>
                          <div className="text-left">
                            {currentSlide.isPriority ? (
                              <span className="text-[0.5625rem] font-black uppercase text-amber-700 tracking-wider bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 px-2.5 py-1 rounded-md border border-amber-300 flex items-center gap-1">
                                <Star size={10} className="fill-amber-500 stroke-amber-600" /> {activeTranslations.ui?.prioSubject || 'WICHTIGES KERNFACH'}
                              </span>
                            ) : (
                              <span className="text-[0.5625rem] font-black uppercase text-indigo-700 tracking-wider bg-indigo-100/60 px-2 py-0.5 rounded-md">
                                {activeTranslations.ui?.fachFocus || 'Fach-Fokus'}
                              </span>
                            )}
                            <h2 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight">{activeTranslations.subjects[currentSlide.fach] || currentSlide.fach}</h2>
                          </div>
                        </div>

                        {currentSlide.avgGrade !== null ? (
                          <div className="text-right flex items-center gap-2.5">
                            <div>
                              <span className="text-[1.5rem] leading-normal font-black text-slate-800 block leading-none">
                                {Number(currentSlide.avgGrade).toFixed(1)}
                              </span>
                              <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-widest">{activeTranslations.ui?.subjectAverage || 'DURCHSCHNITT'}</span>
                            </div>
                            <span 
                              className="w-4 h-4 rounded-full border border-white" 
                              style={{ backgroundColor: getGradeColor(Number(currentSlide.avgGrade)) }} 
                            />
                          </div>
                        ) : (
                          <span className="text-[0.75rem] leading-tight text-slate-400 font-bold italic uppercase tracking-wider bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">{activeTranslations.ui?.noGrade || 'Keine Noten'}</span>
                        )}
                      </div>

                      {/* Subject Presentation Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 items-stretch">
                        
                        {/* LEFT COLUMN: GRADES PROFILE */}
                        <div className="md:col-span-5 flex flex-col justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4 text-left">
                          
                          {/* Grade chips grouped */}
                          <div className="space-y-4">
                            <h3 className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-wider">Einzelne Leistungsnachweise</h3>
                            <div className="grid grid-cols-1 gap-3">
                              <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3.5 shadow-3xs flex flex-col gap-1.5 hover:scale-[1.01] transition-all">
                                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-indigo-600 block pb-0.5">Schularbeiten</span>
                                {currentSlide.studentSa.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {currentSlide.studentSa.map((g: any, idx: number) => (
                                      <span key={idx} className="w-7 h-7 border rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700 text-[0.875rem] font-black flex items-center justify-center shadow-3xs hover:scale-105 transition-transform">
                                        {g}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[0.625rem] text-slate-400 italic">Keine Schularbeiten erfasst</span>
                                )}
                              </div>
                              
                              <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3.5 shadow-3xs flex flex-col gap-1.5 hover:scale-[1.01] transition-all">
                                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-emerald-600 block pb-0.5">Wochenplanergebnisse</span>
                                {currentSlide.studentWp.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {currentSlide.studentWp.map((g: any, idx: number) => (
                                      <span key={idx} className="px-2 h-6 border rounded-lg bg-emerald-50 text-[0.7rem] font-black text-emerald-700 border-emerald-100 flex items-center justify-center shadow-3xs hover:scale-105 transition-transform">
                                        WP: {g}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[0.625rem] text-slate-400 italic">Keine Wochenpläne erfasst</span>
                                )}
                              </div>

                              <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3.5 shadow-3xs flex flex-col gap-1.5 hover:scale-[1.01] transition-all">
                                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-pink-600 block pb-0.5">Lernkontrollen & Tests</span>
                                {currentSlide.studentLzk.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {currentSlide.studentLzk.map((g: any, idx: number) => (
                                      <span key={idx} className="px-2 h-6 border rounded-lg bg-pink-50 text-[0.7rem] font-black text-pink-700 border-pink-100 flex items-center justify-center shadow-3xs hover:scale-105 transition-transform">
                                        {g}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[0.625rem] text-slate-400 italic">Keine Tests erfasst</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Mitarbeit Block & Missed homework */}
                          <div className="border-t border-slate-200/60 pt-3 space-y-2.5">
                            <h3 className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-wider">Mitarbeit & Arbeitsorganisation</h3>
                            
                            <div className="flex flex-col gap-2.5">
                              {/* Mitarbeit points card */}
                              {currentSlide.hasParticipationData ? (
                              <div className="bg-white p-3 rounded-xl border border-slate-150 text-left relative shadow-2xs">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[0.5rem] font-black uppercase text-indigo-500 tracking-wider block">Unterrichtsmitarbeit</span>
                                    <div className="text-[1.125rem] leading-normal font-black text-slate-900 pt-0.5 flex items-baseline gap-1">
                                      {currentSlide.miDirekt !== undefined && currentSlide.miDirekt !== null && currentSlide.miDirekt !== '' ? (
                                        <>Note {currentSlide.miDirekt} <span className="text-[0.5625rem] font-normal text-slate-500">(Manuelle Note)</span></>
                                      ) : (
                                        <>{currentSlide.miPoints} <span className="text-[0.5625rem] font-normal text-slate-500">Mitarbeitspunkte</span></>
                                      )}
                                    </div>
                                  </div>
                                  {(() => {
                                    const status = getMitarbeitStatus(currentSlide.miPoints, currentSlide.miDirekt);
                                    return (
                                      <span className={`px-2 py-0.5 rounded-md text-[0.5rem] font-bold border ${status.color}`}>
                                        {status.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                
                                {/* Visual progress meter bar */}
                                <div className="w-full bg-slate-100 h-1 rounded-full  mt-2 border border-slate-100">
                                  <div 
                                    className="h-full rounded-full bg-indigo-600 transition-all" 
                                    style={{ 
                                      width: `${
                                        currentSlide.miDirekt !== undefined && currentSlide.miDirekt !== null && currentSlide.miDirekt !== ''
                                          ? (6 - Number(currentSlide.miDirekt)) * 20 
                                          : Math.min(100, (currentSlide.miPoints / 15) * 100)
                                      }%` 
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[0.5rem] font-semibold text-slate-400 mt-1">
                                  <span>
                                    {currentSlide.miDirekt !== undefined && currentSlide.miDirekt !== null && currentSlide.miDirekt !== '' ? 'Klassen-Ø Mitarbeiternote' : 'Klassen-Ø Mitarbeitspunkte'}: {(() => {
                                      const fach = currentSlide.fach;
                                      const vals = app.schueler.map((s: any) => {
                                        if (currentSlide.miDirekt !== undefined && currentSlide.miDirekt !== null && currentSlide.miDirekt !== '') {
                                          return app.noten?.[s.id]?.[fach]?.[sem]?.miDirekt !== undefined && app.noten?.[s.id]?.[fach]?.[sem]?.miDirekt !== null 
                                            ? Number(app.noten?.[s.id]?.[fach]?.[sem]?.miDirekt) 
                                            : getMitarbeitNumGrade(app.mitarbeit?.[s.id]?.[fach]?.[sem] || 0, s.id, fach);
                                        } else {
                                          return app.mitarbeit?.[s.id]?.[fach]?.[sem] || 0;
                                        }
                                      }).filter((val: number) => !isNaN(val));
                                      return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : '0';
                                    })()}
                                  </span>
                                  <span className="text-indigo-600 font-bold">{getMitarbeitStatus(currentSlide.miPoints, currentSlide.miDirekt).note}</span>
                                </div>
                              </div>
                              ) : (
                                <div className="bg-white p-3 rounded-xl border border-dashed border-slate-200 text-left shadow-2xs">
                                  <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider block">Unterrichtsmitarbeit</span>
                                  <div className="text-[0.75rem] font-black text-slate-600 pt-1">Noch nicht erfasst</div>
                                  <p className="text-[0.5625rem] text-slate-400 font-semibold mt-1">Ohne Eintrag wird keine Note oder Bewertung berechnet.</p>
                                </div>
                              )}

                              {/* Absence homework counts */}
                              {(currentSlide.fach === 'Deutsch' || 
                                currentSlide.fach === 'Mathematik' || 
                                currentSlide.fach === 'Sachunterricht' ||
                                currentSlide.fach === 'D' ||
                                currentSlide.fach === 'M' ||
                                currentSlide.fach === 'SU') && currentSlide.hasHomeworkData && (
                              <div className="bg-white p-3 rounded-xl border border-slate-150 text-left relative  shadow-2xs">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[0.5rem] font-black uppercase text-amber-500 tracking-wider block">Hausübungen fehlt</span>
                                    <div className={`text-[1.125rem] leading-normal font-black pt-0.5 ${currentSlide.hueCount > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                      {currentSlide.hueCount} <span className="text-[0.5625rem] font-normal text-slate-500">mal</span>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-md text-[0.5rem] font-bold border ${currentSlide.hueCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                    {currentSlide.hueCount > 0 ? 'Rückstand' : 'Lückenlos'}
                                  </span>
                                </div>
                                {/* Visual progress meter bar for Hausübungen */}
                                <div className="w-full bg-slate-100 h-1 rounded-full  mt-2 border border-slate-100">
                                  <div 
                                    className={`h-full rounded-full transition-all ${currentSlide.hueCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${Math.max(0, 100 - (currentSlide.hueCount * 20))}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[0.5rem] font-semibold text-slate-400 mt-1">
                                  <span>{currentSlide.hueCount > 0 ? 'Bitte zeitnah nachreichen.' : 'Hervorragende Sorgfalt und Verlässlichkeit!'}</span>
                                  <span className={currentSlide.hueCount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-700 font-black'}>
                                    {currentSlide.hueCount > 0 ? `${currentSlide.hueCount} offen` : 'Lückenlos'}
                                  </span>
                                </div>
                              </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: COMPARATIVE DIAGRAM WITH OPTIONS */}
                        <div className="md:col-span-7 flex flex-col justify-between space-y-3 text-left">
                          
                          {/* Diagram Format Selector tabs */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-[0.75rem] leading-tight font-black uppercase text-slate-500 tracking-wider">Leistung im Klassenvergleich</span>
                            
                             {/* Graphic visual option controller */}
                             <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[0.625rem]">
                               <button 
                                 onClick={() => setSelectedChartType('area')}
                                 className={`px-2 py-1 rounded-md font-bold transition-all ${selectedChartType === 'area' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                               >
                                 📐 Fläche
                               </button>
                               <button 
                                 onClick={() => setSelectedChartType('line')}
                                 className={`px-2 py-1 rounded-md font-bold transition-all ${selectedChartType === 'line' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                               >
                                 📈 Linie
                               </button>
                               <button 
                                 onClick={() => setSelectedChartType('column')}
                                 className={`px-2 py-1 rounded-md font-bold transition-all ${selectedChartType === 'column' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                               >
                                 📊 Säule
                               </button>
                               <button 
                                 onClick={() => setSelectedChartType('bar')}
                                 className={`px-2 py-1 rounded-md font-bold transition-all ${selectedChartType === 'bar' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                               >
                                 ➖ Balken
                               </button>
                               <button 
                                 onClick={() => setSelectedChartType('pie')}
                                 className={`px-2 py-1 rounded-md font-bold transition-all ${selectedChartType === 'pie' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                               >
                                 🍕 Kuchen
                               </button>
                             </div>
                          </div>

                          {/* Comparative Graphics Display Area */}
                          <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 flex-1 flex items-center justify-center min-h-[220px]">
                            {currentSlide.detailsChartData.length > 0 ? (
                              <>
                                <div className={`w-full ${isFullscreen ? 'h-[460px] lg:h-[520px]' : 'h-96 md:h-[400px] lg:h-[440px]'}`}>
                                <ResponsiveContainer width="100%" height="100%">
                                  {selectedChartType === 'column' ? (
                                    (() => {
                                      const mappedData = currentSlide.detailsChartData.map((d: any) => ({
                                        ...d,
                                        'Du': d['Du'] !== null ? Number(d['Du'].toFixed(2)) : null,
                                        'Klasse Ø': d['Klasse Ø'] !== null ? Number(d['Klasse Ø'].toFixed(2)) : null,
                                        originalDu: d['Du'],
                                        originalKlasse: d['Klasse Ø']
                                      }));
                                      return (
                                        <BarChart key={`${slideIndex}_column`} data={mappedData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                          <XAxis dataKey="name" stroke="#64748b" fontSize={13} fontWeight="bold" tickLine={false} interval={0} />
                                          <YAxis 
                                            stroke="#64748b" 
                                            fontSize={13} 
                                            ticks={[1,2,3,4,5]} 
                                            domain={[1, 5]} 
                                            tickLine={false} 
                                            reversed
                                          />
                                          <Tooltip 
                                            contentStyle={{ fontSize: 12, borderRadius: '8px' }} 
                                            formatter={(value: any, name: any) => [value ? value.toFixed(2) : '—', name]}
                                          />
                                          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                                          <Bar dataKey="Du" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={true} animationDuration={600} />
                                          <Bar dataKey="Klasse Ø" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={true} animationDuration={600} />
                                        </BarChart>
                                      );
                                    })()
                                  ) : selectedChartType === 'bar' ? (
                                    (() => {
                                      const mappedData = currentSlide.detailsChartData.map((d: any) => ({
                                        ...d,
                                        'Du': d['Du'] !== null ? Number(d['Du'].toFixed(2)) : null,
                                        'Klasse Ø': d['Klasse Ø'] !== null ? Number(d['Klasse Ø'].toFixed(2)) : null,
                                        originalDu: d['Du'],
                                        originalKlasse: d['Klasse Ø']
                                      }));
                                      return (
                                        <BarChart key={`${slideIndex}_bar`} layout="vertical" data={mappedData} margin={{ top: 15, right: 15, left: 65, bottom: 10 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                          <XAxis 
                                            type="number" 
                                            stroke="#64748b" 
                                            fontSize={13} 
                                            domain={[1, 5]} 
                                            ticks={[1, 2, 3, 4, 5]} 
                                            tickLine={false} 
                                            reversed
                                          />
                                          <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={13} fontWeight="bold" tickLine={false} interval={0} />
                                          <Tooltip 
                                            contentStyle={{ fontSize: 12, borderRadius: '8px' }} 
                                            formatter={(value: any, name: any) => [value ? value.toFixed(2) : '—', name]}
                                          />
                                          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                                          <Bar dataKey="Du" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={36} isAnimationActive={true} animationDuration={600} />
                                          <Bar dataKey="Klasse Ø" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={36} isAnimationActive={true} animationDuration={600} />
                                        </BarChart>
                                      );
                                    })()
                                  ) : selectedChartType === 'line' ? (
                                    <LineChart key={`${slideIndex}_line`} data={currentSlide.detailsChartData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                      <XAxis dataKey="name" stroke="#64748b" fontSize={13} fontWeight="bold" tickLine={false} interval={0} />
                                      <YAxis stroke="#64748b" fontSize={13} ticks={[1,2,3,4,5]} domain={[1, 5]} reversed tickLine={false} />
                                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                                      <Line type="monotone" dataKey="Du" stroke="#4f46e5" strokeWidth={4} dot={{ r: 7 }} isAnimationActive={true} animationDuration={600} />
                                      <Line type="monotone" dataKey="Klasse Ø" stroke="#94a3b8" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 5 }} isAnimationActive={true} animationDuration={600} />
                                    </LineChart>
                                  ) : selectedChartType === 'area' ? (
                                    <AreaChart key={`${slideIndex}_area`} data={currentSlide.detailsChartData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                                      <defs>
                                        <linearGradient id="colorDuSlide" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                      <XAxis dataKey="name" stroke="#64748b" fontSize={13} fontWeight="bold" tickLine={false} interval={0} />
                                      <YAxis stroke="#64748b" fontSize={13} ticks={[1,2,3,4,5]} domain={[1, 5]} reversed tickLine={false} />
                                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                                      <Area type="monotone" dataKey="Du" stroke="#4f46e5" strokeWidth={3.5} fillOpacity={1} fill="url(#colorDuSlide)" baseValue={5} isAnimationActive={true} animationDuration={600} />
                                      <Area type="monotone" dataKey="Klasse Ø" stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="3 3" fillOpacity={0} isAnimationActive={true} animationDuration={600} />
                                    </AreaChart>
                                  ) : (
                                    // PIE DIAS - Grade categories ratios
                                    (() => {
                                      const totalCount = currentSlide.studentSa.length + currentSlide.studentWp.length + currentSlide.studentLzk.length;
                                      const ratioData = [
                                        { name: 'Sehr gut / Gut (1-2)', value: [...currentSlide.studentSa, ...currentSlide.studentWp, ...currentSlide.studentLzk].filter((g: any) => Number(g) <= 2).length, color: '#10b981' },
                                        { name: 'Befriedigend (3)', value: [...currentSlide.studentSa, ...currentSlide.studentWp, ...currentSlide.studentLzk].filter((g: any) => Number(g) === 3).length, color: '#3b82f6' },
                                        { name: 'Unterstützung (4-5)', value: [...currentSlide.studentSa, ...currentSlide.studentWp, ...currentSlide.studentLzk].filter((g: any) => Number(g) >= 4).length, color: '#f59e0b' }
                                      ].filter(d => d.value > 0);

                                      if (ratioData.length === 0) {
                                        return <div className="text-slate-400 italic text-[0.6875rem] h-full flex items-center justify-center">Noch nicht genügend Daten für Verteilung</div>;
                                      }

                                      return (
                                        <PieChart key={`${slideIndex}_pie`}>
                                          <Pie 
                                            data={ratioData} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={isFullscreen ? 80 : 65} 
                                            outerRadius={isFullscreen ? 120 : 95} 
                                            dataKey="value" 
                                            label={{ fontSize: 13, fontWeight: 'bold' }}
                                            isAnimationActive={true}
                                            animationDuration={600}
                                          >
                                            {ratioData.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                          </Pie>
                                          <Tooltip />
                                          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                                        </PieChart>
                                      );
                                    })()
                                  )}
                                </ResponsiveContainer>
                              </div>
                            </>
                          ) : (
                            <div className="text-slate-400 italic text-[0.6875rem] h-full flex items-center justify-center">Noch nicht genügend Daten für Verteilung</div>
                          )}
                        </div>
                      </div>

                               {/* PAEDAGOGISCHE BILANZ SYNC (Soft-Skills from Diagram) */}
                               <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 no-print">
                                 <div className="space-y-2">
                                   <span className="text-[0.625rem] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                     <Sparkles size={12} /> Aktuelle Stärken
                                   </span>
                                   <div className="flex flex-wrap gap-1.5">
                                     {strengths.length > 0 ? strengths.map(s => (
                                       <span key={s.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[0.6875rem] font-black rounded-lg border border-emerald-100 shadow-3xs">
                                         {s.label}
                                       </span>
                                     )) : <span className="text-[0.625rem] text-slate-400 italic">Keine expliziten Stärken im Diagramm</span>}
                                   </div>
                                 </div>
                                 <div className="space-y-2">
                                   <span className="text-[0.625rem] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                     <TrendingUp size={12} /> Fokusbereiche
                                   </span>
                                   <div className="flex flex-wrap gap-1.5">
                                     {challenges.length > 0 ? challenges.map(s => (
                                       <span key={s.id} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[0.6875rem] font-black rounded-lg border border-amber-100 shadow-3xs">
                                         {s.label}
                                       </span>
                                     )) : <span className="text-[0.625rem] text-slate-400 italic">Status Quo stabil</span>}
                                   </div>
                                 </div>
                               </div>
                      </div>
                    </div>
                  );
                })()}

                {currentSlide.type === 'ikm' && (() => {
                  const record = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id) || currentSlide?.record;
                  if (!record) return null;
                  const rawLernpfad = app.lernpfade?.[student.id];

                  // Class average computations for reference lines in chart
                  const ikmRecordsList = app.ikmRecords || [];
                  const calcClassAvg = (key: 'deutschLesenPR' | 'deutschZuhoerenPR' | 'deutschSprachbewusstseinPR') => {
                    const validScores = ikmRecordsList
                      .map((r: any) => r[key])
                      .filter((val: any) => val !== undefined && val !== null && !isNaN(Number(val)))
                      .map(Number);
                    if (validScores.length === 0) return null;
                    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
                  };
                  const avgRead = calcClassAvg('deutschLesenPR');
                  const avgListen = calcClassAvg('deutschZuhoerenPR');
                  const avgLanguage = calcClassAvg('deutschSprachbewusstseinPR');

                  // Automated Cognitive Analysis Fallbacks when not generated by AI yet
                  const fallbackData = generateFallbackAnalysis(student, record, app, sem);

                  const displayDiagnoseStaerken = record.diagnoseStaerken || fallbackData.staerken;
                  const displayDiagnoseHerausforderungen = record.diagnoseHerausforderungen || fallbackData.herausforderungen;
                  const displayLernpfad = (rawLernpfad && rawLernpfad.stationen && rawLernpfad.stationen.length > 0)
                    ? rawLernpfad
                    : { stationen: fallbackData.stationen, elternTipps: fallbackData.elternTipps };

                  return (
                    <div className="flex-1 flex flex-col justify-between h-full space-y-4">
                      {/* Header containing Subtitle and Analyser Actions */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-150 pb-3 gap-3">
                        <div className="text-left">
                          <span className="text-[0.5625rem] font-black uppercase text-rose-755 tracking-wider bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-md">
                            Diagnose & Kompetenzmessung
                          </span>
                          <h2 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight mt-1">Meine IKM<sup>PLUS</sup> Ergebnisse</h2>
                          <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5 font-sans">Individuelle Stärkenanalyse & Abenteuer-Lernpfad</p>
                        </div>

                        {/* KI Analyser Trigger Button */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={runProfileAnalysis}
                            disabled={isAnalyzingProfile}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-300 shadow-sm ${
                              isAnalyzingProfile 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 active:scale-95 text-white cursor-pointer hover:shadow-md'
                            }`}
                          >
                            {isAnalyzingProfile ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="animate-pulse" />}
                            {isAnalyzingProfile 
                              ? 'Analysiere Profil...' 
                              : (!record.diagnoseStaerken || !rawLernpfad ? 'Profil analysieren 🪄' : 'Neu analysieren 🔄')
                            }
                          </button>
                        </div>
                      </div>

                      {/* Sub-Navigation Tabs */}
                      <div className="flex border-b border-slate-100 p-0.5 bg-slate-100/60 rounded-xl max-w-md self-start">
                        <button
                          onClick={() => setIkmTab('diagnose')}
                          className={`flex-1 py-1 px-4 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-lg transition-all ${
                            ikmTab === 'diagnose'
                              ? 'bg-white text-rose-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 bg-transparent'
                          }`}
                        >
                          🔍 Diagnose & Ergebnisse
                        </button>
                        <button
                          onClick={() => setIkmTab('schatzkarte')}
                          className={`flex-1 py-1 px-4 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-lg transition-all ${
                            ikmTab === 'schatzkarte'
                              ? 'bg-white text-rose-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 bg-transparent'
                          }`}
                        >
                          🗺️ Schatzkartenpfad & Eltern-Ratgeber
                        </button>
                      </div>

                      {/* Main Slide Panel */}
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <AnimatePresence mode="wait">
                          {ikmTab === 'diagnose' ? (
                            <motion.div 
                              key="diagnose"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full"
                            >
                              {/* Left: Scores & optional Radar/Bar chart */}
                              <div className="lg:col-span-6 flex flex-col gap-4">
                                <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-150/80">
                                  <h3 className="text-[0.75rem] leading-tight font-black text-slate-700 uppercase tracking-wider mb-2.5 text-left font-sans">Gesamt-Kompetenzpunkte</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    {(record.mathematikPR !== undefined && record.mathematikPR !== null) ? (
                                      <div className="bg-white p-3.5 rounded-2xl border border-slate-150 flex items-center gap-3 text-left">
                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                          <Calculator size={20} />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[0.5rem] font-extrabold text-slate-400 uppercase leading-none block font-sans">Mathematik</span>
                                          <span className="text-[1.125rem] leading-normal font-black text-slate-800 leading-none mt-1 block font-sans">{record.mathematikPR} Pkt.</span>
                                        </div>
                                      </div>
                                    ) : null}
                                    {(record.deutschLesenPR !== undefined && record.deutschLesenPR !== null) ? (
                                      <div className="bg-white p-3.5 rounded-2xl border border-slate-150 flex items-center gap-3 text-left">
                                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                          <BookOpen size={20} />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[0.5rem] font-extrabold text-slate-400 uppercase leading-none block font-sans">Deutsch Lesen</span>
                                          <span className="text-[1.125rem] leading-normal font-black text-slate-800 leading-none mt-1 block font-sans">{record.deutschLesenPR} Pkt.</span>
                                        </div>
                                      </div>
                                    ) : null}
                                    {(record.deutschZuhoerenPR !== undefined && record.deutschZuhoerenPR !== null) ? (
                                      <div className="bg-white p-3.5 rounded-2xl border border-slate-150 flex items-center gap-3 text-left">
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                          <Smile size={20} />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[0.5rem] font-extrabold text-slate-400 uppercase leading-none block font-sans">Deutsch Zuhören</span>
                                          <span className="text-[1.125rem] leading-normal font-black text-slate-800 leading-none mt-1 block font-sans">{record.deutschZuhoerenPR} Pkt.</span>
                                        </div>
                                      </div>
                                    ) : null}
                                    {(record.deutschSprachbewusstseinPR !== undefined && record.deutschSprachbewusstseinPR !== null) ? (
                                      <div className="bg-white p-3.5 rounded-2xl border border-slate-150 flex items-center gap-3 text-left">
                                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                                          <Compass size={20} />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[0.5rem] font-extrabold text-slate-400 uppercase leading-none block font-sans">Sprachbewusstsein</span>
                                          <span className="text-[1.125rem] leading-normal font-black text-slate-800 leading-none mt-1 block font-sans">{record.deutschSprachbewusstseinPR} Pkt.</span>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                {/* Mathe / Deutsch subscores chart if present */}
                                <div className="bg-white p-4.5 rounded-3xl border border-slate-150 flex-1 flex flex-col justify-between min-h-[160px]">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <h3 className="text-[0.75rem] leading-tight font-black text-slate-700 uppercase tracking-widest text-left font-sans flex items-center gap-1.5">
                                      {ikmChartModus === 'mathe' ? '🧮 Teilbereiche Mathe' : '📚 Bereiche Deutsch'}
                                    </h3>
                                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[0.5625rem] font-black uppercase">
                                      <button
                                        type="button"
                                        onClick={() => setIkmChartModus('mathe')}
                                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                          ikmChartModus === 'mathe' 
                                            ? 'bg-white text-rose-600 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                      >
                                        Mathe
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setIkmChartModus('deutsch')}
                                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                          ikmChartModus === 'deutsch' 
                                            ? 'bg-white text-rose-600 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                      >
                                        Deutsch
                                      </button>
                                    </div>
                                  </div>

                                  <div className="h-64 mt-3 text-left">
                                    {ikmChartModus === 'mathe' ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                          key={`${slideIndex}_ikm_mathe_dynamic`}
                                          layout="vertical"
                                          data={[
                                            { name: 'Zahlen', value: getSafeNum(record.matheDetails?.zahlen, 4.2), max: 8, referenz: 3.6 },
                                            { name: 'Operationen', value: getSafeNum(record.matheDetails?.operationen, 3.8), max: 8, referenz: 3.1 },
                                            { name: 'Größen', value: getSafeNum(record.matheDetails?.groessen, 5.1), max: 8, referenz: 5.4 },
                                            { name: 'Ebene/Raum', value: getSafeNum(record.matheDetails?.ebeneRaum, 4.5), max: 8, referenz: 3.6 },
                                          ]}
                                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                                        >
                                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                          <XAxis type="number" domain={[0, 8]} fontSize={8} tickLine={false} axisLine={false} />
                                          <YAxis dataKey="name" type="category" width={80} fontSize={8} tickLine={false} axisLine={false} />
                                          <Tooltip 
                                            cursor={{ fill: 'rgba(0,0,0,0.02)' }} 
                                            content={({ active, payload }) => {
                                              if (active && payload && payload.length) {
                                                return (
                                                  <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm text-[0.625rem] font-black">
                                                    {payload[0].value} Pkt.
                                                  </div>
                                                );
                                              }
                                              return null;
                                            }}
                                          />
                                          <Bar dataKey="value" name="Erreichte Punkte" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={true} animationDuration={600} />
                                          <Bar dataKey="referenz" name="Referenzwert Österreich" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={4} isAnimationActive={true} animationDuration={600} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                          key={`${slideIndex}_ikm_deutsch_dynamic`}
                                          layout="vertical"
                                          data={[
                                            { name: 'Lesen', value: record.deutschLesenPR !== undefined && record.deutschLesenPR !== null ? Number(record.deutschLesenPR) : 58, referenz: avgRead },
                                            { name: 'Zuhören', value: record.deutschZuhoerenPR !== undefined && record.deutschZuhoerenPR !== null ? Number(record.deutschZuhoerenPR) : 60, referenz: avgListen },
                                            { name: 'Sprachbewusst.', value: record.deutschSprachbewusstseinPR !== undefined && record.deutschSprachbewusstseinPR !== null ? Number(record.deutschSprachbewusstseinPR) : 55, referenz: avgLanguage },
                                          ]}
                                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                                        >
                                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                          <XAxis type="number" domain={[0, (record.deutschLesenPR > 100 || avgRead > 100) ? 250 : 100]} fontSize={8} tickLine={false} axisLine={false} />
                                          <YAxis dataKey="name" type="category" width={80} fontSize={8} tickLine={false} axisLine={false} />
                                          <Tooltip 
                                            cursor={{ fill: 'rgba(0,0,0,0.02)' }} 
                                            content={({ active, payload }) => {
                                              if (active && payload && payload.length) {
                                                return (
                                                  <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm text-[0.625rem] font-black">
                                                    {payload[0].value} {(record.deutschLesenPR > 100 || avgRead > 100) ? 'Pkt.' : 'PR'}
                                                  </div>
                                                );
                                              }
                                              return null;
                                            }}
                                          />
                                          <Bar dataKey="value" name="Erreichte Punkte" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={true} animationDuration={600} />
                                          <Bar dataKey="referenz" name="Klassen-Durchschnitt" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={4} isAnimationActive={true} animationDuration={600} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: KI Diagnosen */}
                              <div className="lg:col-span-6 flex flex-col gap-4 text-left">
                                {displayDiagnoseStaerken && (
                                  <div className="bg-emerald-50/40 p-4.5 rounded-3xl border border-emerald-100/30 flex-1">
                                    <span className="text-[0.625rem] font-black text-emerald-700 uppercase tracking-widest block mb-1 font-sans">
                                      🌟 Das gelingt mir hervorragend (Stärkenkommentar):
                                    </span>
                                    <p className="text-[0.75rem] leading-tight font-bold leading-relaxed text-emerald-950 whitespace-pre-line font-sans">
                                      {displayDiagnoseStaerken}
                                    </p>
                                  </div>
                                )}

                                {displayDiagnoseHerausforderungen && (
                                  <div className="bg-rose-50/40 p-4.5 rounded-3xl border border-rose-100/30 flex-1">
                                    <span className="text-[0.625rem] font-black text-rose-700 uppercase tracking-widest block mb-1 font-sans">
                                      🎯 Das nehmen wir uns als Ziel vor (Lernfortschrittsaufgabe):
                                    </span>
                                    <p className="text-[0.75rem] leading-tight font-bold leading-relaxed text-rose-950 whitespace-pre-line font-sans">
                                      {displayDiagnoseHerausforderungen}
                                    </p>
                                  </div>
                                )}

                                {record.kommentar && (
                                  <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50 text-[0.6875rem] leading-relaxed text-slate-700 font-bold font-sans">
                                    <span className="text-[0.5rem] font-extrabold text-amber-600 uppercase block mb-0.5 font-sans">Empfehlung der Lehrkraft:</span>
                                    {record.kommentar}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="schatzkarte"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex flex-col gap-5 text-left h-full"
                            >
                              {(displayLernpfad && (displayLernpfad.stationen || displayLernpfad.elternTipps)) ? (
                                <div className="grid grid-cols-1 gap-5 items-stretch h-full">
                                  {/* Schatzkarte Visual & Stations */}
                                  <div className="flex flex-col gap-4">
                                    <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between h-full">
                                      <div>
                                        <h3 className="text-[0.75rem] leading-tight font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-sans">
                                          <Map size={14} className="text-indigo-500" /> MEIN ABENTEUER-SCHATZKARTENPFAD
                                        </h3>

                                        {/* Path Line SVG Graphic */}
                                        <div className="relative h-28 mb-4 bg-slate-50 rounded-2xl border border-slate-100  shadow-inner flex items-center justify-center">
                                          <svg className="absolute p-2 w-[90%] h-[90%]" viewBox="0 0 100 60" preserveAspectRatio="none">
                                            <path 
                                              d="M 12 45 C 30 45, 20 15, 50 15 C 80 15, 70 45, 88 45" 
                                              fill="none" 
                                              stroke="#e2e8f0" 
                                              strokeWidth="2.5" 
                                              strokeDasharray="4 3" 
                                            />
                                            <motion.path 
                                              d="M 12 45 C 30 45, 20 15, 50 15 C 80 15, 70 45, 88 45" 
                                              fill="none" 
                                              stroke="#6366f1" 
                                              strokeWidth="2.5" 
                                              strokeDasharray="4 3"
                                              initial={{ pathLength: 0 }}
                                              animate={{ pathLength: 1 }}
                                              transition={{ duration: 1.8, ease: "easeInOut" }}
                                            />
                                            {/* Station 1 */}
                                            <circle cx="12" cy="45" r="5" fill="#4f46e5" />
                                            <text x="12" y="38" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#4f46e5" className="font-sans">1</text>
                                            
                                            {/* Station 2 */}
                                            <circle cx="50" cy="15" r="5" fill="#ec4899" />
                                            <text x="50" y="27" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#ec4899" className="font-sans">2</text>
                                            
                                            {/* Station 3 / Goal */}
                                            <text x="88" y="34" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#d97706">🎯</text>
                                            <path d="M 85 41 L 91 41 L 88 49 z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
                                            <text x="88" y="55" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#d97706" className="font-sans">Ziel</text>
                                          </svg>
                                        </div>

                                        {/* Stations Items */}
                                        <div className="space-y-3">
                                          {(Array.isArray(displayLernpfad?.stationen) ? displayLernpfad.stationen : []).map((st: any, i: number) => {
                                            if (!st) return null;
                                            return (
                                              <div key={i} className="flex gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-colors">
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-black leading-none text-white shadow-xs ${
                                                  i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-pink-500' : 'bg-amber-500'
                                                }`}>
                                                  {i+1}
                                                </span>
                                                <div className="text-left flex-1 min-w-0">
                                                  <p className="text-[0.75rem] leading-tight font-black text-slate-800 leading-tight flex items-center gap-1 font-sans">
                                                    {typeof st.titel === 'object' ? JSON.stringify(st.titel) : (st.titel || 'Station')} 
                                                    <span className="text-[0.5rem] font-extrabold uppercase bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-500 font-sans">
                                                      Ziel: {typeof st.ziel === 'object' ? JSON.stringify(st.ziel) : (st.ziel || 'Fokus')}
                                                    </span>
                                                  </p>
                                                  <p className="text-[0.625rem] text-slate-500 font-bold leading-relaxed mt-0.5 font-sans">{typeof st.aufgabe === 'object' ? JSON.stringify(st.aufgabe) : (st.aufgabe || 'Aufgabe')}</p>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 text-center flex flex-col items-center justify-center p-12 gap-4 flex-1">
                                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500">
                                    <Map size={32} />
                                  </div>
                                  <div>
                                    <h4 className="text-[1rem] leading-normal font-black text-slate-800 font-sans">Abenteuer-Schatzkarte noch unentdeckt</h4>
                                    <p className="text-[0.6875rem] text-slate-500 font-bold max-w-sm mx-auto mt-1 leading-normal font-sans">
                                      Für {student.vorname} wurde für diese KEL-Präsentation noch kein Schatzkartenpfad gezeichnet oder analysiert. Lass uns die Profilwerte kognitiv prüfen!
                                    </p>
                                  </div>
                                  <button
                                    onClick={runProfileAnalysis}
                                    disabled={isAnalyzingProfile}
                                    className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 font-black text-[0.75rem] leading-tight text-white uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 duration-200 cursor-pointer font-sans"
                                  >
                                    {isAnalyzingProfile ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {isAnalyzingProfile ? 'Weg wird gezeichnet...' : 'Schatzkarte & Eltern-Ratgeber erstellen 🪄'}
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })()}

                {/* RATGEBER SLIDE */}
                {currentSlide.type === 'ratgeber' && (() => {
                  const record = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id) || currentSlide?.record;
                  if (!record) return null;
                  
                  // Automated Cognitive Analysis Fallbacks
                  const fallbackData = generateFallbackAnalysis(student, record, app, sem);
                  let rawLernpfad = null;
                  try {
                    if (record.kommentar) {
                      rawLernpfad = JSON.parse(record.kommentar);
                    }
                  } catch(e) {}
                  
                  const displayLernpfad = (rawLernpfad && rawLernpfad.elternTipps && rawLernpfad.elternTipps.length > 0)
                    ? rawLernpfad
                    : { elternTipps: fallbackData.elternTipps };

                  return (
                    <div className="flex-1 flex flex-col justify-between h-full space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                        <div className="text-left">
                          <span className="text-[0.5625rem] font-black uppercase text-amber-700 tracking-wider bg-amber-100/60 px-2 py-0.5 rounded-md">
                            Praxistipps & Alltagstransfer
                          </span>
                          <h2 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight">{currentSlide.title}</h2>
                          <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{currentSlide.subtitle}</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col lg:flex-row gap-6">
                        {/* Huge illustration area */}
                        <div className="flex-1 flex flex-col justify-center items-center bg-amber-50/20 rounded-[2.5rem] border border-amber-100/40 p-6 text-center">
                          <span className="text-[4rem] leading-none mb-3">💡</span>
                          <h3 className="text-[1.125rem] font-black text-slate-800 leading-tight">Spielerischer Transfer</h3>
                          <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider mt-1 max-w-[280px]">
                            Wie Eltern zu Hause spielerisch das Lernen stärken können
                          </p>
                        </div>

                        {/* Tips list */}
                        <div className="flex-1 flex flex-col justify-start space-y-3.5 text-left py-2">
                          <span className="text-[0.5625rem] font-black text-amber-700 uppercase tracking-widest block">
                            Alltags-Abenteuer für zu Hause:
                          </span>
                          <div className="space-y-3">
                            {(Array.isArray(displayLernpfad?.elternTipps) ? displayLernpfad.elternTipps : []).map((tipp: string, i: number) => (
                              <div key={i} className="flex gap-4 items-start bg-white p-4 rounded-3xl shadow-sm border border-amber-100/60 hover:bg-amber-50/20 transition-all">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-[0.875rem]">
                                  {i + 1}
                                </span>
                                <p className="text-[0.75rem] leading-tight font-bold text-slate-800 font-sans leading-relaxed pt-1">
                                  {tipp}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-2 flex justify-between items-center text-slate-400 border-t border-slate-100 shrink-0">
                        <span className="text-[0.5rem] font-bold uppercase tracking-widest font-sans">
                          Eltern-Kooperation & Brückenbau
                        </span>
                        <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md text-[0.5rem] font-black uppercase">
                          Unterstützung zu Hause
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. FLOWER COMPEL SLIDE */}
                {currentSlide.type === 'flower' && (() => {
                  const record = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id) || currentSlide?.record || {};
                  const fallbackData = generateFallbackAnalysis(student, record, app, sem);
                  const displayDiagnoseStaerken = record.diagnoseStaerken || fallbackData.staerken;
                  const displayDiagnoseHerausforderungen = record.diagnoseHerausforderungen || fallbackData.herausforderungen;
                  
                  return (
                    <div className="flex-1 flex flex-col justify-between h-full space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="text-left">
                          <span className="text-[0.5625rem] font-black uppercase text-indigo-700 tracking-wider bg-indigo-100/60 px-2 py-0.5 rounded-md">
                            {activeTranslations.ui?.interactiveFlowerTitle || 'Interaktive KEL-Reflexion'}
                          </span>
                          <h2 className="text-[1.375rem] leading-normal font-black text-slate-800 tracking-tight">{currentSlide.title}</h2>
                          <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{currentSlide.subtitle}</p>
                        </div>
                        
                        {agreementCount > 0 && (
                          <div className="flex flex-col items-end">
                             <span className="px-3.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[0.6875rem] leading-tight font-black uppercase tracking-wider">
                              {agreementCount} von {mergedFlowerFields.length} im Gleichklang
                            </span>
                          </div>
                        )}
                      </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch min-h-0">
                      
                      {/* Left Sidebar: List of Areas */}
                      <div className="lg:col-span-3 bg-white/50 p-3 shadow-sm border border-slate-100 rounded-3xl flex flex-col max-h-[500px] lg:max-h-full overflow-hidden">
                        <h3 className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">Einschätzungsbereiche</h3>
                        
                        <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                           {presentationFlowerData.map((c: any) => {
                            const isSelected = c.id === selectedAreaId;
                            const hasBoth = c.kindRaw !== undefined && c.lehrRaw !== undefined;
                            const isMatch = hasBoth && c.kindRaw === c.lehrRaw;

                            return (
                              <button
                                key={c.id}
                                onClick={() => setSelectedAreaId(c.id)}
                                className={`w-full p-2.5 rounded-2xl border transition-all text-left flex gap-2 justify-between items-start outline-none group ${
                                  isSelected 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02] z-10' 
                                    : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <h4 className={`text-[0.625rem] font-black leading-tight break-words ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                    {c.label}
                                  </h4>
                                  <div className="flex items-center gap-1 opacity-80">
                                    <div className="flex -space-x-1">
                                      <div className={`w-2 h-2 rounded-full border border-white ${isSelected ? 'bg-amber-300' : 'bg-amber-400'}`} />
                                      <div className={`w-2 h-2 rounded-full border border-white ${isSelected ? 'bg-indigo-300' : 'bg-indigo-400'}`} />
                                    </div>
                                    <span className={`text-[0.5rem] font-bold uppercase ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                      {c.kindRaw} / {c.lehrRaw}
                                    </span>
                                  </div>
                                </div>
                                {isMatch && <CheckCircle size={12} className={isSelected ? 'text-white' : 'text-emerald-500'} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Section: Large Flower Diagram & Details underneath */}
                      <div className="lg:col-span-9 flex flex-col gap-6 relative bg-white/30 rounded-[3rem] border border-white/50 backdrop-blur-sm shadow-inner overflow-y-auto custom-scrollbar p-6">
                        
                        <div className="flex justify-between items-start w-full border-b border-slate-100/60 pb-3">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">Kollaboratives Blütendiagramm</span>
                            <div className="flex items-center gap-3">
                               <div className="flex items-center gap-1.5">
                                 <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                                 <span className="text-[0.5rem] font-black text-slate-500 uppercase tracking-tighter">Schüler:in (Selbstbild)</span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                 <span className="w-2 h-2 rounded-full bg-indigo-505 bg-indigo-500 shadow-sm" />
                                 <span className="text-[0.5rem] font-black text-slate-500 uppercase tracking-tighter">Lehrkraft (Feedback)</span>
                               </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-1.5">
                             {[1,2,3,4,5].map(v => (
                               <div key={v} className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                             ))}
                          </div>
                        </div>

                        {/* Chart Render Block - Sized dynamically with hideDetails true */}
                        <div className="w-full flex flex-col items-center justify-center p-2">
                           <FlowerChart 
                              studentId={student.id} 
                              app={app} 
                              customData={presentationFlowerData}
                              activeId={selectedAreaId}
                              onSelect={(id) => setSelectedAreaId(id)}
                              hideDetails={true}
                              large={true}
                            />
                        </div>

                        {/* STUDENT STRENGTHS & GOALS BENTO CARD (PLACED DIRECTLY UNDERNEATH DIAGRAM) */}
                        <div className="w-full shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 text-left border-t border-slate-150 pt-5">
                          {displayDiagnoseStaerken && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl flex flex-col gap-2">
                              <span className="text-[0.625rem] font-sans font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                🌟 Das gelingt mir hervorragend (Stärken):
                              </span>
                              <p className="text-[0.75rem] font-sans font-bold leading-relaxed text-emerald-950 whitespace-pre-line">
                                {displayDiagnoseStaerken}
                              </p>
                            </div>
                          )}

                          {displayDiagnoseHerausforderungen && (
                            <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-3xl flex flex-col gap-2">
                              <span className="text-[0.625rem] font-sans font-black text-rose-600 uppercase tracking-widest flex items-center gap-1">
                                🎯 Das nehmen wir uns als Ziel vor (Herausforderungen):
                              </span>
                              <p className="text-[0.75rem] font-sans font-bold leading-relaxed text-rose-950 whitespace-pre-line">
                                {displayDiagnoseHerausforderungen}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* COMPETENCIES PROGRESS BAR (NEW) */}
                        <div className="w-full max-w-4xl px-4 shrink-0">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-center">
                            {(() => {
                              const getScore = (subjects: string[]) => {
                                const numGrades = activeFaecher
                                  .filter(f => subjects.includes(f))
                                  .map(sub => berechne(app, student.id, sub, '1'))
                                  .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
                                if (numGrades.length === 0) return null;
                                const avg = numGrades.reduce((a, b) => a + b, 0) / numGrades.length;
                                return Math.max(0, Math.min(100, 100 - (avg - 1) * 20));
                              };

                              const competencies = [
                                { label: "Sprache", score: getScore(['D', 'DE', 'Deutsch', 'E', 'EN', 'Englisch']), color: "violet" },
                                { label: "Mathematik", score: getScore(['M', 'MA', 'Mathematik']), color: "blue" },
                                { label: "Sach & Natur", score: getScore(['SU', 'Sachunterricht', 'BU', 'PH']), color: "emerald" },
                                { label: "Kreativität", score: getScore(['BE', 'ME', 'WE', 'BSP']), color: "amber" },
                              ].filter(c => c.score !== null);

                              if (competencies.length === 0) return null;

                              return competencies.map((comp, idx) => {
                                const getColors = (c: string) => {
                                  switch(c) {
                                    case 'violet': return { text: 'text-violet-700', bg: 'bg-violet-100', fill: 'bg-gradient-to-r from-violet-400 to-violet-600' };
                                    case 'emerald': return { text: 'text-emerald-700', bg: 'bg-emerald-100', fill: 'bg-gradient-to-r from-emerald-400 to-emerald-600' };
                                    case 'amber': return { text: 'text-amber-700', bg: 'bg-amber-100', fill: 'bg-gradient-to-r from-amber-400 to-amber-600' };
                                    default: return { text: 'text-blue-700', bg: 'bg-blue-100', fill: 'bg-gradient-to-r from-blue-400 to-blue-600' };
                                  }
                                };
                                const colors = getColors(comp.color);
                                
                                return (
                                  <div key={idx} className="bg-white/60 border border-slate-150 rounded-xl p-3 shadow-3xs flex flex-col justify-center gap-1.5 min-w-[120px]">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[0.625rem] font-bold ${colors.text} uppercase tracking-wider`}>{comp.label}</span>
                                      <span className="text-[0.75rem] font-black text-slate-800">{Math.round(comp.score as number)}%</span>
                                    </div>
                                    <div className={`h-2 w-full ${colors.bg} rounded-full overflow-hidden shadow-inner`}>
                                       <div 
                                         className={`h-full ${colors.fill} rounded-full`} 
                                         style={{ width: `${comp.score}%` }} 
                                       />
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* WIDESCREEN DETAIL CARD UNDERNEATH */}
                        <div className="w-full shrink-0">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={selectedData?.id || 'empty'}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden text-left"
                            >
                               {/* Background accent */}
                               <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full pointer-events-none" />

                               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
                                 <div className="space-y-1 relative">
                                   <span className="text-[0.5rem] font-black text-indigo-400 uppercase tracking-[0.2em]">{selectedData?.kategorie || 'FOKUS'}</span>
                                   <h3 className="text-[1.125rem] font-black text-white leading-tight tracking-tight">{selectedData?.subject}</h3>
                                   {selectedData?.kindgerecht && (
                                      <p className="text-[0.7rem] text-slate-400 italic font-medium leading-tight mt-1">"{selectedData.kindgerecht}"</p>
                                   )}
                                 </div>
                                 
                                 <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                    <span className="text-[0.5rem] font-bold uppercase tracking-widest text-slate-500">Bereich: {selectedData?.id}</span>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[0.5rem] font-black uppercase">
                                       Synchronisiert
                                    </div>
                                 </div>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                  
                                  {/* Section 1: Self & Teacher rating (md:col-span-4) */}
                                  <div className="md:col-span-4 flex flex-col gap-2">
                                     <span className="text-[0.5625rem] font-black text-indigo-455 text-indigo-400 tracking-wider uppercase">Vergleich Gegenüberstellung</span>
                                     <div className="grid grid-cols-2 gap-2 flex-1">
                                        <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                                           <span className="text-[0.5rem] font-black text-amber-500 uppercase tracking-widest block mb-1">Selbstbild</span>
                                           <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-extrabold text-[0.9rem]">
                                                 {selectedData?.kindRaw || '-'}
                                              </div>
                                              <div className="text-[0.59375rem] font-bold text-slate-300 leading-tight">
                                                 {SMILEYS[selectedData?.kindRaw as keyof typeof SMILEYS]?.label || 'Unbekannt'}
                                              </div>
                                           </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                                           <span className="text-[0.5rem] font-black text-indigo-400 uppercase tracking-widest block mb-1">Fremdbild</span>
                                           <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-[0.9rem]">
                                                 {selectedData?.lehrRaw || '-'}
                                              </div>
                                              <div className="text-[0.59375rem] font-bold text-slate-300 leading-tight">
                                                 {SMILEYS[selectedData?.lehrRaw as keyof typeof SMILEYS]?.label || 'Unbekannt'}
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  </div>

                                  {/* Section 2: Connection Badge (md:col-span-3) */}
                                  <div className="md:col-span-3 flex flex-col gap-2">
                                     <span className="text-[0.5625rem] font-black text-indigo-400 tracking-wider uppercase">Leistungsverknüpfung</span>
                                     <div className="bg-indigo-600/10 border border-indigo-500/20 p-3.5 rounded-2xl flex flex-col justify-center items-start gap-2 flex-1">
                                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                                           <Zap size={16} />
                                        </div>
                                        <div className="min-w-0">
                                           <span className="text-[0.5rem] font-black text-indigo-300 uppercase tracking-widest">Verknüpft</span>
                                           <p className="text-[0.5625rem] text-indigo-100 font-medium leading-relaxed mt-0.5">
                                              Direkte Auswertung im Elterngespräch-Protokoll.
                                           </p>
                                        </div>
                                     </div>
                                  </div>

                                  {/* Section 3: Live Notes for Parents (md:col-span-5) */}
                                  <div className="md:col-span-5 flex flex-col gap-2">
                                     <span className="text-[0.5625rem] font-black text-indigo-400 tracking-wider uppercase">Live-Anmerkungen für Eltern</span>
                                     <div className="bg-white/5 border border-white/5 p-3 rounded-2xl space-y-2 flex-1 flex flex-col justify-center">
                                        <div className="space-y-0.5">
                                           <span className="text-[0.5rem] font-bold text-amber-500 block">Vom Kind:</span>
                                           <p className="text-[0.625rem] text-white font-medium italic break-words leading-tight">
                                              {selectedData?.studentNote ? `"${selectedData.studentNote}"` : 'Keine Anmerkung erfasst'}
                                           </p>
                                        </div>
                                        <div className="pt-2 border-t border-white/5 space-y-0.5">
                                           <span className="text-[0.5rem] font-bold text-indigo-400 block">Lehrperson:</span>
                                           <p className="text-[0.625rem] text-white font-medium italic break-words leading-tight">
                                              {selectedData?.teacherNote ? `"${selectedData.teacherNote}"` : 'Keine Anmerkung erfasst'}
                                           </p>
                                        </div>
                                     </div>
                                  </div>

                               </div>
                            </motion.div>
                          </AnimatePresence>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })()}

                {/* 4. BEHAVIOR & SCHULALLTAG SLIDE */}
                {currentSlide.type === 'behavior' && (
                  <div className="flex-1 flex flex-col justify-between h-full space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="text-left">
                        <span className="text-[0.5625rem] font-black uppercase text-indigo-700 tracking-wider bg-indigo-100/60 px-2 py-0.5 rounded-md">
                          Schulalltag verständlich erklärt
                        </span>
                        <h2 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight">{currentSlide.title}</h2>
                        <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{currentSlide.subtitle}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
                      
                      {/* 1. FEHLZEITEN CARD (Anwesenheit) */}
                      <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-150 text-left flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center">
                            <Clock size={20} />
                          </div>
                          <div>
                            <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">ANWESENHEIT</span>
                            <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 pt-1">
                              {attendance.hasData ? `${attendance.total} Fehlstunden` : 'Noch nicht erfasst'}
                            </h3>
                          </div>
                        </div>

                        {/* Comparative absence hours stacked layout - VERY LARGE AND IMPACTFUL */}
                        <div className="my-3 space-y-1 flex-1 min-h-[250px]">
                          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider block">Vergleich Fehlzeiten (Std)</span>
                          <div className="w-full h-full relative">
                            {attendance.hasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                key={`${slideIndex}_attendance`}
                                layout="vertical"
                                data={attendanceChartData}
                                margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
                              >
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} fontWeight="900" tickLine={false} axisLine={false} />
                                <Tooltip
                                  contentStyle={{ borderRadius: '8px', fontSize: '9px', padding: '6px 10px', border: '1px solid #f1f5f9' }}
                                  formatter={(value: any, name: any) => [`${value} Std`, name]}
                                />
                                 <Bar dataKey="Entschuldigt" stackId="a" fill="#3b82f6" radius={[4, 0, 0, 4]} maxBarSize={22} name="Entschuldigt" isAnimationActive={true} animationDuration={600} />
                                 <Bar dataKey="Unentschuldigt" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={22} name="Unentschuldigt" isAnimationActive={true} animationDuration={600} />
                              </BarChart>
                            </ResponsiveContainer>
                            ) : (
                              <div className="h-full rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center px-5">
                                <Clock size={28} className="text-slate-300 mb-2" />
                                <p className="text-xs font-black text-slate-600">Keine Anwesenheitsdaten vorhanden</p>
                                <p className="text-[0.625rem] font-bold text-slate-400 mt-1">Darum wird kein Vergleich mit der Klasse angezeigt.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200/50">
                          <div className="text-[0.625rem] text-slate-600 font-bold space-y-0.5">
                            {attendance.hasData && <div className="flex justify-between">
                              <span>Entschuldigt (Du):</span>
                              <span className="text-slate-800 font-black">{attendance.excused} Std</span>
                            </div>}
                            {attendance.hasData && <div className="flex justify-between">
                              <span>Unentschuldigt (Du):</span>
                              <span className="text-rose-600 font-black">{attendance.unexcused} Std</span>
                            </div>}
                            {attendance.hasData && <div className="flex justify-between border-t border-slate-100 pt-1 mt-1 text-[0.5625rem] text-slate-500 font-semibold">
                              <span>Klassen-Ø gesamt:</span>
                              <span className="text-slate-700 font-extrabold">{classAvgAttendance.total} Std ({classAvgAttendance.excused}e / {classAvgAttendance.unexcused}u)</span>
                            </div>}
                          </div>
                          
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[0.5rem] font-black uppercase tracking-wider border text-center w-full ${!attendance.hasData ? 'bg-slate-50 border-slate-200 text-slate-500' : attendance.unexcused > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            {!attendance.hasData ? 'Noch keine Aussage möglich' : attendance.unexcused > 0 ? 'Bitte offene Entschuldigungen klären' : 'Keine unentschuldigten Fehlzeiten dokumentiert'}
                          </span>
                        </div>
                      </div>

                      {/* 2. VERHALTEN CARD */}
                      <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-150 text-left flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="w-10 h-10 bg-teal-50 text-teal-600 border border-teal-100 rounded-xl flex items-center justify-center">
                            <Heart size={20} />
                          </div>
                          <div>
                            <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">SOZIALVERHALTEN</span>
                            <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 pt-1 flex items-center gap-1.5">
                              <span className="text-[1.5rem] leading-normal leading-none">{behaviorSummary.hasData ? behaviorStage.icon : '–'}</span> {behaviorSummary.hasData ? behaviorStage.label : 'Noch nicht bewertet'}
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-2.5 pt-3">
                          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">Verhaltens-Häufigkeit</span>
                          
                          {/* PieChart container enlarged - MASSIVE CHART SIZE */}
                          <div className="w-full h-80 md:h-96 lg:h-[450px] relative flex items-center justify-center">
                            {studentBehaviorPieData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart key={`${slideIndex}_behavior`}>
                                  <Pie
                                    data={studentBehaviorPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={isFullscreen ? 56 : 46}
                                    outerRadius={isFullscreen ? 115 : 98}
                                    dataKey="value"
                                    nameKey="name"
                                    isAnimationActive={true}
                                    animationDuration={800}
                                  >
                                    {studentBehaviorPieData.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '10px', fontSize: '10px', padding: '5px 10px', border: '1px solid #f1f5f9' }}
                                  />
                                  <Legend 
                                    iconSize={6}
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/90 rounded-2xl border border-slate-150 flex-1">
                                <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[1.875rem] leading-tight mb-3 shadow-xs">
                                  –
                                </div>
                                <span className="text-[0.625rem] font-black text-slate-600 uppercase tracking-widest block">Noch keine Beobachtungen</span>
                                <p className="text-[0.5625rem] text-slate-400 font-bold leading-normal pt-1.5">Ohne dokumentierte Beobachtungen wird keine Bewertung abgeleitet.</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: behaviorSummary.hasData ? behaviorStage.color : '#cbd5e1' }} />
                              <span className="text-[0.5rem] font-black uppercase tracking-widest text-slate-400">STATUS: {behaviorSummary.hasData ? behaviorStage.label : 'nicht erfasst'}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5">
                              {streak >= 3 ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[0.5625rem] font-black tracking-tight shadow-sm">
                                  <span className="text-[0.75rem] leading-tight">🔥</span> {streak} Tage Positiv-Streak
                                </span>
                              ) : streak > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[0.5625rem] font-black tracking-tight shadow-sm">
                                  <span className="text-[0.75rem] leading-tight">👍</span> {streak} Tage Gutes Verhalten
                                </span>
                              ) : null}
                              
                              {student.badges?.map((b: any) => (
                                <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[0.5625rem] font-black tracking-tight shadow-sm" title={b.date ? `Verliehen am ${new Date(b.date).toLocaleDateString()}` : ''}>
                                  <span className="text-[0.75rem] leading-tight">{b.icon}</span> {b.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. KLASSENKASSEE CHECK */}
                      <div className={`lg:col-span-2 p-5 rounded-2xl border text-left flex flex-col justify-between ${!financeSummary.hasData ? 'bg-slate-50 border-slate-200' : isKasseBalanced ? 'bg-emerald-50/20 border-emerald-100' : 'bg-amber-50/20 border-amber-100'}`}>
                        <div className="space-y-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isKasseBalanced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 api-key-balanced'}`}>
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">FINANZEN</span>
                            <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 pt-1">
                              {!financeSummary.hasData ? 'Noch keine Sammlung' : isKasseBalanced ? 'Alles bezahlt' : `${kasseDifference.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € offen`}
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4">
                          <p className="text-[0.625rem] text-slate-500 font-medium leading-relaxed">
                            {!financeSummary.hasData
                              ? 'Für dieses Kind liegen noch keine Zahlungsdaten vor.'
                              : isKasseBalanced
                                ? 'Alle erfassten Beiträge sind beglichen. Danke!'
                                : 'Es sind noch erfasste Beiträge offen.'}
                          </p>
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[0.5rem] font-black uppercase tracking-wider text-center border ${isKasseBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-amber-50 text-amber-700 border-amber-150'}`}>
                            {!financeSummary.hasData ? 'Keine Daten' : isKasseBalanced ? '✓ Ausgeglichen' : 'Offener Betrag'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 5. PORTFOLIO MEILENSTEINE */}
                {currentSlide.type === 'portfolio' && (
                  <div className="flex-1 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="text-left">
                        <span className="text-[0.5625rem] font-black uppercase text-indigo-700 tracking-wider bg-indigo-100/60 px-2 py-0.5 rounded-md">
                          Sternstunden & Meilenstein-Dossier
                        </span>
                        <h2 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight">{currentSlide.title}</h2>
                        <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{currentSlide.subtitle}</p>
                      </div>
                    </div>

                    {/* Timeline logs */}
                    <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1 flex-1 custom-scrollbar text-left">
                      {deduplicatedNotes.slice(0, 3).map((note: any) => {
                        const isLob = note.kategorie?.toLowerCase().includes('lob') || note.inhalt?.toLowerCase().includes('super') || note.inhalt?.toLowerCase().includes('toll');
                        return (
                          <div key={note.id} className={`p-4 rounded-xl border transition-all relative  flex gap-4 ${isLob ? 'bg-emerald-50/25 border-emerald-100/70' : 'bg-slate-50 border-slate-150'}`}>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 text-[0.875rem] leading-snug shrink-0">
                              {isLob ? '🌟' : '✏️'}
                            </div>
                            <div className="space-y-1 w-full flex-1">
                              <div className="flex justify-between items-center">
                                <span className={`px-2 py-0.5 rounded-md text-[0.5rem] font-black uppercase tracking-wider border ${isLob ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-indigo-50 text-indigo-800 border-indigo-100'}`}>
                                  {note.kategorie || 'Journalnotiz'}
                                </span>
                                <span className="text-[0.5625rem] font-black text-slate-400 bg-white/70 px-2 py-0.5 rounded border border-slate-100">
                                  {new Date(note.datum).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                              <p className="text-[0.75rem] leading-tight text-slate-600 font-bold leading-relaxed pt-1 select-text">
                                {note.inhalt}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {deduplicatedNotes.length === 0 && (
                        <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-1 bg-slate-50 max-w-md mx-auto">
                          <Rocket size={36} className="text-slate-300 mx-auto" />
                          <h4 className="text-[0.75rem] leading-tight font-black text-slate-500 uppercase tracking-widest pt-1">Bereit für erste Sternstunden</h4>
                          <p className="text-[0.625rem] text-slate-400 px-6 italic">Erledigung toller Abenteuer und Erlebnisse können im Unterrichtstagebuch hinterlegt und hier präsentiert werden!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. GOALS & AGREEMENTS SLIDE */}
                {currentSlide.type === 'ziele' && (
                  <div className="flex-1 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="text-left">
                        <span className="text-[0.5625rem] font-black uppercase text-indigo-700 tracking-wider bg-indigo-100/60 px-2 py-0.5 rounded-md">
                          Gemeinsame Absprachen & Ziele live eintragen
                        </span>
                        <h2 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight">{currentSlide.title}</h2>
                        <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{currentSlide.subtitle}</p>
                      </div>
                      
                      {/* Live status indication */}
                      <span className={`px-2.5 py-1 rounded-full text-[0.5625rem] font-black uppercase tracking-wider transition-all duration-300 ${
                        hasSaved 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {hasSaved ? '✓ Live gespeichert!' : 'Live-Eintragung aktiv'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 items-stretch text-left">
                      
                      {/* Left: Interactive Goal and Agreement entry */}
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-150 flex flex-col justify-between space-y-3">
                        <div className="flex-1 flex flex-col space-y-2">
                          <label className="text-[0.5625rem] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-1.5 justify-between">
                            <span>Gemeinsame Vereinbarung</span>
                            <span className="text-[0.5rem] text-slate-400 font-bold lowercase">Kind, Eltern und Lehrperson können mitlesen</span>
                          </label>
                          
                          <div className="flex-1 min-h-[160px] flex flex-col relative bg-white rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all p-2">
                            <textarea
                              value={editVereinbarung}
                              onChange={(e) => handleSaveLiveVereinbarungen(e.target.value)}
                              placeholder="Tragen Sie hier die vereinbarten Ziele oder Förderschritte ein (z.B. • Wochenplan-Ziele stärken...)"
                              className="text-[0.75rem] leading-tight font-medium text-slate-700 leading-relaxed outline-none border-none bg-transparent resize-none flex-1 w-full p-2 h-full placeholder:text-slate-400 select-text"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[0.5625rem] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Heart size={10} className="text-rose-500" /> Live-Speicherung in Datenbank
                          </span>
                          
                          <button
                            onClick={() => handleSaveLiveVereinbarungen(editVereinbarung)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 size={12} stroke="white" /> Speichern
                          </button>
                        </div>
                      </div>

                      {/* Right: Smart Recommendations Helper */}
                      <div className="bg-indigo-950 p-4 rounded-2xl flex flex-col justify-between relative  text-white">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-xl pointer-events-none rounded-full" />
                        
                        <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-center">
                          <div>
                            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1">
                              <Sparkles size={11} /> {dossierAgreementSuggestions.length > 0 ? 'Aus dem Förderprofil' : 'Neutrale Gesprächsvorlagen'}
                            </h3>
                            <p className="text-[0.5625rem] text-indigo-200 mt-0.5">
                              {dossierAgreementSuggestions.length > 0
                                ? 'Gespeicherte Ziele und Maßnahmen können in die gemeinsame Vereinbarung übernommen werden.'
                                : 'Nur auswählen, wenn die Formulierung im Gespräch wirklich zu diesem Kind passt. Es ist keine automatische Empfehlung.'}
                            </p>
                          </div>
                          
                          <div className="space-y-2 overflow-y-auto max-h-[190px] pr-1.5 custom-scrollbar animate-fade-in">
                            {(dossierAgreementSuggestions.length > 0 ? dossierAgreementSuggestions : [
                              {
                                title: 'Wochenplan-Disziplin',
                                text: 'Ich erledige meine Wochenpläne vollständig und sorgfältig.',
                                prefix: '• Wochenplan-Disziplin stärken: vollständiges, ordentliches Arbeiten im eigenen Lerntempo.'
                              },
                              {
                                title: 'Aktive Beteiligung',
                                text: 'Ich zeige im Sitzkreis öfter freiwillig auf und mache aktiv mit.',
                                prefix: '• Aktive Beteiligung: Mehr Mut beim freiwilligen Präsentieren eigener Unterrichtsideen.'
                              },
                              {
                                title: 'Schriftbild & Ordnung',
                                text: 'Ich halte meinen Tisch ordentlich und führe Hefte sauber.',
                                prefix: '• Ordnung & Schriftbild: Strukturierte Arbeitsplatz-Organisation und ordentliche Heftführung.'
                              },
                              {
                                title: 'Teamarbeit & Soziales',
                                text: 'Ich gehe respektvoll mit meinen Mitschülern um.',
                                prefix: '• Soziales Verhalten: Regelkonforme Zusammenarbeit und respektvoller Teamgeist.'
                              }
                            ]).map((rec, ri) => (
                              <button
                                key={(rec as any).id || ri}
                                onClick={() => {
                                  const base = editVereinbarung.trim();
                                  const connector = base ? '\n' : '';
                                  handleSaveLiveVereinbarungen(base + connector + rec.prefix);
                                }}
                                className="w-full text-left bg-white/10 p-2.5 rounded-xl border border-white/5 hover:bg-white/15 hover:border-white/15 transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[0.625rem] font-black text-indigo-200 group-hover:text-white uppercase tracking-wider">{rec.title}</span>
                                  <span className="text-[0.5rem] bg-indigo-600 px-1.5 py-0.5 rounded text-white font-black opacity-0 group-hover:opacity-100 transition-all">+ HINZUFÜGEN</span>
                                </div>
                                <p className="text-[0.5625rem] text-indigo-100/95 leading-relaxed pt-0.5">{rec.text}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="text-[0.5625rem] text-indigo-300/80 uppercase font-bold tracking-widest flex items-center gap-1 mt-2">
                          🌱 Gemeinsam als Team zum Schulerfolg!
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                  </SlideErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* PRESENTER REMOTE BAR (Slide Controls at bottom) */}
          <div className="flex items-center justify-between pt-5 no-print">
            <button
              onClick={() => setSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={slideIndex === 0}
              className={`px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 font-black text-[0.75rem] leading-tight uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 shadow-xl ${slideIndex === 0 ? 'opacity-20 pointer-events-none' : 'rounded-xl'}`}
            >
              <ChevronLeft size={16} /> Zurück
            </button>

            {/* Pagination Bullet Indicators */}
            <div className="flex items-center gap-2.5 max-w-[200px] overflow-x-auto py-1">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSlideIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === slideIndex ? 'bg-indigo-500 w-6' : 'bg-slate-800 hover:bg-slate-700'}`}
                  title={`Gehe zu Folie ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
              disabled={slideIndex === slides.length - 1}
              className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all flex items-center gap-1.5 font-black text-[0.75rem] leading-tight uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 shadow-xl ${slideIndex === slides.length - 1 ? 'opacity-20 pointer-events-none' : ''}`}
            >
              Weiter <ChevronRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* RENDER MODE B: DOSSIER FULL SUMMARY VIEW (Print-ready bento box) */}
      <div className={`print-container w-full max-w-7xl mx-auto px-4 py-6 md:p-8 space-y-8 flex-1 text-left ${
        presentationView !== 'dossier' ? 'hidden print:block' : ''
      }`}>
          
          {/* PROFILE SUMMARY BLOCK */}
          <div className="print-card bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs relative  flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 bg-gradient-to-br from-white via-indigo-50/5 to-slate-50">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none -mr-16 -mt-16 animate-pulse" />
            
            {/* Init badge */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-4xl font-black shadow-lg relative shrink-0">
              {student.vorname?.[0]}{student.nachname?.[0]}
              <div className="absolute -bottom-2 -right-2 bg-white text-emerald-600 p-1.5 rounded-full border border-slate-100 shadow-sm no-print">
                <Rocket size={16} />
              </div>
            </div>

            {/* Details */}
            <div className="text-center md:text-left space-y-4 flex-1">
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="text-[1.875rem] leading-tight md:text-4xl font-black text-slate-800 tracking-tight text-gradient">
                    {student.vorname} {student.nachname}
                  </h1>
                  <span className="px-3.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[0.75rem] leading-tight font-black uppercase tracking-wider">
                    Klasse {app.classes?.find((c: any) => c.id === app.activeClassId)?.name || 'Klasse'}
                  </span>
                  {gesamtSchnitt !== null && (
                    <span className="px-3.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[0.75rem] leading-tight font-black uppercase tracking-wider">
                      Schnitt: {gesamtSchnitt.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Lernentwicklungsbericht • Semester {sem} • Schuljahr {app.schuljahr || '2026'}
                </p>
              </div>

              {/* Motivational quotation */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl relative inline-block text-left w-full md:w-auto md:max-w-2xl">
                <div className="absolute left-6 -top-2.5 w-5 h-5 bg-slate-50 border-t border-l border-slate-150 rotate-45 hidden md:block" />
                <div className="flex items-start gap-3">
                  <span className="text-[1.5rem] leading-normal text-indigo-400 select-none leading-none">“</span>
                  <div>
                    <p className="text-slate-600 font-bold italic text-[0.875rem] leading-snug leading-relaxed">
                      {highlightStrength}
                    </p>
                    <span className="text-[0.625rem] uppercase font-black tracking-widest text-indigo-600 mt-1 block">
                      {student.notiz ? 'Individuelle Stärke / Notiz' : 'Pädagogischer Leitstern'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Badges and Awards */}
              <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                {streak >= 3 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[0.6875rem] font-black tracking-tight shadow-sm">
                    <span className="text-[0.875rem] leading-snug">🔥</span> {streak} Tage Positiv-Streak
                  </span>
                ) : streak > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[0.6875rem] font-black tracking-tight shadow-sm">
                    <span className="text-[0.875rem] leading-snug">👍</span> {streak} Tage Gutes Verhalten
                  </span>
                ) : null}
                
                {student.badges?.map((b: any) => (
                  <span key={b.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[0.6875rem] font-black tracking-tight shadow-sm" title={b.date ? `Verliehen am ${new Date(b.date).toLocaleDateString()}` : ''}>
                    <span className="text-[0.875rem] leading-snug">{b.icon}</span> {b.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="print-bento-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* BLOCK A: GRADES LIST RADAR */}
            <div className="print-card lg:col-span-6 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">Leistungs-Übersicht</h3>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Durchschnitte im Klassenvergleich</p>
                </div>

                {/* Dynamic Diagram Selector tabs for Dossier View */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[0.625rem] no-print">
                  <button 
                    onClick={() => setDossierChartType('column')}
                    className={`px-2 py-1 rounded-md font-bold transition-all ${dossierChartType === 'column' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                  >
                    📊 Säule
                  </button>
                  <button 
                    onClick={() => setDossierChartType('line')}
                    className={`px-2 py-1 rounded-md font-bold transition-all ${dossierChartType === 'line' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                  >
                    📈 Profil
                  </button>
                  <button 
                    onClick={() => setDossierChartType('area')}
                    className={`px-2 py-1 rounded-md font-bold transition-all ${dossierChartType === 'area' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                  >
                    📐 Fläche
                  </button>
                  <button 
                    onClick={() => setDossierChartType('radar')}
                    className={`px-2 py-1 rounded-md font-bold transition-all ${dossierChartType === 'radar' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                  >
                    🕸️ Radar
                  </button>
                </div>
              </div>

              {/* General Comparative Layout with Switchable Options */}
              {overallChartData.length > 0 ? (
                <div className="h-96 w-full max-h-[400px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    {dossierChartType === 'column' ? (
                      <BarChart key={`${slideIndex}_dossier_column`} data={overallChartData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} fontWeight="bold" tickLine={false} interval={0} />
                        <YAxis stroke="#64748b" fontSize={12} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} reversed />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Schüler (Du)" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={true} animationDuration={1500} />
                        <Bar dataKey="Klasse (Ø)" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={true} animationDuration={1500} />
                      </BarChart>
                    ) : dossierChartType === 'line' ? (
                      <LineChart key={`${slideIndex}_dossier_line`} data={overallChartData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} fontWeight="bold" tickLine={false} interval={0} />
                        <YAxis stroke="#64748b" fontSize={12} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} reversed />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Schüler (Du)" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5 }} isAnimationActive={true} animationDuration={1500} />
                        <Line type="monotone" dataKey="Klasse (Ø)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" isAnimationActive={true} animationDuration={1500} />
                      </LineChart>
                    ) : dossierChartType === 'area' ? (
                      <AreaChart key={`${slideIndex}_dossier_area`} data={overallChartData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorDuDossier" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} fontWeight="bold" tickLine={false} interval={0} />
                        <YAxis stroke="#64748b" fontSize={12} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} reversed />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="Schüler (Du)" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDuDossier)" baseValue={5} isAnimationActive={true} animationDuration={1500} />
                        <Area type="monotone" dataKey="Klasse (Ø)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} isAnimationActive={true} animationDuration={1500} />
                      </AreaChart>
                    ) : (
                      <RadarChart key={`${slideIndex}_dossier_radar`} cx="50%" cy="50%" outerRadius="70%" data={overallChartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 'bold', fill: '#475569' }} />
                        <PolarRadiusAxis angle={30} domain={[1, 5]} reversed tick={{ fontSize: 8 }} />
                        <Radar name="Schüler (Du)" dataKey="Schüler (Du)" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} isAnimationActive={true} animationDuration={1500} />
                        <Radar name="Klasse (Ø)" dataKey="Klasse (Ø)" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} isAnimationActive={true} animationDuration={1500} />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                      </RadarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : null}

              {/* List */}
              <div className="space-y-2.5 flex-1 max-h-[250px] overflow-y-auto pr-1">
                {activeGradesToRender.map((g: any) => (
                  <div key={g.fach} className="p-3 bg-slate-50/70 border border-slate-150 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-[0.75rem] leading-tight font-black text-slate-800">{g.fach}</h4>
                      <p className="text-[0.5625rem] uppercase font-bold text-slate-400">Class Avg: {g.classAvg?.toFixed(1) || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-slate-100 h-2 rounded-full  border border-slate-200 relative hidden sm:block">
                        <div 
                          className="absolute top-0 bottom-0 rounded-full" 
                          style={{
                            left: '0%', 
                            width: `${Math.max(10, (6 - (g.avg || 5)) * 20)}%`,
                            backgroundColor: getGradeColor(g.avg || 5)
                          }} 
                        />
                      </div>
                      <span className="text-[0.75rem] leading-tight font-black px-2.5 py-1 text-white rounded-lg border" style={{ backgroundColor: getGradeColor(g.avg || 5), borderColor: getGradeColor(g.avg || 5) }}>
                        {g.avg?.toFixed(1) || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAEDAGOGISCHE BILANZ SYNC FOR DOSSIER/PRINT */}
              <div className="mt-4 p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                   <Sparkles size={14} className="text-indigo-600" />
                   <h4 className="text-[0.875rem] font-black text-indigo-950">Pädagogische Bilanz (Sync)</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <span className="text-[0.5625rem] font-black text-emerald-700 uppercase tracking-widest">Wichtigste Stärken</span>
                      <div className="flex flex-col gap-1">
                        {strengths.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-[0.6875rem] font-bold text-emerald-900">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {s.label}
                          </div>
                        ))}
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <span className="text-[0.5625rem] font-black text-amber-700 uppercase tracking-widest">Förderorientierung</span>
                      <div className="flex flex-col gap-1">
                        {challenges.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-[0.6875rem] font-bold text-amber-900">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {s.label}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* BLOCK B: KEL ASSESSMENTS COMPARE */}
            <div className="print-card lg:col-span-6 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">Einschätzungsabgleich</h3>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Selbsteinschätzung vs. Lehrkraft Feedback</p>
                </div>
                {agreementPercentage > 0 && (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-[0.625rem] font-black uppercase border border-emerald-100">
                    {agreementCount} von {totalKelFields} Einig
                  </span>
                )}
              </div>

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'].map(kat => {
                  const areas = kelComparisons.filter(c => c.kategorie === kat);
                  if (areas.length === 0) return null;
                  
                  return (
                    <div key={kat} className="space-y-2">
                      <span className="inline-block px-2 py-0.5 rounded text-[0.5rem] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100">
                        {kat}
                      </span>
                      <div className="space-y-1.5">
                        {areas.map((area: any) => (
                          <div key={area.id} className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left ${area.isAgreement ? 'bg-slate-50/50 border-slate-100' : 'bg-amber-50/20 border-amber-100'}`}>
                            <div>
                              <h4 className="text-[0.6875rem] font-black text-slate-800 leading-none">{area.label}</h4>
                              <p className="text-[0.5625rem] text-slate-500 italic mt-0.5">"{area.statement}"</p>
                            </div>
                            <div className="flex gap-2 text-[1rem] leading-normal shrink-0">
                              <span title={`Kind: ${area.kindLabel}`}>{area.kindIcon}</span>
                              <span title={`Lehrer: ${area.teacherLabel}`}>{area.teacherIcon}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BLOCK C: TIMELINE OBSERVATIONS */}
            <div className="print-card lg:col-span-8 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col space-y-4">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">Portfolio & Meilensteine</h3>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Beobachtungen, Lob & Lernprozess-Journal</p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 flex-1">
                {deduplicatedNotes.map((note: any) => {
                  const isLob = note.kategorie?.toLowerCase().includes('lob') || note.inhalt?.toLowerCase().includes('super') || note.inhalt?.toLowerCase().includes('toll');
                  return (
                    <div key={note.id} className={`p-4 rounded-2xl border flex gap-4 ${isLob ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        {isLob ? '🌟' : '✏️'}
                      </div>
                      <div className="space-y-0.5 text-left w-full">
                        <div className="flex justify-between">
                          <span className={`px-2 py-0.5 rounded text-[0.5rem] font-black ${isLob ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-indigo-50 text-indigo-800 border border-indigo-100'}`}>
                            {note.kategorie || 'Beobachtung'}
                          </span>
                          <span className="text-[0.5625rem] font-bold text-slate-400">
                            {new Date(note.datum).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[0.75rem] leading-tight text-slate-600 font-bold pt-1 leading-relaxed leading-normal whitespace-pre-wrap">{note.inhalt}</p>
                        <span className="text-[0.5rem] font-black text-slate-400 uppercase block tracking-widest pt-1 italic">Quelle: {note.quelle || 'Unterrichts-Journal'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BLOCK D: ORGA SOCIALS */}
            <div className="print-card lg:col-span-4 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col space-y-6">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">Klassenalltag & Details</h3>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Absenzen, soziales Verhalten & Finanzen</p>
              </div>

              <div className="space-y-4 text-left">
                {/* Absenzen */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider">Fehlzeiten</span>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-[1rem] leading-normal font-black text-slate-800">{attendance.hasData ? `${attendance.total} Std. gesamt` : 'Noch nicht erfasst'}</span>
                    {attendance.hasData && <span className="text-[0.5625rem] text-slate-500 font-bold">Unentschuldigt: {attendance.unexcused} Std</span>}
                  </div>
                </div>

                {/* Verhalten */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider">Verhaltensampel</span>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[0.875rem] leading-snug font-black text-slate-800 flex items-center gap-1">
                      {behaviorSummary.hasData ? `${behaviorStage.icon} ${behaviorStage.label}` : 'Noch keine Beobachtungen'}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: behaviorSummary.hasData ? behaviorStage.color : '#cbd5e1' }} />
                  </div>
                </div>

                {/* Kasse */}
                <div className={`p-3 rounded-xl border ${!financeSummary.hasData ? 'bg-slate-50 border-slate-200' : isKasseBalanced ? 'bg-emerald-50/10 border-emerald-100' : 'bg-amber-50/10 border-amber-100'}`}>
                  <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider">Klassenkassen-Status</span>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-[0.875rem] leading-snug font-black text-slate-800">{!financeSummary.hasData ? 'Noch keine Zahlungsdaten' : isKasseBalanced ? 'Ausgeglichen' : `${kasseDifference.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € offen`}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[0.5rem] font-black ${isKasseBalanced ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                      {!financeSummary.hasData ? 'Keine Daten' : isKasseBalanced ? 'Bezahlt' : 'Offen'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      {/* SLIDE VISIBILITY CONFIGURATION MODAL */}
      <AnimatePresence>
        {showConfigDrawer && (
          <ModalPortal>
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999999] animate-in fade-in duration-250 no-print">
              <div 
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-250 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="space-y-1">
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>⚙️ KEL-Foliensichtbarkeit</span>
                    </h3>
                    <p className="text-[0.75rem] text-slate-500 font-bold leading-normal">
                      Wählen Sie genau aus, welche Folien in der Präsentation für {student.vorname} angezeigt werden sollen.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowConfigDrawer(false)}
                    className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-950 border border-slate-200/60 transition-all flex items-center justify-center cursor-pointer shadow-3xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
                  {/* Scope Selector in Modal too! */}
                  <div className="bg-indigo-50/40 border border-indigo-100/50 p-4.5 rounded-2xl space-y-3">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-900 block">Umfang-Voreinstellung</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setKelMode('einfach');
                          localStorage.setItem('kel_presentation_mode', 'einfach');
                          // Simple presets
                          const updated = { ...visibleSlidesConfig };
                          Object.keys(updated).forEach(k => {
                            if (['cover', 'badges', 'subject_Deutsch', 'subject_Mathematik', 'subject_Sachunterricht', 'flower', 'ziele'].includes(k)) {
                              updated[k] = true;
                            } else {
                              updated[k] = false;
                            }
                          });
                          setVisibleSlidesConfig(updated);
                          localStorage.setItem('kel_visible_slides_config', JSON.stringify(updated));
                        }}
                        className={`px-3.5 py-1.5 border font-black text-[0.6875rem] leading-tight uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-3xs ${
                          kelMode === 'einfach'
                            ? 'bg-emerald-600 text-white border-emerald-600 font-black'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        🌱 Einfach-Modus (Kernbereiche)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setKelMode('experte');
                          localStorage.setItem('kel_presentation_mode', 'experte');
                          // Reset all to visible
                          const updated = { ...visibleSlidesConfig };
                          Object.keys(updated).forEach(k => {
                            updated[k] = true;
                          });
                          setVisibleSlidesConfig(updated);
                          localStorage.setItem('kel_visible_slides_config', JSON.stringify(updated));
                        }}
                        className={`px-3.5 py-1.5 border font-black text-[0.6875rem] leading-tight uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-3xs ${
                          kelMode === 'experte'
                            ? 'bg-indigo-600 text-white border-indigo-600 font-black'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        ⚡ Experten-Modus (Vollständig)
                      </button>
                    </div>
                  </div>

                  {/* List of custom slides checkable */}
                  <div className="space-y-4">
                    <h4 className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                      Einzelseiten-Sichtbarkeit ({kelMode === 'einfach' ? 'Einfach-Modus schränkt Sichtbarkeit ein' : 'Freie Auswahl'})
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { id: 'cover', label: 'Startseite / Begrüßung', desc: 'Immer eingeblendet', required: true, icon: GraduationCap },
                        { id: 'badges', label: 'Stärken & Talente (Badges)', desc: 'Deine besonderen Sternstunden', icon: Award },
                        { id: 'subject_Deutsch', label: 'Fach: Deutsch', desc: 'Kernbereich Deutsch', icon: BookOpen },
                        { id: 'subject_Mathematik', label: 'Fach: Mathematik', desc: 'Kernbereich Mathematik', icon: Calculator },
                        { id: 'subject_Sachunterricht', label: 'Fach: Sachunterricht', desc: 'Kernbereich Sachunterricht', icon: Compass },
                        { id: 'subject_other', label: 'Andere Nebenfächer', desc: 'Englisch, Musik, Sport etc.', icon: List, hideInSimple: true },
                        { id: 'ikm', label: 'IKM Plus Testergebnisse', desc: 'Kompetenzdiagnose', icon: Activity, hideInSimple: true },
                        { id: 'ratgeber', label: 'Spiele-Ratgeber für Eltern', desc: 'Zuhause-Praxistipps', icon: Smile, hideInSimple: true },
                        { id: 'flower', label: 'Blütendiagramm (KEL-Reflexion)', desc: 'Interaktiver Abgleich', icon: Sparkles },
                        { id: 'behavior', label: 'Verhalten & Schulalltag', desc: 'Präsenz & Klassengemeinschaft', icon: Heart, hideInSimple: true },
                        { id: 'portfolio', label: 'Portfolio & Auszeichnungen', desc: 'Timeline-Beobachtungen', icon: Rocket, hideInSimple: true },
                        { id: 'ziele', label: 'Ziele & Vereinbarungen', desc: 'Ziele live eintragen', icon: CheckSquare },
                      ].map((slideMeta) => {
                        const isRequired = slideMeta.required;
                        const isExcludedBySimple = kelMode === 'einfach' && slideMeta.hideInSimple;
                        const isChecked = !isRequired && !isExcludedBySimple && (visibleSlidesConfig[slideMeta.id] !== false);
                        const Icon = slideMeta.icon;
                        
                        return (
                          <label 
                            key={slideMeta.id}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all select-none ${
                              isRequired
                                ? 'bg-slate-50 border-slate-200 opacity-65 cursor-not-allowed'
                                : isExcludedBySimple
                                  ? 'bg-slate-100 border-slate-200 opacity-55 cursor-not-allowed'
                                  : isChecked
                                    ? 'bg-indigo-50/25 border-indigo-200/80 hover:bg-indigo-50/40 cursor-pointer'
                                    : 'bg-slate-50/30 border-slate-100 hover:border-slate-200 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isChecked ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Icon size={14} />
                              </div>
                              <div className="text-left">
                                <span className="text-[0.75rem] font-bold text-slate-800 block leading-none">
                                  {slideMeta.label}
                                </span>
                                <span className="text-[0.5625rem] text-slate-400 font-medium">
                                  {slideMeta.desc}
                                </span>
                              </div>
                            </div>
                            
                            {isRequired ? (
                              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400 bg-slate-250 px-1.5 py-0.5 rounded">Erforderlich</span>
                            ) : isExcludedBySimple ? (
                              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">In "Einfach" aus</span>
                            ) : (
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const updated = {
                                    ...visibleSlidesConfig,
                                    [slideMeta.id]: e.target.checked
                                  };
                                  setVisibleSlidesConfig(updated);
                                  localStorage.setItem('kel_visible_slides_config', JSON.stringify(updated));
                                }}
                                className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-550 cursor-pointer"
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 md:p-8 border-t border-slate-100 flex justify-end bg-slate-50/50">
                  <button 
                    type="button"
                    onClick={() => setShowConfigDrawer(false)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[0.75rem] leading-tight uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Anwenden & Schließen
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
}
