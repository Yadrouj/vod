export interface MagSource {
  label: string;
  url: string;
}

export interface MagFaq {
  question: string;
  answer: string;
}

export interface MagPillarLink {
  label: string;
  href: string;
  description?: string;
}

export interface MagPlace {
  name: string;
  address: string;
  phone: string | null;
  href: string;
  kind: string;
}

export interface MagVideo {
  title: string;
  slug: string;
  href: string;
  videoUrl: string;
  thumbnail?: string;
  explanation: string;
}

export interface MagArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: "باشگاه" | "استخر" | "مکمل" | "برنامه تمرین" | "تغذیه" | "چربی‌سوزی" | "سلامت" | "اخبار";
  keywords: string[];
  publishedAt: string;
  updatedAt?: string;
  status: "published" | "draft";
  image: string;
  imageAlt: string;
  body: string[];
  sources?: MagSource[];
  places?: MagPlace[];
  videos?: MagVideo[];
  tags?: string[];
  pillar?: MagPillarLink;
  internalLinks?: MagPillarLink[];
  faqs?: MagFaq[];
  seoTitle?: string;
  seoDescription?: string;
  seoBrief?: string;
  keyTakeaways?: string[];
  searchIntent?: string;
  entities?: string[];
  readingMinutes?: number;
  contentType?: "NewsArticle" | "Article" | "BlogPosting";
}

const today = "2026-07-09";

export const MAG_IMAGES = {
  gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
  pool: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=1400&q=80",
  supplement: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1400&q=80",
  workout: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
  nutrition: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80",
  fatLoss: "https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=1400&q=80",
  health: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=80",
  news: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=1400&q=80",
};

export const MAG_FALLBACK_IMAGES: Record<keyof typeof MAG_IMAGES, string> = {
  gym: commonsImage("Gym wiki.jpg"),
  pool: commonsImage("Olympic Swimming Pool - Fast Lane.JPG"),
  supplement: commonsImage("Protein shake.jpg"),
  workout: commonsImage("Close-up Hand holding dumbbell in gym.jpg"),
  nutrition: commonsImage("Healthy food.jpg"),
  fatLoss: commonsImage("Allweather running track.jpg"),
  health: commonsImage("Yoga Class at a Gym.JPG"),
  news: commonsImage("Step Aerobics Class at a Gym.JPG"),
};

const MAG_REAL_PHOTO_POOLS: Record<keyof typeof MAG_IMAGES, string[]> = {
  gym: [
    commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 1.jpg"),
    commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 2.jpg"),
    commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 3.jpg"),
    commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 5.jpg"),
    commonsImage("Iranian gym health center Karaj 1.jpg"),
    commonsImage("Iranian Gym Karaj Health center 1.jpg"),
    commonsImage("POWER Workout • Zurkhaneh زور خانه Ritual • Tehran • IRAN-2.jpg"),
    commonsImage("Billiard Club - Tehran.jpg"),
    commonsImage("Gym wiki.jpg"),
    commonsImage("Emerald Bay Gym Room.jpg"),
    commonsImage("Close-up Hand holding dumbbell in gym.jpg"),
    commonsImage("Step Aerobics Class at a Gym.JPG"),
    commonsImage("Yoga Class at a Gym.JPG"),
  ],
  pool: [
    commonsImage("Aftab pool.JPG"),
    commonsImage("Swimming pool of PWAT.jpg"),
    commonsImage("Alborz HighSchool Pool Tehran Iran 001.jpg"),
    commonsImage("Kamyar Karimi.jpg"),
    commonsImage("Olympic Swimming Pool - Fast Lane.JPG"),
    commonsImage("Swimming pool with lane ropes in place.jpg"),
  ],
  supplement: [
    commonsImage("Dolat Abad (Dawlatabad), District 20, Tehran - July 4, 2016 12.jpg"),
    commonsImage("Dolat Abad (Dawlatabad), District 20, Tehran - July 4, 2016 13.jpg"),
    commonsImage("Dolat Abad (Dawlatabad), District 20, Tehran - July 4, 2016 14.jpg"),
    commonsImage("DehghanVilla-Karaj.jpg"),
    commonsImage("Protein shake.jpg"),
    commonsImage("Close-up Hand holding dumbbell in gym.jpg"),
    commonsImage("Gym wiki.jpg"),
  ],
  workout: [
    commonsImage("Close-up Hand holding dumbbell in gym.jpg"),
    commonsImage("Gym wiki.jpg"),
    commonsImage("Emerald Bay Gym Room.jpg"),
    commonsImage("Step Aerobics Class at a Gym.JPG"),
    commonsImage("Yoga Class at a Gym.JPG"),
  ],
  nutrition: [
    commonsImage("Healthy food.jpg"),
    commonsImage("Protein shake.jpg"),
  ],
  fatLoss: [
    commonsImage("Allweather running track.jpg"),
    commonsImage("Step Aerobics Class at a Gym.JPG"),
    commonsImage("Yoga Class at a Gym.JPG"),
  ],
  health: [
    commonsImage("Yoga Class at a Gym.JPG"),
    commonsImage("Step Aerobics Class at a Gym.JPG"),
    commonsImage("Healthy food.jpg"),
  ],
  news: [
    commonsImage("Step Aerobics Class at a Gym.JPG"),
    commonsImage("Gym wiki.jpg"),
    commonsImage("Close-up Hand holding dumbbell in gym.jpg"),
  ],
};

const IRANIAN_GYM_IMAGES = [
  commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 1.jpg"),
  commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 2.jpg"),
  commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 3.jpg"),
  commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 4.jpg"),
  commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 5.jpg"),
  commonsImage("Iranian gym health center Karaj 1.jpg"),
  commonsImage("Iranian Gym Karaj Health center 1.jpg"),
  commonsImage("POWER Workout â€¢ Zurkhaneh Ø²ÙˆØ± Ø®Ø§Ù†Ù‡ Ritual â€¢ Tehran â€¢ IRAN-2.jpg"),
  commonsImage("Billiard Club - Tehran.jpg"),
  commonsImage("GolbargTehran1.jpg"),
  commonsImage("Iranian Sun Club ( my X office club) - panoramio (1).jpg"),
  commonsImage("Iranian sun club (my X office club) - panoramio.jpg"),
];

const IRANIAN_MAG_IMAGE_POOL = uniqueImages([
  ...IRANIAN_GYM_IMAGES,
  ...commonsImageSeries("Iran Premier Weightlifting League 2025", "Mehr.jpg", 1, 23),
  ...commonsImageSeries("2025 Press conference of the President of the World Weightlifting Federation", "Mehr.jpg", 1, 19),
  commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 4.jpg"),
  commonsImage("GolbargTehran1.jpg"),
  commonsImage("Iranian Sun Club ( my X office club) - panoramio (1).jpg"),
  commonsImage("Iranian sun club (my X office club) - panoramio.jpg"),
  commonsImage("Aftab pool.JPG"),
  commonsImage("NIOC Aghajary pool.jpg"),
  commonsImage("North Amirabad Road is not dead end now - panoramio (1).jpg"),
  commonsImage("Private Pool.jpg"),
  commonsImage("Sadra pool Tabriz.jpg"),
  commonsImage("Villagepool.jpg"),
  commonsImage("Villagepool2.jpg"),
  commonsImage("Lahijan Pool - Gilan IRAN.jpg"),
  commonsImage("Karoon Pharmacy.jpg"),
  commonsImage("Model umsu.jpg"),
  commonsImage("Seromha.JPG"),
  commonsImage("Dr.As'di Pharmacy 5.JPG"),
  commonsImage("Drug Jars; Persian Wellcome L0011518.jpg"),
  commonsImage("Drug Jars; Persian Wellcome L0011519.jpg"),
  commonsImage("Drug Jars; Persian Wellcome L0011520.jpg"),
  commonsImage("Drug Jars; Persian Wellcome L0011521.jpg"),
  commonsImage("Drug Jars; Persian Wellcome L0011522.jpg"),
  commonsImage("Drug Jars; Persian Wellcome L0011523.jpg"),
  commonsImage("Barbari bread Iran.jpg"),
  commonsImage("Bell Pepper Dolma.jpg"),
  commonsImage("Gheymeh Stew.jpg"),
  commonsImage("Isfahan biryan.jpg"),
  commonsImage("Kashk e Baademjaan.jpg"),
  commonsImage("Kelane - A kurdish food.jpg"),
  commonsImage("Kooteh Food 1.jpg"),
  commonsImage("Kooteh Food 2.jpg"),
  commonsImage("Kuku sibzamini.jpg"),
  commonsImage("Persian cheese - Milad.jpg"),
  commonsImage("Persian cheese - Milad 2.jpg"),
  commonsImage("Persian eggplant salad (1712872053).jpg"),
  commonsImage("Persian foods 2020.jpg"),
  commonsImage("Persian foods 2020 2.jpg"),
  commonsImage("A real food, cooked by a real cook (me ;) ) (4044201120).jpg"),
  commonsImage("1U6A5435(1).jpg"),
  commonsImage("1U6A5519(1).jpg"),
  commonsImage("Kashan DSCF8631 (53382910445).jpg"),
  commonsImage("Kashan DSCF8634 (53382910485).jpg"),
  commonsImage("Kashan IMG 20230509 223059506 HDR-2043 (53382904620).jpg"),
  commonsImage("Kashan IMG 20230509 223113143 HDR-2044 (53382904615).jpg"),
  commonsImage("Kashan IMG 20230509 230512645 HDR-2045 (53382904710).jpg"),
  commonsImage("Kashan IMG 2239-2041 (53382910495).jpg"),
  commonsImage("Nature bridge tehran.jpg"),
  commonsImage("Clear Air - panoramio.jpg"),
  commonsImage("Cloudy sky in Tehran on a summer day.jpg"),
  commonsImage("Hotel uson Tochal - panoramio.jpg"),
  commonsImage("Hyper.star.jpg"),
  commonsImage("Iran Melad - panoramio.jpg"),
  commonsImage("Koohestan View - panoramio.jpg"),
  commonsImage("Khazaneh neighborhood Tehran.jpg"),
  commonsImage("Mellat square Pic.jpg"),
  commonsImage("Modares Hwy 02 - panoramio.jpg"),
  commonsImage("Narmak, Tehran, Tehran, Iran - panoramio - hassan jafari (1).jpg"),
  commonsImage("Next to Jamshidiyeh Park - panoramio.jpg"),
  commonsImage("Niavran in Winter - panoramio.jpg"),
  commonsImage("1397022909392978114176794 شهرک غرب.jpg"),
  commonsImage("Alborz college football field .jpg"),
  commonsImage("Azadi Volleyball Hall in Tehran.png"),
  commonsImage("Green - panoramio (17).jpg"),
  commonsImage("Iran Zamin Avenue - panoramio.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 01.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 02.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 04.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 05.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 06.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 07.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 08.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 10.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 11.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 12.jpg"),
  commonsImage("Players of Naft Tehran F.C. in training 13.jpg"),
  commonsImage("Shahrak Gharb from Milad Noor.JPG"),
  commonsImage("South Tehran Skyline from Laleh International Hotel.jpg"),
  commonsImage("Tehran Snapshot 01152.JPG"),
  commonsImage("30 Tir street in Tehran 2019 by Mardetanha (75).jpg"),
  commonsImage("30 Tir street in Tehran 2019 by Mardetanha (76).jpg"),
  commonsImage("30 Tir street in Tehran 2019 by Mardetanha (77).jpg"),
  commonsImage("30 Tir street in Tehran 2019 by Mardetanha (78).jpg"),
  commonsImage("Air Restaurant رستوران هوایی - panoramio.jpg"),
  commonsImage("Darakeh3.jpg"),
  commonsImage("Darband, Teherán, Irán, 2016-09-18, DD 13.jpg"),
  commonsImage("Darband, Teherán, Irán, 2016-09-18, DD 14.jpg"),
  commonsImage("Darband, Teherán, Irán, 2016-09-18, DD 15.jpg"),
  commonsImage("Darband, Teherán, Irán, 2016-09-18, DD 29-31 HDR.jpg"),
  commonsImage("Evening dinner Teheran.jpg"),
  commonsImage("Fast Foods ,Vozara Ave, Tehran - panoramio.jpg"),
  commonsImage("Kebab at SPU restaurent at -tehran , -iran . -ft (4815118361).jpg"),
  commonsImage("Nayeb Restaurant, Valiasr (Pahlavi) Street 1.jpg"),
  commonsImage("Nayeb Resturant , Tehran - panoramio.jpg"),
  commonsImage("Pizza Capri, Tehran.jpg"),
  commonsImage("Restaurante de pollos asados, Teherán, Irán, 2016-09-18, DD 07.jpg"),
  commonsImage("Shahran Tehran kouhsar - A restaurant in Tehran, Shahran.jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (63).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (64).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (65).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (66).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (67).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (68).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (69).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (70).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (71).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (72).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (73).jpg"),
  commonsImage("Simi Alley in Tehran 2019 by Mardetanha (74).jpg"),
  commonsImage("2011 Baghghali in Valiasr street Tehran 5894291396 by Kamyar Adl.jpg"),
  commonsImage("2011 bread Mostafa Khomeyni street Molavi Tehran 5860294267 by Kamyar Adl.jpg"),
  commonsImage("Antoin Sevruguin 27 Cooking liver kababs in Tehran.jpg"),
  commonsImage("Dizi 3 by Mardetanha.jpg"),
  commonsImage("Flyland Foodpark Food court in District 2 Tehran.jpg"),
  commonsImage("Ghahvexane Azeri Rahahan 02265.jpg"),
  commonsImage("Ghahvexane Azeri Rahahan 02483.jpg"),
  commonsImage("Makhsoos (Special) Pizza.jpg"),
  commonsImage("Naan Sangak.jpg"),
  commonsImage("Naderi café2.jpg"),
  commonsImage("Nut shop Teheran.jpg"),
  commonsImage("Sangak.jpg"),
  commonsImage("Yalda night Tehran 1.jpg"),
  ...commonsImageSeries("Media Tour Visiting Fruit and Vegetable Markets", "(2025 - Tehran Picture Agency).jpg", 1, 26),
  commonsImage("Boustan Entrance from Pounak - panoramio (2).jpg"),
  commonsImage("GATE - panoramio.jpg"),
  commonsImage("Hakim and Yadegar Exp. - panoramio.jpg"),
  commonsImage("Hot Summer days ( 40 C - 104 F ),Tehran - panoramio - Behrooz Rezvani (1).jpg"),
  commonsImage("Hot Summer days ( 40 C - 104 F ),Tehran - panoramio - Behrooz Rezvani (2).jpg"),
  commonsImage("Hot Summer days ( 40 C - 104 F ),Tehran - panoramio - Behrooz Rezvani.jpg"),
  commonsImage("Iran National Library under construction, Tehran (41558700645).jpg"),
  commonsImage("IUMS - panoramio.jpg"),
  commonsImage("Jangel google - panoramio.jpg"),
  commonsImage("Khabarnegar (reporter) Square - panoramio.jpg"),
  commonsImage("Lunch (4368620145).jpg"),
  commonsImage("Main Office Tehran.jpg"),
  commonsImage("Neyavarn Palace 2007 - panoramio.jpg"),
  commonsImage("Night - panoramio (25).jpg"),
  commonsImage("Niyayesh Expressway junction 2.jpg"),
  commonsImage("Niyayesh Expressway junction.jpg"),
  commonsImage("No Air Pollution - panoramio - Behrooz Rezvani.jpg"),
  commonsImage("North of TEHRAN at Suny and Smok Free- LD - panoramio.jpg"),
  commonsImage("North Tehran and the Alborz Mountains (4141391277).jpg"),
  commonsImage("Panorama Tehran.jpg"),
  commonsImage("Parkway Cross to Tajrish, Tehran - panoramio.jpg"),
  commonsImage("Persian new yeas and low pollution Tehran - panoramio (1).jpg"),
  commonsImage("Persian new yeas and low pollution Tehran - panoramio (2).jpg"),
  commonsImage("Persian new yeas and low pollution Tehran - panoramio (6).jpg"),
  commonsImage("Pounak - panoramio (1).jpg"),
  commonsImage("Pounak - panoramio (2).jpg"),
  commonsImage("Pounak - panoramio (3).jpg"),
  commonsImage("Rain - panoramio - hassan jafari (1).jpg"),
  commonsImage("Rainy Day - panoramio (3).jpg"),
  commonsImage("Roudbar River - panoramio (1).jpg"),
  commonsImage("Sa'd Abad Entrance path - panoramio.jpg"),
  commonsImage("Setareh Mirdamad - panoramio.jpg"),
  commonsImage("Shahr Rey, Iran 2013 (1) (14838887679).jpg"),
  commonsImage("Shahr Rey, Iran 2013 (2) (15025619485).jpg"),
  commonsImage("Share Rey - panoramio.jpg"),
  commonsImage("Shirpala, Teherán, Irán, 2016-09-18, DD 36.jpg"),
  commonsImage("SPU, traditional Iranian restaurent in Tehran. -ft (4815080615).jpg"),
  commonsImage("Summer Time, A Resturant in Darband, Tehran, Iran - panoramio.jpg"),
  commonsImage("Sun set TEHRAN IRAN - panoramio.jpg"),
  commonsImage("Sunrise in Tehran.jpg"),
  commonsImage("Sunset - panoramio (417).jpg"),
  commonsImage("Sunset - panoramio (418).jpg"),
  commonsImage("Sunset - panoramio (424).jpg"),
  commonsImage("Sunset shirpala.jpg"),
  commonsImage("Teheran 3e arrondissement Davoudieyh.jpg"),
  commonsImage("Teheran 3e arrondissement Ekhtiarieh.jpg"),
  commonsImage("Teheran 3e arrondissement Gholhak.jpg"),
  commonsImage("Teheran 3e arrondissement Vanak.jpg"),
  commonsImage("Teheran 3e arrondissement-zargandeh.jpg"),
  commonsImage("Teheran 3e arrondissement.jpg"),
  commonsImage("Teheran, Iran - panoramio (1).jpg"),
  commonsImage("Teheran, Iran - panoramio (3).jpg"),
  commonsImage("Tehran (42397042184).jpg"),
  commonsImage("Tehran (4368623251).jpg"),
  commonsImage("Tehran (4369372600).jpg"),
  commonsImage("Tehran , 2007 Summer - panoramio - Behrooz Rezvani (3).jpg"),
  commonsImage("Tehran , 2007 Summer - panoramio - Behrooz Rezvani (4).jpg"),
  commonsImage("Tehran , 2007 Summer - panoramio - Behrooz Rezvani (5).jpg"),
  commonsImage("Tehran , 2007 Summer - panoramio - Behrooz Rezvani (6).jpg"),
  commonsImage("Tehran , 2007 Summer - panoramio - Behrooz Rezvani (7).jpg"),
  commonsImage("Tehran By Mehdi H.Raad.jpg"),
  commonsImage("Tehran DSC 0661~2 (49551193336).jpg"),
  commonsImage("Tehran DSC 2043~2 (49550809233).jpg"),
  commonsImage("Tehran DSC 2047 (49551307926).jpg"),
  commonsImage("Tehran Highway at Night - panoramio.jpg"),
  commonsImage("Tehran Highway Beauty at 2011 Spring - panoramio (2).jpg"),
  commonsImage("Tehran Highway Beauty at 2011 Spring - panoramio (3).jpg"),
  commonsImage("Tehran Highways (761925272).jpg"),
  commonsImage("Tehran IMG 20191210 152303902 (49550690143).jpg"),
  commonsImage("Tehran IMG 20191216 145932123 (49550727373).jpg"),
  commonsImage("Tehran IMG 20191216 150319327 (49550727848).jpg"),
  commonsImage("Tehran IMG 20191216 150330291 (49551457437).jpg"),
  commonsImage("Tehran IMG 20191216 153059566 (49551457727).jpg"),
  commonsImage("Tehran IMG 20191221 100744974 HDR (49551255106).jpg"),
  commonsImage("Tehran in a holiday and work day 01.jpg"),
  commonsImage("Tehran is the capital city of Iran,.jpg"),
  commonsImage("Tehran is the capital city of Iran.jpg"),
  commonsImage("Tehran Life (231040233).jpeg"),
  commonsImage("Tehran Moonlight - panoramio.jpg"),
  commonsImage("Tehran Panoramic View.jpg"),
  commonsImage("Tehran streets (2025).jpg"),
  commonsImage("Tehran View.JPG"),
  commonsImage("Tehran, Aug. 2011 - panoramio.jpg"),
  commonsImage("Tehran, Tehran office, 2012.jpg"),
  commonsImage("2010 Opening Ceremony - Iran entering.jpg"),
  commonsImage("2017 Mens Indoor Hockey Asia Cup Best Player Award.jpg"),
  commonsImage("DAMGHANINEZHAD Shahrbanoo chitgarlake.jpg"),
  commonsImage("Iranski Wushu trener.jpg"),
  commonsImage("Mehrshad 1.JPG"),
  commonsImage("Mehrshad 3.JPG"),
  commonsImage("Morteza Torabi . Snooker player.jpg"),
  commonsImage("Pahlavan razaz.jpg"),
  commonsImage("Phalavan Mustafa Toosi.jpg"),
  commonsImage("2008 Summer Olympics Taekwondo - Sara Khoshjamal v. Ghizlane Toudali 2.jpg"),
  commonsImage("2008 Summer Olympics Taekwondo - Sara Khoshjamal v. Ghizlane Toudali.jpg"),
  commonsImage("Volleyball match between national teams of Iran and Italy at the Olympic Games in 2016 - 1.jpg"),
  commonsImage("Volleyball match between national teams of Iran and Italy at the Olympic Games in 2016 - 22.jpg"),
  commonsImage("Volleyball match between national teams of Iran and Italy at the Olympic Games in 2016 - 27.jpg"),
  commonsImage("Volleyball match between national teams of Iran and Italy at the Olympic Games in 2016 - 4.jpg"),
  commonsImage("Zurkhaneh-1.jpg"),
  commonsImage("Amingholamali Melat park tehran1.JPG"),
  commonsImage("Au resto2 (471605526).jpg"),
  commonsImage("Beatlarestan.jpg"),
  commonsImage("Emamzadeh Saleh, Tehran - panoramio.jpg"),
  commonsImage("Entrance to Restaurants - panoramio.jpg"),
  commonsImage("Farahzad, Teheran, Iran - panoramio (1).jpg"),
  commonsImage("Hafez Bastani - 28392967847.jpg"),
  commonsImage("Kashanak, Tehran, Tehran Province, Iran - panoramio.jpg"),
  commonsImage("Narcissus International Restaurant . - panoramio (1).jpg"),
  commonsImage("Narcissus International Restaurant . - panoramio (2).jpg"),
  commonsImage("Narcissus International Restaurant . - panoramio.jpg"),
  commonsImage("Park Goftogoo Restaurant - panoramio.jpg"),
  commonsImage("Tajrish Circle, North of Tehran - panoramio.jpg"),
  commonsImage("Tehran IMG 20191218 160803899 (49551228096).jpg"),
  commonsImage("Tehran Mellat-Park.jpg"),
  commonsImage("Tehran Snapshot 00521.jpg"),
  commonsImage("Tehran Snapshot 01090.JPG"),
  commonsImage("Tehran View from Elizeh Resturant. - panoramio.jpg"),
  commonsImage("Tehran Waterfall Park and a new Tehran district (28150356507).jpg"),
  commonsImage("The boss of the boss is here and we are invited to lunch (3961420175).jpg"),
  commonsImage("View of Tehran at Early Night - panoramio.jpg"),
  commonsImage("Woman smoking a hookah in a restaurant in Tehran, Iran 2011.jpg"),
  commonsImage("Zamin Vegan Restaurant, from Milad Tower - panoramio.jpg"),
  commonsImage("971027-I'ANS-ATN-IMG 8790.jpg"),
  commonsImage("Cafe De France, Gandi Shopping Center, Tehran (1).jpg"),
  commonsImage("Cafe De France, Gandi Shopping Center, Tehran (2).jpg"),
  commonsImage("Darband Tehran Iran 536260683.jpg"),
  commonsImage("Tehran entry to bazar.JPG"),
  commonsImage("Tehran Snapshot 00604.jpg"),
  commonsImage("Tehran Snapshot 00608.jpg"),
  commonsImage("Grand1.jpg"),
  commonsImage("Velenjak tehran.jpg"),
  commonsImage("Jardín de Fin, Kashan, Irán, 2016-09-19, DD 15.jpg"),
]);

const IRANIAN_MAG_IMAGE_KEYS = new Set(IRANIAN_MAG_IMAGE_POOL.map(imageKey));

function commonsImage(file: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=900`;
}

function commonsImageSeries(prefix: string, suffix: string, first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, index) => commonsImage(`${prefix} ${first + index} ${suffix}`));
}

function uniqueImages(images: string[]) {
  return images.filter((image, index, list) => list.findIndex((candidate) => imageKey(candidate) === imageKey(image)) === index);
}

export function imageForCategory(category: MagArticle["category"]) {
  if (category === "باشگاه") return MAG_IMAGES.gym;
  if (category === "استخر") return MAG_IMAGES.pool;
  if (category === "مکمل") return MAG_IMAGES.supplement;
  if (category === "برنامه تمرین") return MAG_IMAGES.workout;
  if (category === "تغذیه") return MAG_IMAGES.nutrition;
  if (category === "چربی‌سوزی") return MAG_IMAGES.fatLoss;
  if (category === "سلامت") return MAG_IMAGES.health;
  return MAG_IMAGES.news;
}

export function fallbackImageForCategory(category: MagArticle["category"]) {
  if (category === "باشگاه") return MAG_FALLBACK_IMAGES.gym;
  if (category === "استخر") return MAG_FALLBACK_IMAGES.pool;
  if (category === "مکمل") return MAG_FALLBACK_IMAGES.supplement;
  if (category === "برنامه تمرین") return MAG_FALLBACK_IMAGES.workout;
  if (category === "تغذیه") return MAG_FALLBACK_IMAGES.nutrition;
  if (category === "چربی‌سوزی") return MAG_FALLBACK_IMAGES.fatLoss;
  if (category === "سلامت") return MAG_FALLBACK_IMAGES.health;
  return MAG_FALLBACK_IMAGES.news;
}

function imageKeyForCategory(category: MagArticle["category"]): keyof typeof MAG_IMAGES {
  if (category === "باشگاه") return "gym";
  if (category === "استخر") return "pool";
  if (category === "مکمل") return "supplement";
  if (category === "برنامه تمرین") return "workout";
  if (category === "تغذیه") return "nutrition";
  if (category === "چربی‌سوزی") return "fatLoss";
  if (category === "سلامت") return "health";
  return "news";
}

function imageLock(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 1000 + (hash >>> 0) % 900000;
}

export function realBannerImageForArticle(article: Pick<MagArticle, "slug" | "category">) {
  const specific = specificPhotoForArticle(article.slug);
  if (specific) return `${specific}&ramagh=${imageLock(`${article.category}:${article.slug}`)}`;
  const pool = photoPoolForArticle(article);
  const lock = imageLock(`${article.category}:${article.slug}`);
  const url = pool[lock % pool.length];
  return `${url}&ramagh=${lock}`;
}

export function withUniqueMagArticleImages<T extends Pick<MagArticle, "slug" | "category" | "image">>(articles: T[]) {
  const used = new Set<string>();
  return articles.map((article, index) => {
    const image = uniqueBannerImageForArticle(article, used, index);
    used.add(imageKey(image));
    return { ...article, image };
  });
}

function uniqueBannerImageForArticle(
  article: Pick<MagArticle, "slug" | "category" | "image">,
  used: Set<string>,
  index: number
) {
  const lock = imageLock(`${article.category}:${article.slug}`);
  const candidates = uniqueImages([
    ...specificPhotoCandidatesForArticle(article.slug),
    ...iranianPhotoPoolForArticle(article),
    article.image,
    ...IRANIAN_MAG_IMAGE_POOL,
  ]).filter((image) => IRANIAN_MAG_IMAGE_KEYS.has(imageKey(image)));
  const start = (lock + index) % candidates.length;
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length];
    if (!used.has(imageKey(candidate))) return `${candidate}&ramagh=${lock}-${index}`;
  }

  return `${candidates[start]}&ramagh=${lock}-${index}`;
}

function imageKey(url: string) {
  return url.replace(/[?&](width|w|q|auto|fit|crop|ramagh|sig)=[^&]+/g, "").replace(/[?&]$/, "");
}

function specificPhotoCandidatesForArticle(slug: string) {
  const specific = specificPhotoForArticle(slug);
  if (!specific || !IRANIAN_MAG_IMAGE_KEYS.has(imageKey(specific))) return [];
  return [specific];
}

function iranianPhotoPoolForArticle(article: Pick<MagArticle, "slug" | "category">) {
  const slug = article.slug.toLowerCase();
  const categoryKey = imageKeyForCategory(article.category);
  if (slug.includes("pool")) return IRANIAN_MAG_IMAGE_POOL.filter((image) => poolImageMatches(image));
  if (slug.includes("drugstore") || slug.includes("pharmacy") || slug.includes("store") || slug.includes("supplement") || slug.includes("whey") || slug.includes("creatine")) {
    return IRANIAN_MAG_IMAGE_POOL.filter((image) => supplementImageMatches(image));
  }
  if (slug.includes("meal") || slug.includes("protein") || slug.includes("food") || slug.includes("nutrition") || slug.includes("calorie")) {
    return IRANIAN_MAG_IMAGE_POOL.filter((image) => nutritionImageMatches(image));
  }
  if (slug.includes("event") || slug.includes("news") || slug.includes("bodybuilding")) return IRANIAN_MAG_IMAGE_POOL.filter((image) => /weightlifting|league|press|fitness|gym|zurkhaneh/i.test(decodeURIComponent(image)));
  if (slug.includes("gym") || categoryKey === "gym") return IRANIAN_GYM_IMAGES;
  if (categoryKey === "pool") return IRANIAN_MAG_IMAGE_POOL.filter((image) => poolImageMatches(image));
  if (categoryKey === "supplement") return IRANIAN_MAG_IMAGE_POOL.filter((image) => supplementImageMatches(image));
  if (categoryKey === "nutrition") return IRANIAN_MAG_IMAGE_POOL.filter((image) => nutritionImageMatches(image));
  if (categoryKey === "workout" || categoryKey === "fatLoss" || categoryKey === "health") {
    return IRANIAN_MAG_IMAGE_POOL.filter((image) => /fitness|gym|weightlifting|league|training|azadi|volleyball|football|sport|zurkhaneh/i.test(decodeURIComponent(image)));
  }
  return IRANIAN_MAG_IMAGE_POOL;
}

function poolImageMatches(image: string) {
  return /pool|aftab|amirabad|sadra|lahijan|village|alborz|kashan|fin|nioc|swimming/i.test(decodeURIComponent(image));
}

function supplementImageMatches(image: string) {
  return /pharmacy|drug|dolat|dehghan|karoon|model|seromha|wellcome/i.test(decodeURIComponent(image));
}

function nutritionImageMatches(image: string) {
  return /bread|dolma|gheymeh|biryan|kashk|food|kooteh|kuku|persian|cheese|eggplant|kashan|1u6a|kelane|restaurant|kebab|pizza|sangak|naan|nut|dizi|market|fruit|vegetable|darband|darakeh|simi|tir|valiasr|yalda|dinner|cafe/i.test(decodeURIComponent(image));
}

function specificPhotoForArticle(slug: string) {
  if (slug.includes("beginners-guide-to-exercise-selection")) return commonsImage("Gym wiki.jpg");
  if (slug.includes("building-a-custom-full-body")) return commonsImage("Emerald Bay Gym Room.jpg");
  if (slug.includes("how-to-create-the-perfect-routine")) return commonsImage("Yoga Class at a Gym.JPG");
  if (slug.includes("the-key-to-building-muscle")) return commonsImage("Close-up Hand holding dumbbell in gym.jpg");
  if (slug.includes("2026-training-blueprint")) return commonsImage("Step Aerobics Class at a Gym.JPG");
  if (slug.includes("bodybuilding-for-beginners")) return commonsImage("Step Aerobics Class at a Gym.JPG");
  if (slug.includes("ultimate-chest-training")) return commonsImage("Gym wiki.jpg");
  if (slug.includes("chest-workout-masterclass")) return commonsImage("Emerald Bay Gym Room.jpg");
  if (slug.includes("complete-gym-guide") || slug.includes("top-100-gyms")) return commonsImage("Fitness training women M2 (babaea maryam Tehran 2018) 5.jpg");
  if (slug.includes("compact-sports-centers")) return commonsImage("POWER Workout • Zurkhaneh زور خانه Ritual • Tehran • IRAN-2.jpg");
  return null;
}

function photoPoolForArticle(article: Pick<MagArticle, "slug" | "category">) {
  const slug = article.slug.toLowerCase();
  if (slug.includes("gym")) return MAG_REAL_PHOTO_POOLS.gym;
  if (slug.includes("pool")) return MAG_REAL_PHOTO_POOLS.pool;
  if (slug.includes("drugstore") || slug.includes("pharmacy") || slug.includes("store")) return MAG_REAL_PHOTO_POOLS.supplement;
  if (slug.includes("supplement") || slug.includes("whey") || slug.includes("creatine") || slug.includes("pre-workout")) return MAG_REAL_PHOTO_POOLS.supplement;
  if (slug.includes("meal") || slug.includes("protein") || slug.includes("food") || slug.includes("nutrition") || slug.includes("fats") || slug.includes("calorie")) return MAG_REAL_PHOTO_POOLS.nutrition;
  if (slug.includes("fat-loss") || slug.includes("running") || slug.includes("walking")) return MAG_REAL_PHOTO_POOLS.fatLoss;
  if (slug.includes("event") || slug.includes("news") || slug.includes("bodybuilding")) return MAG_REAL_PHOTO_POOLS.news;
  return MAG_REAL_PHOTO_POOLS[imageKeyForCategory(article.category)];
}

const LONG_TAIL_COPY: Record<MagArticle["category"], string[]> = {
  باشگاه: [
    "برای تصمیم نهایی، قبل از ثبت‌نام یک جلسه حضوری کوتاه بروید، ساعت شلوغی را ببینید و از مربی درباره برنامه شروع سوال کنید. باشگاه خوب فقط دستگاه زیاد ندارد؛ مسیر پیشرفت و پاسخ‌گویی هم دارد.",
    "در رمق، لینک هر مکان به صفحه اختصاصی خودش وصل می‌شود تا بتوانید مسیر، تماس، گزارش مشکل و امتیاز کاربران را یک‌جا ببینید. اگر شماره یا آدرس ناقص بود، از بخش گزارش مشکل برای اصلاح داده استفاده کنید.",
    "پیشنهاد عملی: سه گزینه نزدیک خانه یا محل کار را ذخیره کنید، قیمت و شلوغی را مقایسه کنید و بعد تصمیم بگیرید. نزدیک بودن باشگاه برای استمرار تمرین از امکانات لوکس مهم‌تر است.",
  ],
  استخر: [
    "برای استخر، بهداشت و کنترل ظرفیت از هر چیز مهم‌تر است. اگر هدف ریکاوری دارید، شنا را سبک نگه دارید و سونا یا دوش سرد را با احتیاط و متناسب با وضعیت بدنی استفاده کنید.",
    "کاربران رمق می‌توانند تجربه خود را درباره تمیزی، برخورد پرسنل، شلوغی و ارزش خرید ثبت کنند تا انتخاب بعدی برای بقیه دقیق‌تر شود.",
    "اگر بعد از تمرین سنگین پا یا ددلیفت هستید، جلسه ریکاوری را آرام‌تر برگزار کنید. هدف این روز بهتر کردن گردش خون است، نه ساختن یک تمرین دوم.",
  ],
  مکمل: [
    "مکمل باید آخرین قطعه برنامه باشد، نه اولین قطعه. قبل از خرید، پروتئین روزانه، خواب، کیفیت تمرین و بودجه را بررسی کنید؛ گاهی غذا و برنامه منظم نتیجه بیشتری از یک محصول گران می‌دهد.",
    "برای خرید امن، تاریخ انقضا، برچسب اصالت، مشخصات فارسی، اعتبار فروشنده و قیمت هر سروینگ را بررسی کنید. اگر قیمت بیش از حد پایین بود، با احتیاط برخورد کنید.",
    "در رمق، فروشگاه‌ها و داروخانه‌ها می‌توانند صفحه اختصاصی داشته باشند تا کاربر به جای خرید کور، شماره تماس، آدرس و گزارش کاربران را ببیند.",
  ],
  "برنامه تمرین": [
    "حرکت خوب زمانی نتیجه می‌دهد که با حجم، شدت و ریکاوری درست همراه شود. اگر فقط ویدیو را ببینید ولی ست‌ها و پیشرفت را ثبت نکنید، برنامه به سختی قابل اصلاح می‌شود.",
    "برای شروع، وزنه‌ای انتخاب کنید که دو تکرار در ذخیره داشته باشید. فرم تمیز، کنترل دامنه و افزایش تدریجی فشار، از رکوردگیری عجولانه ارزشمندتر است.",
    "ویدیوهای این مقاله از کتابخانه تمرین رمق انتخاب شده‌اند؛ می‌توانید با ورود به صفحه هر حرکت، زاویه‌ها و جزئیات بیشتری ببینید و آن را به برنامه خود اضافه کنید.",
  ],
  تغذیه: [
    "تغذیه خوب یعنی قابل اجرا بودن. اگر برنامه غذایی با بودجه، ساعت کاری و سلیقه شما نمی‌خواند، حتی بهترین محاسبه کالری هم دوام نمی‌آورد.",
    "هر وعده اصلی بهتر است یک منبع پروتئین، یک منبع کربوهیدرات یا چربی کنترل‌شده و مقداری فیبر داشته باشد. جزئیات به هدف شما، وزن و تعداد جلسات تمرین بستگی دارد.",
    "در رمق، بخش تغذیه می‌تواند با پروفایل کاربر شخصی‌سازی شود تا پیشنهادها از حالت عمومی خارج شوند و به برنامه واقعی نزدیک‌تر باشند.",
  ],
  "چربی‌سوزی": [
    "چربی‌سوزی موفق آهسته اما پایدار است. کسری کالری شدید، خواب کم و کاردیوی افراطی معمولا بعد از چند هفته باعث ریزش انگیزه می‌شود.",
    "به جای تمرکز وسواسی روی وزن روزانه، میانگین هفتگی، دور کمر، کیفیت تمرین و انرژی روزانه را بررسی کنید. بدن همیشه خطی تغییر نمی‌کند.",
    "رمق می‌تواند با نوتیفیکیشن‌های کوتاه، ثبت تمرین و بازسازی برنامه غذایی، روند کاهش وزن را قابل پیگیری‌تر کند.",
  ],
  سلامت: [
    "برای کاربران دارای بیماری زمینه‌ای، درد مفصل یا سابقه آسیب، تمرین باید محافظه‌کارانه شروع شود. هدف اول ساخت عادت، کنترل فرم و حذف درد است.",
    "تمرین قدرتی سبک، پیاده‌روی و موبیلیتی می‌تواند کیفیت زندگی را بهتر کند، اما جای ارزیابی پزشکی را نمی‌گیرد. اگر درد تیز یا سرگیجه دارید، تمرین را متوقف کنید.",
    "در رمق، مقاله‌های سلامت باید با زبان ساده و بدون ادعای درمانی نوشته شوند تا اعتماد کاربر بلندمدت بماند.",
  ],
  اخبار: [
    "خبر خوب فقط اعلام رویداد نیست؛ باید به کاربر توضیح دهد چرا این رویداد برای تمرین، تغذیه یا مسیر ورزشی او مهم است.",
    "برای رمق، ترکیب خبر کوتاه با تحلیل کاربردی بهترین مسیر است: نتیجه مسابقه، نکته تمرینی، نگاه مربی و لینک به برنامه‌های مرتبط.",
    "هر خبر باید تاریخ و منبع داشته باشد. محتوای تاریخ‌دار در ورزش، اعتماد بیشتری ایجاد می‌کند و در سئو هم شفاف‌تر است.",
  ],
};

export const SEED_MAG_ARTICLES: MagArticle[] = [
  article("best-gym-west-tehran", "بهترین باشگاه بدنسازی غرب تهران: راهنمای انتخاب برای سعادت‌آباد، شهرک غرب و پونک", "باشگاه", ["بهترین باشگاه غرب تهران", "باشگاه سعادت آباد", "باشگاه شهرک غرب"], [
    "غرب تهران برای بدنسازی یک مزیت جدی دارد: دسترسی خوب، باشگاه‌های بزرگ‌تر و تنوع مربی. برای انتخاب، فقط به عکس دستگاه‌ها نگاه نکنید؛ ساعت شلوغی، تهویه، برنامه مربی، فضای بانوان و فاصله تا خانه مهم‌تر از ظاهر سالن است.",
    "اگر هدف عضله‌سازی دارید، باشگاهی را انتخاب کنید که رک دمبل کامل، اسکوات رک، دستگاه سیم‌کش سالم و فضای تمرین پا داشته باشد. اگر تازه‌کار هستید، وجود مربی حاضر در سالن و برنامه شروع امن مهم‌تر از تعداد دستگاه‌هاست.",
    "برای صفحه باشگاه‌ها در رمق، پیشنهاد می‌شود کاربران امتیاز تمیزی، برخورد مربی، کیفیت دستگاه، شلوغی و قیمت را جداگانه ثبت کنند تا رتبه‌بندی غرب تهران واقعی و قابل اعتماد شود.",
  ]),
  article("best-gym-north-tehran", "بهترین باشگاه بدنسازی شمال تهران: نیاوران، قیطریه، تجریش و الهیه", "باشگاه", ["بهترین باشگاه شمال تهران", "باشگاه نیاوران", "باشگاه تجریش"], [
    "شمال تهران معمولا باشگاه‌های پریمیوم‌تری دارد، اما قیمت بالا همیشه به معنی تجربه بهتر نیست. معیار اصلی باید کیفیت مربی، نظم سالن، برنامه‌محوری و دسترسی در ساعت‌های پرترافیک باشد.",
    "برای کاربران حرفه‌ای، وجود هالتر آزاد، میز پرس استاندارد، دستگاه‌های پا و امکان تمرین سنگین اهمیت دارد. برای کاربران عمومی، نظافت، رختکن و مربی پاسخگو اولویت بالاتری دارد.",
    "اگر باشگاه در محدوده شمال تهران فعالیت می‌کند، بهترین پیشنهاد همکاری با رمق، ارائه کد تخفیف عضویت یا جلسه تست رایگان برای کاربران VIP است.",
  ]),
  article("best-gym-east-tehran", "بهترین باشگاه بدنسازی شرق تهران: تهرانپارس، نارمک و حکیمیه", "باشگاه", ["بهترین باشگاه شرق تهران", "باشگاه تهرانپارس", "باشگاه نارمک"], [
    "شرق تهران بازار خوبی برای باشگاه‌های اقتصادی و میان‌رده دارد. کاربر این منطقه معمولا دنبال قیمت منطقی، دسترسی سریع و مربی منظم است.",
    "باشگاه خوب شرق تهران باید در ساعت عصر مدیریت شلوغی داشته باشد. صف طولانی برای پرس سینه، سیم‌کش یا دستگاه پا یعنی برنامه تمرین کاربر عملا از ریتم می‌افتد.",
    "در رمق می‌توان برای شرق تهران فیلترهای قیمت، پارکینگ، سانس بانوان، مربی خصوصی و نزدیکی به مترو را پررنگ کرد؛ این‌ها دقیقا روی تصمیم خرید اثر دارند.",
  ]),
  article("best-gym-south-tehran", "بهترین باشگاه بدنسازی جنوب تهران: انتخاب اقتصادی اما حرفه‌ای", "باشگاه", ["بهترین باشگاه جنوب تهران", "باشگاه اقتصادی تهران", "باشگاه بدنسازی جنوب"], [
    "در جنوب تهران، ارزش خرید مهم‌ترین معیار است. باشگاهی برنده است که با قیمت منطقی، دستگاه سالم، فضای تمیز و مربی باحوصله ارائه کند.",
    "برای مبتدی‌ها، باشگاه خلوت‌تر با مربی پاسخگو بهتر از سالن بزرگ اما بی‌نظم است. اگر هدف کاهش وزن است، وجود تردمیل، دوچرخه، فضای تمرین دایره‌ای و برنامه غذایی پایه کمک زیادی می‌کند.",
    "مدل درآمدی پیشنهادی رمق برای این منطقه، لید فروشی ارزان‌تر و بسته‌های معرفی ماهانه برای باشگاه‌هاست، نه فقط تبلیغ گران.",
  ]),
  article("best-women-gym-tehran", "بهترین باشگاه بانوان در تهران: چه چیزهایی قبل از ثبت‌نام مهم است؟", "باشگاه", ["باشگاه بانوان تهران", "بدنسازی بانوان", "باشگاه زنانه"], [
    "برای باشگاه بانوان، امنیت، مربی خانم، نظم سانس‌ها، تهویه و کیفیت رختکن جزو معیارهای اصلی است. برنامه تمرینی بانوان هم باید بر اساس هدف، سابقه تمرین و محدودیت‌های بدنی شخصی‌سازی شود.",
    "در انتخاب باشگاه، به دستگاه‌های پایین‌تنه، فضای تمرین با دمبل، امکان اجرای حرکات اصلاحی و آموزش فرم صحیح توجه کنید. فقط کلاس‌های گروهی برای همه هدف‌ها کافی نیستند.",
    "در رمق، اگر کاربر جنسیت زن را انتخاب کند، کتابخانه تمرین باید ویدیوهای بانوان را اول نشان دهد و پیشنهادهای تمرین پایین‌تنه، قدرت عمومی و چربی‌سوزی هوشمندتر شود.",
  ]),
  article("best-pools-tehran-recovery", "بهترین استخرهای تهران برای ریکاوری ورزشکاران", "استخر", ["بهترین استخر تهران", "استخر ریکاوری", "سونا بعد تمرین"], [
    "استخر برای ورزشکار فقط تفریح نیست؛ شنا سبک، آب‌درمانی، سونا و دوش سرد می‌توانند بخشی از ریکاوری باشند. اما انتخاب استخر باید با معیار بهداشت، دمای آب و دسترسی انجام شود.",
    "برای بدنسازها، یک جلسه شنای سبک در روز استراحت می‌تواند گردش خون و حس ریکاوری را بهتر کند، ولی جای خواب کافی و تغذیه درست را نمی‌گیرد.",
    "در بخش باشگاه‌ها و استخرهای رمق، امتیاز بهداشت، خلوتی، سانس بانوان/آقایان، پارکینگ و قیمت بلیت باید جداگانه ثبت شود تا انتخاب واقعی‌تر شود.",
  ]),
  article("best-pools-west-tehran", "استخرهای خوب غرب تهران برای بعد از تمرین", "استخر", ["استخر غرب تهران", "سونا غرب تهران", "ریکاوری غرب تهران"], [
    "غرب تهران برای کاربرانی که بعد از تمرین دنبال استخر یا سونا هستند گزینه‌های متنوعی دارد. مهم‌ترین معیارها نزدیکی به باشگاه، تمیزی دوش‌ها و کنترل ظرفیت است.",
    "اگر هدفتان ریکاوری است، شدت شنا را بالا نبرید. ۲۰ تا ۳۰ دقیقه حرکت سبک در آب کافی است؛ تمرین سنگین شنا بعد از روز پا ممکن است خستگی را بیشتر کند.",
    "محتوای محلی مثل «استخر نزدیک سعادت‌آباد» یا «استخر نزدیک پونک» می‌تواند برای سئوی رمق لیدهای باکیفیت بسازد.",
  ]),
  article("best-supplement-drugstores-tehran", "بهترین داروخانه و مکمل‌فروشی تهران برای خرید امن مکمل", "مکمل", ["داروخانه مکمل تهران", "خرید مکمل اصل", "مکمل بدنسازی"], [
    "بازار مکمل در ایران حساس است؛ کاربر باید از داروخانه یا فروشگاه معتبر خرید کند، برچسب اصالت را بررسی کند و از محصول بدون مشخصات فارسی یا منبع نامعلوم دوری کند.",
    "برای رمق، بهترین مدل اعتمادسازی این است که فروشگاه‌ها صفحه پروفایل داشته باشند: شماره تماس، آدرس، مجوز، امتیاز کاربران و گزارش مشکل.",
    "در مقاله‌های مکمل، قیمت‌ها باید به‌عنوان بازه روزانه یا ماهانه نمایش داده شوند، چون بازار سریع تغییر می‌کند. اتصال به ترب یا ثبت دستی قیمت توسط ادمین می‌تواند ترافیک سئوی زیادی بسازد.",
  ]),
  article("whey-protein-iran-price-guide", "راهنمای خرید پروتئین وی در ایران؛ قیمت، برند و نکات اصالت", "مکمل", ["قیمت پروتئین وی", "بهترین وی بدنسازی", "ترب پروتئین وی"], [
    "پروتئین وی برای همه ضروری نیست؛ اگر پروتئین روزانه از غذا کامل می‌شود، مکمل فقط راحتی ایجاد می‌کند. اما برای کاربر پرمشغله یا ورزشکار حجمی، وی می‌تواند راه سریع‌تری برای تکمیل پروتئین باشد.",
    "در بررسی ترب در تیر ۱۴۰۵، نمونه‌هایی از وی ۲.۲۷ کیلوگرمی با قیمت‌های چندمیلیونی دیده می‌شود و بعضی برندهای مشهور گاهی ناموجود هستند. بنابراین مقاله قیمت باید همیشه تاریخ داشته باشد.",
    "پیشنهاد رمق: یک جدول قیمت زنده یا نیمه‌دستی بسازید و کنار هر محصول هشدار اصالت، مجوز، وزن، سروینگ و قیمت هر گرم پروتئین را نمایش دهید.",
  ], [{ label: "لیست قیمت پروتئین وی در ترب", url: "https://torob.com/price-list/2756/" }]),
  article("creatine-price-iran-guide", "قیمت کراتین در ایران و راهنمای انتخاب برای بدنسازها", "مکمل", ["قیمت کراتین", "کراتین مونوهیدرات", "کراتین ترب"], [
    "کراتین مونوهیدرات یکی از مکمل‌های پرمطالعه و محبوب است. برای بیشتر ورزشکاران، انتخاب محصول ساده و معتبر بهتر از فرمول‌های عجیب و گران است.",
    "در تیر ۱۴۰۵، ترب برای دسته کراتین بازه‌های متنوعی نشان می‌دهد؛ نمونه‌هایی مثل رول وان، BPI، کارن و برندهای دیگر با فروشگاه‌های متعدد دیده می‌شوند. قیمت را همیشه با وزن محصول مقایسه کنید.",
    "برای رمق، مقاله کراتین باید به ماشین حساب هزینه هر ۵ گرم وصل شود؛ این ابزار ساده می‌تواند کاربر را از مقاله به خرید یا VIP هدایت کند.",
  ], [{ label: "لیست قیمت مکمل کراتین در ترب", url: "https://torob.com/price-list/2770/" }]),
  article("sports-multivitamin-price-iran", "مولتی‌ویتامین ورزشی؛ چه زمانی لازم است و قیمت‌ها در ایران چطورند؟", "مکمل", ["مولتی ویتامین ورزشی", "قیمت مولتی ویتامین", "مکمل ورزشکار"], [
    "مولتی‌ویتامین جایگزین غذای خوب نیست. برای ورزشکارانی که رژیم محدود، کمبود آزمایشگاهی یا برنامه کاهش وزن شدید دارند، می‌تواند با نظر متخصص مفید باشد.",
    "در ترب، برخی مولتی‌ویتامین‌های ورزشی خارجی یا ناموجود هستند یا قیمت‌های متفاوتی دارند. بنابراین برای خرید، موجودی، اعتبار فروشنده و تاریخ انقضا مهم‌تر از اسم برند است.",
    "در رمق بهتر است بخش مکمل با هشدار پزشکی همراه باشد و ادعای درمانی ندهد؛ اعتماد بلندمدت از فروش سریع مهم‌تر است.",
  ], [{ label: "نمونه مولتی‌ویتامین ورزشی در ترب", url: "https://torob.com/p/9770bf56-92a8-4911-aabe-7ac031ec4718/" }]),
  article("best-chest-workout-daily", "برنامه روزانه سینه: بهترین تمرین برای حجم و قدرت", "برنامه تمرین", ["برنامه سینه", "تمرین پرس سینه", "حجم سینه"], [
    "یک جلسه سینه خوب با حرکت اصلی شروع می‌شود: پرس سینه هالتر یا دمبل. بعد از آن، پرس بالا سینه، حرکت کششی مثل فلای و یک حرکت تکمیلی برای کنترل عضله کافی است.",
    "برای مبتدی‌ها ۱۰ تا ۱۲ ست مفید در هفته کافی است. برای حرفه‌ای‌ها، کیفیت اجرای ست و پیشرفت وزنه مهم‌تر از اضافه کردن بی‌پایان حرکت است.",
    "نمونه برنامه: پرس سینه ۴ ست، پرس بالا سینه دمبل ۳ ست، فلای کابل ۳ ست، شنا سوئدی ۲ ست تا نزدیک ناتوانی.",
  ]),
  article("best-back-workout-daily", "برنامه روزانه پشت: لت، زیربغل و ضخامت کمر", "برنامه تمرین", ["برنامه پشت", "تمرین زیربغل", "لت"], [
    "پشت قوی فقط با لت‌پول‌دان ساخته نمی‌شود. ترکیب کشش عمودی، کشش افقی و حرکت هیپ‌هینج کنترل‌شده بهترین نتیجه را می‌دهد.",
    "برای شروع، یک حرکت لت، یک روئینگ، یک پول‌اور یا فیس‌پول و در صورت آمادگی ددلیفت سبک یا رومانیان ددلیفت کافی است.",
    "فرم مهم است: شانه را پایین نگه دارید، آرنج را مسیر دهید و اجازه ندهید جلو بازو تمام کار را بدزدد.",
  ]),
  article("best-leg-workout-daily", "برنامه روز پا: عضله‌سازی بدون نابود کردن زانو", "برنامه تمرین", ["برنامه پا", "تمرین پا", "اسکوات"], [
    "روز پا باید ترکیبی از زانو-محور و لگن-محور باشد: اسکوات یا پرس پا، رومانیان ددلیفت، جلو پا، پشت پا و ساق.",
    "اگر زانو درد دارید، دامنه حرکت، گرم‌کردن و انتخاب حرکت را جدی بگیرید. درد تیز یا مداوم نشانه توقف و بررسی تخصصی است.",
    "برای بیشتر کاربران، دو جلسه پای سبک‌تر در هفته بهتر از یک روز پای بسیار سنگین و بی‌کیفیت است.",
  ]),
  article("best-shoulder-workout-daily", "برنامه سرشانه: حجم دلتوئید بدون فشار اضافه به گردن", "برنامه تمرین", ["برنامه سرشانه", "نشر جانب", "پرس سرشانه"], [
    "سرشانه زیبا با سه بخش ساخته می‌شود: جلویی، میانی و پشتی. بیشتر افراد جلویی را زیاد و پشتی را کم تمرین می‌دهند.",
    "پرس سرشانه، نشر جانب، نشر خم و فیس‌پول ترکیب ساده و موثر است. وزنه نشر جانب لازم نیست خیلی سنگین باشد؛ کنترل مسیر مهم‌تر است.",
    "اگر درد شانه دارید، قبل از پرس سنگین، موبیلیتی و تمرین کتف را جدی بگیرید.",
  ]),
  article("best-arm-workout-daily", "برنامه بازو: جلو بازو و پشت بازو برای رشد واقعی", "برنامه تمرین", ["برنامه بازو", "جلو بازو", "پشت بازو"], [
    "بازوی بزرگ فقط با جلو بازو ساخته نمی‌شود؛ پشت بازو بخش بزرگی از حجم بازو را می‌سازد. برای رشد، هر دو را با فرم خوب تمرین دهید.",
    "جلو بازو دمبل تناوبی، جلو بازو لاری، پشت بازو سیم‌کش و پشت بازو بالای سر یک ترکیب ساده و کامل است.",
    "بازوها به ریکاوری نیاز دارند. اگر در روزهای پشت و سینه هم فشار زیادی می‌گیرند، حجم مستقیم بازو را کنترل کنید.",
  ]),
  article("best-core-workout-daily", "برنامه شکم و میان‌تنه: تمرین برای قدرت، نه فقط سوزش", "برنامه تمرین", ["تمرین شکم", "میان تنه", "کرانچ"], [
    "شکم قوی یعنی توانایی کنترل لگن و ستون فقرات. فقط کرانچ زیاد کافی نیست؛ پلانک، ددباگ، پالوف پرس و بالا آوردن پا انتخاب‌های بهتری هستند.",
    "برای چربی شکم، تمرین شکم به‌تنهایی کافی نیست. تغذیه، کسری کالری و فعالیت روزانه تعیین‌کننده‌اند.",
    "سه جلسه کوتاه ۱۰ دقیقه‌ای در هفته می‌تواند از یک جلسه طولانی و بی‌کیفیت بهتر باشد.",
  ]),
  article("fat-loss-analysis-iran", "تحلیل چربی‌سوزی: چرا بیشتر رژیم‌ها شکست می‌خورند؟", "چربی‌سوزی", ["چربی سوزی", "کاهش وزن", "رژیم بدنسازی"], [
    "چربی‌سوزی از کسری کالری می‌آید، اما اجرای آن فقط ریاضی نیست. خواب، استرس، گرسنگی، برنامه تمرین و محیط غذایی روی ماندگاری رژیم اثر دارند.",
    "بزرگ‌ترین خطا، شروع خیلی سخت است: حذف شدید غذا، کاردیو زیاد و وزنه سنگین همزمان. بدن و ذهن معمولا بعد از دو هفته مقاومت می‌کنند.",
    "در رمق، بهترین تجربه این است که برنامه کاهش وزن هفتگی، قابل اصلاح و همراه با پیام‌های انگیزشی کوتاه باشد؛ نه یک نسخه خشک و ترسناک.",
  ]),
  article("walking-fat-loss-plan", "پیاده‌روی برای چربی‌سوزی: برنامه ساده برای کاربران پرمشغله", "چربی‌سوزی", ["پیاده روی چربی سوزی", "کاردیو", "کاهش وزن"], [
    "پیاده‌روی کم‌ریسک‌ترین ابزار چربی‌سوزی است. برای شروع، ۷۰۰۰ تا ۹۰۰۰ قدم روزانه برای بسیاری از افراد از کاردیوی شدید پایدارتر است.",
    "اگر تمرین بدنسازی دارید، پیاده‌روی بعد از غذا یا در روزهای استراحت می‌تواند مصرف انرژی را بالا ببرد بدون اینکه ریکاوری را نابود کند.",
    "ردیابی قدم‌ها در رمق می‌تواند به چالش باشگاهی وصل شود: تیم‌ها، امتیاز هفتگی و جدول رتبه‌بندی محلی.",
  ]),
  article("best-meals-bodybuilder-iran", "بهترین وعده‌های غذایی برای بدنساز ایرانی", "تغذیه", ["غذای بدنسازی", "وعده بدنساز", "رژیم عضله سازی"], [
    "غذای بدنسازی در ایران لازم نیست عجیب باشد. برنج، مرغ، تخم‌مرغ، گوشت، ماهی، ماست یونانی، حبوبات و سیب‌زمینی می‌توانند پایه یک برنامه قوی باشند.",
    "برای حجم، وعده باید پروتئین کافی و کربوهیدرات قابل هضم داشته باشد. برای کات، حجم سبزیجات، پروتئین بالا و کنترل روغن مهم‌تر می‌شود.",
    "نمونه وعده ساده: برنج + مرغ + سالاد + ماست. اگر بودجه محدود است، تخم‌مرغ، عدسی، تن ماهی معتبر و لبنیات می‌توانند کمک کنند.",
  ]),
  article("pre-workout-meal-iran", "قبل تمرین چه بخوریم؟ راهنمای ساده برای انرژی بیشتر", "تغذیه", ["قبل تمرین", "غذای قبل باشگاه", "انرژی تمرین"], [
    "وعده قبل تمرین باید سبک، قابل هضم و متناسب با زمان باشد. اگر دو ساعت وقت دارید، کربوهیدرات و پروتئین کامل بخورید؛ اگر ۳۰ دقیقه وقت دارید، ساده‌تر انتخاب کنید.",
    "نان و عسل، موز، خرما، قهوه یا ماست کم‌چرب برای بعضی افراد خوب جواب می‌دهد. غذاهای پرچرب و سنگین قبل تمرین معمولا کیفیت تمرین را کم می‌کنند.",
    "در رمق، پیشنهاد وعده قبل تمرین باید با ساعت تمرین کاربر و هدف او شخصی‌سازی شود.",
  ]),
  article("post-workout-meal-iran", "بعد تمرین چه بخوریم؟ وعده ریکاوری برای عضله‌سازی", "تغذیه", ["بعد تمرین", "ریکاوری عضله", "وعده پروتئینی"], [
    "بعد تمرین لازم نیست در چند دقیقه اول وحشت کنید، اما بهتر است در چند ساعت بعد پروتئین و کربوهیدرات کافی دریافت شود.",
    "مرغ و برنج، املت با نان، سیب‌زمینی و تخم‌مرغ، یا ماست یونانی با میوه می‌تواند گزینه خوبی باشد. انتخاب دقیق به هدف و کالری روزانه بستگی دارد.",
    "برای کاربران VIP، رمق می‌تواند وعده بعد تمرین را بر اساس وزن، هدف و زمان تمرین پیشنهاد دهد.",
  ]),
  article("elderly-strength-training", "تمرین قدرتی برای سالمندان: امن، ساده و ضروری", "سلامت", ["تمرین سالمندان", "بدنسازی سالمندان", "تمرین قدرتی"], [
    "تمرین قدرتی برای سالمندان فقط برای عضله نیست؛ تعادل، استقلال، سلامت استخوان و کیفیت زندگی را هم بهتر می‌کند. شروع باید آرام و کنترل‌شده باشد.",
    "حرکات مناسب شامل نشستن و برخاستن از صندلی، کشش با کش، پرس دیواری، راه رفتن کنترل‌شده و تمرین تعادل است. درد غیرعادی یا سرگیجه نشانه توقف است.",
    "قبل از شروع برای افراد دارای بیماری قلبی، فشار خون کنترل‌نشده یا درد شدید مفصل، مشورت پزشکی ضروری است.",
  ]),
  article("beginner-gym-plan", "برنامه بدنسازی مبتدی: ۴ هفته اول را چطور شروع کنیم؟", "برنامه تمرین", ["برنامه مبتدی بدنسازی", "شروع باشگاه", "تمرین فول بادی"], [
    "مبتدی‌ها لازم نیست از روز اول برنامه حرفه‌ای داشته باشند. سه جلسه فول‌بادی در هفته با حرکات پایه، بهترین شروع برای یادگیری فرم و ساخت عادت است.",
    "هر جلسه می‌تواند شامل اسکوات یا پرس پا، پرس سینه، لت، هیپ‌هینج، سرشانه و یک حرکت شکم باشد. شدت باید متوسط باشد و فرم قربانی وزنه نشود.",
    "رمق باید برای مبتدی‌ها پیام‌های کوتاه و ساده بدهد: امروز فقط شروع کن، ست‌ها را ثبت کن، هفته بعد کمی بهترش می‌کنیم.",
  ]),
  article("home-workout-no-equipment", "برنامه تمرین در خانه بدون وسیله", "برنامه تمرین", ["تمرین خانه", "بدون وسیله", "بدنسازی خانه"], [
    "تمرین خانه بدون وسیله برای شروع عالی است، اما باید پیشرفت داشته باشد. افزایش تکرار، کاهش استراحت، کند کردن فاز منفی و سخت‌تر کردن زاویه حرکت کمک می‌کند.",
    "یک برنامه ساده: اسکوات، شنا، لانج، پل باسن، پلانک و برپی سبک. برای مبتدی‌ها ۲ تا ۳ دور کافی است.",
    "در رمق، فیلتر خانه/باشگاه در کتابخانه تمرین باید تمرین‌های بدون وسیله را سریع پیدا کند.",
  ]),
  article("bodybuilding-events-2026", "اخبار بدنسازی ۲۰۲۶: رویدادهای مهمی که باید دنبال کنید", "اخبار", ["اخبار بدنسازی", "مسابقات بدنسازی 2026", "IFBB"], [
    "تقویم جهانی بدنسازی در ۲۰۲۶ شلوغ است و رویدادهای حرفه‌ای IFBB Pro در طول سال برگزار می‌شوند. برای مخاطب ایرانی، دنبال کردن اخبار بین‌المللی و نتایج ورزشکاران منطقه جذابیت بالایی دارد.",
    "در تقویم WNBF نیز نام Armenia/Iran Open International Championships به‌صورت تاریخ در انتظار اعلام دیده می‌شود. این نوع خبر برای رمق فرصت خوبی برای جذب ترافیک علاقه‌مندان مسابقات طبیعی است.",
    "پیشنهاد سردبیری: خبرها را کوتاه، تاریخ‌دار و با منبع منتشر کنید؛ بعد تحلیل تمرینی یا تغذیه‌ای مربوط به آماده‌سازی مسابقه را به آن لینک دهید.",
  ], [{ label: "IFBB Pro Schedule", url: "https://www.ifbbpro.com/schedule/" }, { label: "WNBF International Events", url: "https://worldnaturalbb.com/international-events/" }]),
  article("iran-bodybuilding-news-angle", "بدنسازی ایران در نگاه رسانه‌ها: فرصت محتوایی برای رمق", "اخبار", ["بدنسازی ایران", "اخبار ورزشکاران ایرانی", "فدراسیون بدنسازی"], [
    "کاربران ایرانی فقط برنامه تمرین نمی‌خواهند؛ داستان ورزشکاران، مسابقات، باشگاه‌های محلی و موفقیت‌های منطقه‌ای هم برایشان جذاب است.",
    "محتوای خبری رمق باید از حاشیه‌سازی دور بماند و روی نتیجه مسابقات، مسیر تمرین، سبک آماده‌سازی و گفت‌وگو با مربی‌ها تمرکز کند.",
    "این بخش می‌تواند به جذب مربیان کمک کند: مربی‌ها با تحلیل مسابقه و انتشار مقاله تخصصی، اعتبار می‌گیرند و بعد برنامه خصوصی می‌فروشند.",
  ]),
  article("coach-private-plan-guide", "برنامه خصوصی مربی آنلاین: کاربر باید چه انتظاری داشته باشد؟", "سلامت", ["مربی آنلاین", "برنامه خصوصی", "چت مربی"], [
    "برنامه خصوصی فقط یک فایل PDF نیست. کاربر باید هدف، سابقه تمرین، محدودیت‌ها، دسترسی به تجهیزات و برنامه غذایی خود را به مربی بدهد.",
    "مربی حرفه‌ای باید برنامه قابل اجرا، توضیح حرکت، روند پیشرفت، زمان پاسخ‌گویی و روش اصلاح برنامه داشته باشد. چت خصوصی و ارسال عکس/PDF در رمق دقیقا برای همین ساخته می‌شود.",
    "مدل درآمدی مناسب: رمق کمیسیون از پرداخت برنامه خصوصی بگیرد و در عوض پرداخت امن، ابزار چت، فایل، پروفایل مربی و جذب لید فراهم کند.",
  ]),
  article("gym-owner-growth-guide", "راهنمای رشد باشگاه‌ها با رمق: از صفحه پروفایل تا لید واقعی", "باشگاه", ["تبلیغات باشگاه", "جذب عضو باشگاه", "باشگاه در تهران"], [
    "باشگاه‌ها معمولا تبلیغ می‌خرند، اما چیزی که لازم دارند لید قابل پیگیری است: نام، شماره، منطقه، هدف و زمان احتمالی ثبت‌نام.",
    "صفحه باشگاه در رمق باید عکس واقعی، امکانات، قیمت حدودی، سانس‌ها، مربی‌ها، امتیاز کاربران و دکمه تماس مستقیم داشته باشد.",
    "پیشنهاد فروش به باشگاه: یک ماه تست با گزارش تعداد بازدید، کلیک تماس و درخواست برنامه. بعد از اثبات، بسته ماهانه یا کمیسیون عضویت بفروشید.",
  ]),
  article("supplement-store-growth-guide", "راهنمای رشد فروشگاه مکمل و داروخانه در رمق", "مکمل", ["تبلیغات مکمل", "فروشگاه مکمل", "داروخانه ورزشی"], [
    "فروشگاه مکمل برای فروش آنلاین به اعتماد نیاز دارد. کاربر باید بداند محصول اصل است، قیمت به‌روز است، امکان تماس وجود دارد و تجربه خریداران قبلی مثبت بوده است.",
    "در رمق، فروشگاه می‌تواند قیمت، موجودی، برندهای اصلی و پیشنهادهای ویژه را نمایش دهد. مقاله‌های قیمت مکمل هم به صفحه فروشگاه لینک می‌دهند.",
    "مدل مذاکره: ابتدا جایگاه رایگان پایه بدهید، سپس برای نشان ویژه، اولویت در لیست، کوپن تخفیف و لید تماس هزینه ماهانه بگیرید.",
  ]),
];

function article(
  slug: string,
  title: string,
  category: MagArticle["category"],
  keywords: string[],
  body: string[],
  sources?: MagSource[]
): MagArticle {
  const expandedBody = [...body, ...LONG_TAIL_COPY[category]];
  return {
    id: `seed_${slug}`,
    slug,
    title,
    excerpt: body[0],
    category,
    keywords,
    publishedAt: today,
    status: "published",
    image: imageForCategory(category),
    imageAlt: title,
    body: expandedBody,
    sources,
  };
}

export function allSeedMagArticles() {
  return [...SEED_MAG_ARTICLES];
}
