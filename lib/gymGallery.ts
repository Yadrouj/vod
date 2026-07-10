export interface GymGalleryImage {
  src: string;
  alt: string;
  credit: string;
}

const COMMONS_FILES = [
  ["Gym wiki.jpg", "نمای واقعی فضای تمرین با دستگاه و وزنه"],
  ["Emerald Bay Gym Room.jpg", "سالن تمرین با تجهیزات بدنسازی"],
  ["Close-up Hand holding dumbbell in gym.jpg", "تمرین با دمبل در باشگاه"],
  ["Step Aerobics Class at a Gym.JPG", "کلاس گروهی در فضای باشگاه"],
  ["Yoga Class at a Gym.JPG", "کلاس ورزشی و تمرین انعطاف در باشگاه"],
  ["Gym in a fitness center.jpg", "فضای عمومی باشگاه و دستگاه‌ها"],
  ["Fitness center in Hotel Natura Residence Business&SPA in Siewierz 1.jpg", "باشگاه هتل و فضای تمرین"],
  ["Exercise machines in a gym.jpg", "دستگاه‌های تمرینی در باشگاه"],
] as const;

const STORE_IMAGES = [
  ["https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1400&q=82", "sports supplement shelves and pharmacy products", "Unsplash"],
  ["https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1400&q=82", "pharmacy medicine shelves", "Unsplash"],
  ["https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=1400&q=82", "retail store counter and product display", "Unsplash"],
  ["https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1400&q=82", "store aisle and product racks", "Unsplash"],
  ["https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1400&q=82", "shop shelves and checkout area", "Unsplash"],
] as const;

const TRAINER_IMAGES = [
  ["https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=82", "coach training zone with strength equipment", "Unsplash"],
  ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&q=82", "personal training session in gym", "Unsplash"],
  ["https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=1600&q=82", "athlete training with coach", "Unsplash"],
  ["https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=82", "modern strength gym interior", "Unsplash"],
  ["https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1600&q=82", "bodybuilding coaching environment", "Unsplash"],
] as const;

const TRAINER_LOCAL_GALLERIES: Record<string, readonly (readonly [string, string, string])[]> = {
  t1: [
    ["/trainers/t1.jpg", "تصویر واقعی جاویدنام مسعود ذات‌پرور", "Wikimedia Commons"],
  ],
};

function commonsImage(file: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1100`;
}

function hash(value: string) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

export function gymGalleryFor(id: string, name: string, count = 5): GymGalleryImage[] {
  const start = hash(id) % COMMONS_FILES.length;
  return Array.from({ length: Math.min(count, COMMONS_FILES.length) }, (_, index) => {
    const [file, alt] = COMMONS_FILES[(start + index) % COMMONS_FILES.length];
    return {
      src: `${commonsImage(file)}&ramagh=${hash(`${id}:${file}`)}`,
      alt: `${name} - ${alt}`,
      credit: "Wikimedia Commons",
    };
  });
}

export function storeGalleryFor(id: string, name: string, count = 5): GymGalleryImage[] {
  const start = hash(`store:${id}`) % STORE_IMAGES.length;
  return Array.from({ length: Math.min(count, STORE_IMAGES.length) }, (_, index) => {
    const [src, alt, credit] = STORE_IMAGES[(start + index) % STORE_IMAGES.length];
    return {
      src: `${src}&ramagh=${hash(`${id}:${src}`)}`,
      alt: `${name} - ${alt}`,
      credit,
    };
  });
}

export function trainerGalleryFor(id: string, name: string, count = 5): GymGalleryImage[] {
  const local = TRAINER_LOCAL_GALLERIES[id];
  if (local) {
    return local.slice(0, count).map(([src, alt, credit]) => ({
      src,
      alt: `${name} - ${alt}`,
      credit,
    }));
  }

  const start = hash(`trainer:${id}`) % TRAINER_IMAGES.length;
  return Array.from({ length: Math.min(count, TRAINER_IMAGES.length) }, (_, index) => {
    const [src, alt, credit] = TRAINER_IMAGES[(start + index) % TRAINER_IMAGES.length];
    return {
      src: `${src}&ramagh=${hash(`${id}:${src}`)}`,
      alt: `${name} - ${alt}`,
      credit,
    };
  });
}
