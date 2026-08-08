export interface HistoricalStudent {
  id: string;
  name: string;
  class: string;
  year: string;
  math: number;
  german: number;
  sach: number;
  behavior: string;
  average: number;
}

export const DEFAULT_HISTORICAL_STUDENTS: HistoricalStudent[] = [
  { id: 'h1', name: 'Alina Beck', class: '4. Klasse A', year: '2023/24', math: 1, german: 2, sach: 1, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h2', name: 'Benjamin Cerne', class: '4. Klasse A', year: '2023/24', math: 3, german: 2, sach: 2, behavior: 'Gut', average: 2.33 },
  { id: 'h3', name: 'Clemens Dorfmann', class: '4. Klasse A', year: '2023/24', math: 2, german: 1, sach: 1, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h4', name: 'David Elsen', class: '4. Klasse A', year: '2023/24', math: 4, german: 4, sach: 3, behavior: 'Zufriedenstellend', average: 3.67 },
  { id: 'h5', name: 'Emma Fetz', class: '4. Klasse A', year: '2023/24', math: 1, german: 1, sach: 1, behavior: 'Sehr gut', average: 1.00 },
  { id: 'h6', name: 'Fabian Galler', class: '4. Klasse A', year: '2023/24', math: 2, german: 3, sach: 2, behavior: 'Gut', average: 2.33 },
  { id: 'h7', name: 'Greta Gmeiner', class: '4. Klasse A', year: '2023/24', math: 1, german: 2, sach: 1, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h8', name: 'Hannes Jäger', class: '4. Klasse A', year: '2023/24', math: 3, german: 3, sach: 4, behavior: 'Wenig hilfreich', average: 3.33 },
  { id: 'h9', name: 'Isabella Kaufmann', class: '4. Klasse A', year: '2023/24', math: 1, german: 1, sach: 2, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h10', name: 'Jakob Lenz', class: '4. Klasse B', year: '2023/24', math: 2, german: 2, sach: 2, behavior: 'Gut', average: 2.00 },
  { id: 'h11', name: 'Katharina Muxel', class: '4. Klasse B', year: '2023/24', math: 1, german: 2, sach: 1, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h12', name: 'Lukas Natter', class: '4. Klasse B', year: '2023/24', math: 3, german: 4, sach: 3, behavior: 'Zufriedenstellend', average: 3.33 },
  { id: 'h13', name: 'Marie Oberhauser', class: '4. Klasse B', year: '2023/24', math: 1, german: 1, sach: 1, behavior: 'Sehr gut', average: 1.00 },
  { id: 'h14', name: 'Nico Pfister', class: '4. Klasse B', year: '2023/24', math: 2, german: 1, sach: 2, behavior: 'Sehr gut', average: 1.67 },
  { id: 'h15', name: 'Olivia Ritter', class: '4. Klasse B', year: '2023/24', math: 2, german: 2, sach: 3, behavior: 'Gut', average: 2.33 },
  { id: 'h16', name: 'Paul Schwarz', class: '3. Klasse A', year: '2022/23', math: 2, german: 1, sach: 1, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h17', name: 'Quirin Troy', class: '3. Klasse A', year: '2022/23', math: 4, german: 3, sach: 3, behavior: 'Zufriedenstellend', average: 3.33 },
  { id: 'h18', name: 'Rosa Ulmer', class: '3. Klasse A', year: '2022/23', math: 1, german: 1, sach: 1, behavior: 'Sehr gut', average: 1.00 },
  { id: 'h19', name: 'Samuel Volger', class: '3. Klasse A', year: '2022/23', math: 3, german: 2, sach: 2, behavior: 'Gut', average: 2.33 },
  { id: 'h20', name: 'Theresa Wachter', class: '3. Klasse A', year: '2022/23', math: 1, german: 2, sach: 1, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h21', name: 'Valentin Wanger', class: '3. Klasse B', year: '2022/23', math: 2, german: 2, sach: 3, behavior: 'Gut', average: 2.33 },
  { id: 'h22', name: 'Yvonne Zehrer', class: '3. Klasse B', year: '2022/23', math: 1, german: 1, sach: 2, behavior: 'Sehr gut', average: 1.33 },
  { id: 'h23', name: 'Zoe Zündel', class: '2. Klasse A', year: '2021/22', math: 2, german: 2, sach: 1, behavior: 'Sehr gut', average: 1.67 },
  { id: 'h24', name: 'Aron Mathis', class: '2. Klasse A', year: '2021/22', math: 1, german: 1, sach: 1, behavior: 'Sehr gut', average: 1.00 },
  { id: 'h25', name: 'Elena Rhomberg', class: '2. Klasse A', year: '2021/22', math: 3, german: 3, sach: 2, behavior: 'Gut', average: 2.67 }
];
