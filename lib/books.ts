// নতুন পরিকল্পনায় বই বাছলে অধ্যায়ের তালিকা নিজে বসে (পরে যোগ-বাদ করা যায়)। সিস্টেম/অংশ ধরে প্রধান অধ্যায়, পড়ার সুবিধামতো ক্রমে।
export type Book = { id: string; name: string; subject: string; chapters: string[] };

export const BOOKS: Book[] = [
  {
    id: "davidson", name: "Davidson's Principles and Practice of Medicine", subject: "মেডিসিন",
    chapters: [
      "Clinical biochemistry & water-electrolyte balance", "Cardiology", "Respiratory medicine", "Nephrology & urology",
      "Gastroenterology", "Hepatology", "Endocrinology", "Diabetes mellitus", "Haematology & transfusion medicine",
      "Rheumatology & bone disease", "Neurology", "Stroke medicine", "Infectious disease", "HIV infection & AIDS",
      "Clinical immunology", "Medical genetics", "Clinical pharmacology & poisoning", "Oncology & palliative care",
      "Dermatology", "Medical psychiatry", "Acute medicine & critical illness", "Nutrition & ageing",
    ],
  },
  {
    id: "guyton", name: "Guyton & Hall Textbook of Medical Physiology", subject: "ফিজিওলজি",
    chapters: [
      "Cell & general physiology", "Membrane, nerve & muscle", "Heart", "Circulation", "Body fluids & kidneys",
      "Blood cells, immunity & coagulation", "Respiration", "Nervous system: general & sensory", "Special senses",
      "Motor & integrative neurophysiology", "Autonomic nervous system & brain", "Gastrointestinal physiology",
      "Metabolism & temperature regulation", "Endocrinology", "Reproduction", "Sports, aviation & space physiology",
    ],
  },
  {
    id: "robbins", name: "Robbins Basic Pathology", subject: "প্যাথলজি",
    chapters: [
      "Cell injury & death", "Inflammation & repair", "Hemodynamic disorders & thrombosis", "Diseases of immunity",
      "Neoplasia", "Genetic & pediatric diseases", "Environmental & nutritional diseases", "Blood vessels", "Heart",
      "Hematopoietic & lymphoid systems", "Lung", "Kidney & its collecting system", "Oral cavity & GI tract",
      "Liver & gallbladder", "Pancreas", "Male genital & lower urinary tract", "Female genital tract & breast",
      "Endocrine system", "Bones, joints & soft tissue", "Peripheral nerves & muscles", "Central nervous system", "Skin",
    ],
  },
  {
    id: "bailey", name: "Bailey & Love's Short Practice of Surgery", subject: "সার্জারি",
    chapters: [
      "Metabolic response, shock & fluids", "Wounds, infection & tumours", "Trauma & ATLS", "Head, neck & thyroid",
      "Breast", "Endocrine surgery", "Cardiothoracic surgery", "Arterial & venous disorders", "Hernia & abdominal wall",
      "Oesophagus & stomach", "Small & large intestine", "Liver, gallbladder & pancreas", "Appendix, rectum & anus",
      "Urology", "Orthopaedics & fractures", "Neurosurgery", "Plastic surgery & burns",
    ],
  },
];
