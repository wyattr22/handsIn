export type ProductType = "prescription" | "otc" | "supplement";

export type ReviewStatus =
  | "read-clearly"
  | "needs-review"
  | "missing"
  | "corrected"
  | "confirmed";

export type Recipient = {
  id: string;
  name: string;
  relationship: string;
  initials: string;
  routine: {
    wake: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    bedtime: string;
  };
};

export type MedicationDraft = {
  recipientId: string;
  photos: string[];
  rawText: string;
  productType: ProductType;
  medicationName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  directions: string;
  prescriber: string;
  pharmacy: string;
  prescriptionNumber: string;
  quantity: string;
  refillsRemaining: string;
  expirationDate: string;
  fieldStatus: Record<string, ReviewStatus>;
  scheduleTimes: string[];
  scheduleReason: string;
  asNeeded: boolean;
  acknowledged: boolean;
};

export const demoRecipients: Recipient[] = [
  {
    id: "demo-dad",
    name: "Dad",
    relationship: "Father",
    initials: "DR",
    routine: {
      wake: "7:00 AM",
      breakfast: "8:00 AM",
      lunch: "12:30 PM",
      dinner: "6:30 PM",
      bedtime: "10:00 PM",
    },
  },
  {
    id: "demo-mom",
    name: "Mom",
    relationship: "Mother",
    initials: "MR",
    routine: {
      wake: "6:30 AM",
      breakfast: "7:30 AM",
      lunch: "12:00 PM",
      dinner: "6:00 PM",
      bedtime: "9:30 PM",
    },
  },
];

export const emptyMedicationDraft: MedicationDraft = {
  recipientId: "",
  photos: [],
  rawText: "",
  productType: "prescription",
  medicationName: "",
  activeIngredient: "",
  strength: "",
  dosageForm: "",
  directions: "",
  prescriber: "",
  pharmacy: "",
  prescriptionNumber: "",
  quantity: "",
  refillsRemaining: "",
  expirationDate: "",
  fieldStatus: {},
  scheduleTimes: [],
  scheduleReason: "",
  asNeeded: false,
  acknowledged: false,
};
