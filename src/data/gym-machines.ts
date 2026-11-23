export interface GymMachine {
  category: string;
  name: string;
  description: string;
  searchTerms: string[];
  exerciseSlug?: string;
  linkLabel?: string;
}

export const gymMachines: GymMachine[] = [
  { category: 'Jambes et fessiers', name: 'Leg Press', description: 'Presse à cuisses assise ou inclinée', searchTerms: ['presse à cuisses', 'leg press'], exerciseSlug: 'presse-cuisses', linkLabel: 'Fiche du mouvement' },
  { category: 'Jambes et fessiers', name: 'Hack Squat / Pendulum Squat', description: 'Presse à squat guidée, à disques', searchTerms: ['hack squat', 'pendulum squat'], exerciseSlug: 'hack-squat-machine', linkLabel: 'Fiche du hack squat' },
  { category: 'Jambes et fessiers', name: 'Belt Squat', description: 'Squat avec ceinture à la taille', searchTerms: ['belt squat', 'squat avec ceinture'], exerciseSlug: 'hack-squat-machine', linkLabel: 'Fiche d’un squat guidé similaire' },
  { category: 'Jambes et fessiers', name: 'Leg Extension', description: 'Extension des jambes — quadriceps', searchTerms: ['leg extension', 'extension des jambes'], exerciseSlug: 'leg-extension', linkLabel: 'Fiche du mouvement' },
  { category: 'Jambes et fessiers', name: 'Leg Curl assis ou allongé', description: 'Flexion des jambes — ischio-jambiers', searchTerms: ['leg curl', 'curl ischio-jambiers', 'ischio-jambiers'], exerciseSlug: 'leg-curl-assis-2', linkLabel: 'Fiche du leg curl assis' },
  { category: 'Jambes et fessiers', name: 'Abducteurs', description: 'Écartement des cuisses — moyen fessier', searchTerms: ['abducteurs', 'abduction des hanches'], exerciseSlug: 'abducteurs-a-la-machine', linkLabel: 'Fiche du mouvement' },
  { category: 'Jambes et fessiers', name: 'Adducteurs', description: 'Resserrement des cuisses — intérieur des cuisses', searchTerms: ['adducteurs', 'adduction de hanche'], exerciseSlug: 'machine-a-adducteurs-thigh-adductor', linkLabel: 'Fiche du mouvement' },
  { category: 'Jambes et fessiers', name: 'Hip Thrust guidé / Glute Builder', description: 'Relevé de bassin — fessiers', searchTerms: ['hip thrust', 'glute builder', 'relevé de bassin'], exerciseSlug: 'hip-thrust-machine', linkLabel: 'Fiche du mouvement' },
  { category: 'Jambes et fessiers', name: 'Glute Kickback', description: 'Extension de la jambe vers l’arrière — fessiers', searchTerms: ['glute kickback', 'kickback fessiers'], exerciseSlug: 'extension-de-hanches-inversee-a-la-machine', linkLabel: 'Fiche d’une extension de hanche guidée' },
  { category: 'Jambes et fessiers', name: 'Calf Raise', description: 'Machine à mollets, assise ou debout', searchTerms: ['calf raise', 'mollets', 'extensions des mollets'], exerciseSlug: 'mollets-debout-machine', linkLabel: 'Fiche des mollets debout' },

  { category: 'Pectoraux', name: 'Chest Press', description: 'Développé assis — milieu des pectoraux', searchTerms: ['chest press', 'développé assis'], exerciseSlug: 'presse-pectorale-sur-machine-a-leviers', linkLabel: 'Fiche du mouvement' },
  { category: 'Pectoraux', name: 'Incline Chest Press', description: 'Développé incliné — haut des pectoraux', searchTerms: ['incline chest press', 'développé incliné'], exerciseSlug: 'presse-pectorale-inclinee-sur-machine-a-leviers', linkLabel: 'Fiche du mouvement' },
  { category: 'Pectoraux', name: 'Chest Press convergent', description: 'Version à charger avec des disques', searchTerms: ['chest press convergent', 'presse convergente'], exerciseSlug: 'presse-pectorale-sur-machine-a-leviers', linkLabel: 'Fiche du mouvement' },
  { category: 'Pectoraux', name: 'Pec Deck / Butterfly', description: 'Écarté assis — intérieur et galbe des pectoraux', searchTerms: ['pec deck', 'butterfly', 'écarté assis'], exerciseSlug: 'pec-deck', linkLabel: 'Fiche du mouvement' },

  { category: 'Dos', name: 'Lat Pulldown', description: 'Tirage vertical à la poulie haute — largeur du dos', searchTerms: ['lat pulldown', 'tirage vertical', 'poulie haute'], exerciseSlug: 'tirage-vertical-poulie', linkLabel: 'Fiche du mouvement' },
  { category: 'Dos', name: 'Seated Row', description: 'Tirage horizontal assis — épaisseur du dos', searchTerms: ['seated row', 'tirage horizontal assis'], exerciseSlug: 'tirage-horizontal-machine', linkLabel: 'Fiche du mouvement' },
  { category: 'Dos', name: 'Low Row', description: 'Tirage bas unilatéral — bas des dorsaux', searchTerms: ['low row', 'tirage bas unilatéral'], exerciseSlug: 'rowing-assis-a-la-machine-a-leviers-bras-independants', linkLabel: 'Fiche d’un rowing guidé' },
  { category: 'Dos', name: 'T-Bar Row', description: 'Tirage en T avec appui poitrine, à disques', searchTerms: ['t-bar row', 'rowing t-bar', 'tirage en t'], exerciseSlug: 'rowing-t-bar-allonge-sur-banc-incline', linkLabel: 'Fiche du rowing T-bar' },
  { category: 'Dos', name: 'Lower Back', description: 'Extension lombaire guidée', searchTerms: ['lower back', 'extension lombaire guidée'], exerciseSlug: 'extensions-lombaires-sur-banc-a-45-degres', linkLabel: 'Fiche des extensions lombaires sur banc' },
  { category: 'Dos', name: 'Banc à lombaires', description: 'Extension du dos au poids du corps', searchTerms: ['banc à lombaires', 'extension lombaire', 'hyperextension'], exerciseSlug: 'extensions-lombaires-sur-banc-a-45-degres', linkLabel: 'Fiche du mouvement' },

  { category: 'Épaules', name: 'Shoulder Press', description: 'Développé épaules assis', searchTerms: ['shoulder press', 'développé épaules assis'], exerciseSlug: 'developpe-machine-epaules', linkLabel: 'Fiche du mouvement' },
  { category: 'Épaules', name: 'Lateral Raise', description: 'Élévations latérales guidées', searchTerms: ['lateral raise', 'élévations latérales guidées'], exerciseSlug: 'elevations-laterales', linkLabel: 'Fiche des élévations latérales' },
  { category: 'Épaules', name: 'Rear Delt', description: 'Oiseau inversé sur le butterfly — arrière d’épaule', searchTerms: ['rear delt', 'oiseau inversé', 'pec deck inversé'], exerciseSlug: 'oiseau-a-la-machine-pec-deck-inverse', linkLabel: 'Fiche du mouvement' },

  { category: 'Bras', name: 'Biceps Curl', description: 'Curl au pupitre Larry Scott guidé', searchTerms: ['biceps curl', 'larry scott', 'curl pupitre'], exerciseSlug: 'curl-pupitre-machine', linkLabel: 'Fiche du mouvement' },
  { category: 'Bras', name: 'Triceps Extension', description: 'Extension des bras assis', searchTerms: ['triceps extension', 'extension triceps assis'], exerciseSlug: 'extension-triceps-a-la-machine', linkLabel: 'Fiche du mouvement' },
  { category: 'Bras', name: 'Dip Machine', description: 'Poussée vers le bas — triceps et bas des pectoraux', searchTerms: ['dip machine', 'machine à dips'], exerciseSlug: 'machine-a-dips', linkLabel: 'Fiche du mouvement' },
  { category: 'Bras', name: 'Machine à tractions et dips assistés', description: 'Avec contrepoids sous les genoux', searchTerms: ['tractions assistées', 'dips assistés', 'machine à tractions assistées', 'contrepoids'], exerciseSlug: 'machine-a-dips', linkLabel: 'Fiche de la machine à dips' },

  { category: 'Abdominaux et polyvalent', name: 'Abdominal Crunch', description: 'Enroulement du buste — grand droit', searchTerms: ['abdominal crunch', 'crunch machine'], exerciseSlug: 'crunch-a-la-machine-abdominale', linkLabel: 'Fiche du mouvement' },
  { category: 'Abdominaux et polyvalent', name: 'Torso Rotation', description: 'Rotation du buste — obliques', searchTerms: ['torso rotation', 'rotation du buste', 'machine à obliques'], exerciseSlug: 'rotation-du-buste-avec-swiss-ball-torso-rotation', linkLabel: 'Fiche de la rotation du buste' },
  { category: 'Abdominaux et polyvalent', name: 'Chaise romaine', description: 'Relevés de jambes et dips', searchTerms: ['chaise romaine', 'relevés de jambes'], exerciseSlug: 'releve-de-jambes-a-la-chaise-romaine', linkLabel: 'Fiche du relevé de jambes' },
  { category: 'Abdominaux et polyvalent', name: 'Banc à abdos décliné', description: 'Crunchs sur banc incliné ou décliné', searchTerms: ['banc à abdos décliné', 'crunch banc décliné'], exerciseSlug: 'crunch-sur-banc-incline', linkLabel: 'Fiche du crunch sur banc' },
  { category: 'Abdominaux et polyvalent', name: 'Vis-à-vis', description: 'Station de poulies réglables pour tout le corps', searchTerms: ['vis-à-vis', 'poulie vis-à-vis', 'cable crossover'], exerciseSlug: 'ecarte-poulie-vis-a-vis', linkLabel: 'Exemple : écarté à la poulie' },
  { category: 'Abdominaux et polyvalent', name: 'Smith Machine', description: 'Cadre guidé avec barre sur rails', searchTerms: ['smith machine', 'machine smith', 'barre guidée'], exerciseSlug: 'developpe-militaire-assis-a-la-smith-machine', linkLabel: 'Exemple : développé à la Smith machine' },
  { category: 'Abdominaux et polyvalent', name: 'Traîneau de poussée / Prowler', description: 'Sur la piste de gazon synthétique', searchTerms: ['traîneau de poussée', 'prowler', 'sled push'], exerciseSlug: 'sprint-avec-traineau-prowler', linkLabel: 'Fiche du sprint avec traîneau' },
];
