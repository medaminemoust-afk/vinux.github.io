// Curated pools of real, famous artists per region (used for IP-based
// suggestions) plus style seeds for genre radio. Data only — safe for client.

export const REGIONS: { key: string; flag: string; artists: string[] }[] = [
  {
    key: "africa",
    flag: "🌍",
    artists: [
      "Burna Boy", "Wizkid", "Davido", "Rema", "Tems", "Asake",
      "Ayra Starr", "CKay", "Omah Lay", "Diamond Platnumz", "Tiwa Savage",
      "Black Sherif", "Tyla", "Sho Madjozi", "Yemi Alade", "Mr Eazi",
    ],
  },
  {
    key: "europe",
    flag: "🇪🇺",
    artists: [
      "Ed Sheeran", "Dua Lipa", "Coldplay", "Adele", "David Guetta",
      "Calvin Harris", "Aya Nakamura", "Stromae", "Zara Larsson", "Kygo",
      "Avicii", "Robbie Williams", "Queen", "Shakira", "Rita Ora", "Years & Years",
    ],
  },
  {
    key: "north-america",
    flag: "🇺🇸",
    artists: [
      "Drake", "Taylor Swift", "The Weeknd", "Kendrick Lamar", "Billie Eilish",
      "Post Malone", "Eminem", "Ariana Grande", "Bruno Mars", "Beyoncé",
      "Travis Scott", "SZA", "Doja Cat", "Imagine Dragons", "Rihanna", "Maroon 5",
    ],
  },
  {
    key: "latin-america",
    flag: "🌎",
    artists: [
      "Bad Bunny", "Karol G", "J Balvin", "Rauw Alejandro", "Maluma",
      "Anuel AA", "Ozuna", "Daddy Yankee", "Rosalía", "Peso Pluma", "Feid",
      "Shakira", "Manuel Turizo", "Myke Towers", "Nicky Jam", "Sech",
    ],
  },
  {
    key: "middle-east",
    flag: "🌙",
    artists: [
      "Amr Diab", "Nancy Ajram", "Elissa", "Tamer Hosny", "Sherine",
      "Mohamed Hamaki", "Mohammed Assaf", "Ragheb Alama", "Kadim Al Sahir",
      "Fairuz", "Cairokee", "Massari", "Mohamed Ramadan", "Hiba Tawaji",
    ],
  },
  {
    key: "asia",
    flag: "🌏",
    artists: [
      "BTS", "BLACKPINK", "AR Rahman", "Arijit Singh", "Sidhu Moose Wala",
      "Diljit Dosanjh", "SEVENTEEN", "Stray Kids", "YOASOBI", "NewJeans",
      "Atif Aslam", "Neha Kakkar", "TWICE", "Lata Mangeshkar",
    ],
  },
  {
    key: "oceania",
    flag: "🌏",
    artists: [
      "Sia", "Lorde", "Tones and I", "Iggy Azalea", "Gotye", "Vance Joy",
      "Crowded House", "Hilltop Hoods", "Benee", "Empire of the Sun",
    ],
  },
];

export const GLOBAL_ARTISTS = [
  "Drake", "Taylor Swift", "The Weeknd", "Bad Bunny", "Billie Eilish",
  "Ed Sheeran", "BTS", "Eminem", "Coldplay", "Ariana Grande", "Rihanna",
  "Burna Boy", "Dua Lipa", "Post Malone", "Adele", "SZA", "Kendrick Lamar",
  "Rema", "Imagine Dragons", "Bruno Mars",
];

export const REGION_LABEL_KEYS: Record<string, string> = {
  africa: "region.africa",
  europe: "region.europe",
  "north-america": "region.northAmerica",
  "latin-america": "region.latinAmerica",
  "middle-east": "region.middleEast",
  asia: "region.asia",
  oceania: "region.oceania",
};

export const STYLES: {
  key: string;
  emoji: string;
  labelKey: string;
  seeds: string[];
}[] = [
  { key: "Pop", emoji: "✨", labelKey: "style.pop", seeds: ["Taylor Swift", "Ed Sheeran", "Ariana Grande", "Dua Lipa", "Justin Bieber"] },
  { key: "Hip-Hop", emoji: "🎤", labelKey: "style.hiphop", seeds: ["Drake", "Kendrick Lamar", "Eminem", "Travis Scott", "Nicki Minaj"] },
  { key: "R&B/Soul", emoji: "💜", labelKey: "style.rnb", seeds: ["The Weeknd", "SZA", "Bruno Mars", "Chris Brown", "H.E.R."] },
  { key: "Afrobeats", emoji: "🥁", labelKey: "style.afrobeats", seeds: ["Burna Boy", "Wizkid", "Davido", "Rema", "Asake", "Tems"] },
  { key: "Amapiano", emoji: "🎹", labelKey: "style.amapiano", seeds: ["Kabza De Small", "Uncle Waffles", "Focalistic", "Young Stunna", "DBN Gogo"] },
  { key: "Dance/EDM", emoji: "🎧", labelKey: "style.edm", seeds: ["Calvin Harris", "David Guetta", "Martin Garrix", "Alan Walker", "Kygo", "Avicii"] },
  { key: "Latin", emoji: "🪇", labelKey: "style.latin", seeds: ["Bad Bunny", "J Balvin", "Karol G", "Rauw Alejandro", "Maluma", "Feid"] },
  { key: "Rock", emoji: "🎸", labelKey: "style.rock", seeds: ["Imagine Dragons", "Coldplay", "Linkin Park", "Queen", "AC/DC", "Arctic Monkeys"] },
  { key: "K-Pop", emoji: "💫", labelKey: "style.kpop", seeds: ["BTS", "BLACKPINK", "NewJeans", "SEVENTEEN", "Stray Kids"] },
  { key: "Country", emoji: "🤠", labelKey: "style.country", seeds: ["Luke Combs", "Morgan Wallen", "Chris Stapleton", "Zach Bryan"] },
  { key: "Reggae", emoji: "🏝️", labelKey: "style.reggae", seeds: ["Bob Marley", "Sean Paul", "Shaggy", "Chronixx"] },
  { key: "Jazz", emoji: "🎷", labelKey: "style.jazz", seeds: ["Louis Armstrong", "Miles Davis", "John Coltrane", "Norah Jones"] },
  { key: "Indie", emoji: "🌿", labelKey: "style.indie", seeds: ["Tame Impala", "Florence + The Machine", "The Neighbourhood", "Phoebe Bridgers"] },
  { key: "Metal", emoji: "🤘", labelKey: "style.metal", seeds: ["Metallica", "Iron Maiden", "Slipknot", "System of a Down"] },
  { key: "Classical", emoji: "🎻", labelKey: "style.classical", seeds: ["Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Frédéric Chopin"] },
];

export function artistsOfRegion(region: string): string[] {
  if (region === "global") return GLOBAL_ARTISTS;
  const r = REGIONS.find((x) => x.key === region);
  return r ? r.artists : GLOBAL_ARTISTS;
}

export function styleByKey(key: string) {
  return STYLES.find((s) => s.key === key) ?? STYLES[0];
}
