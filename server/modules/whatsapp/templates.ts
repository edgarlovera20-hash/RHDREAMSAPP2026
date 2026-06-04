export const WHATSAPP_RECRUITMENT_BUTTONS = [
  { id: "recruitment_vacancies", title: "Vacantes" },
  { id: "recruitment_followup", title: "Seguimiento" },
  { id: "recruitment_interview", title: "Entrevista" },
] as const;

export const WHATSAPP_HUMAN_RECRUITER_ID = "recruitment_human";

export const WELCOME_MENU_TEXT = [
  "Bienvenido a Heavenly Dreams.",
  "",
  "1. Vacantes",
  "2. Seguimiento",
  "3. Entrevista",
  "4. Hablar con reclutador",
].join("\n");

export function normalizeRecruitmentOption(input: string) {
  const value = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (value === "1" || value.includes("vacante") || value === "recruitment_vacancies") return "vacancies";
  if (value === "2" || value.includes("seguimiento") || value === "recruitment_followup") return "followup";
  if (value === "3" || value.includes("entrevista") || value === "recruitment_interview") return "interview";
  if (value === "4" || value.includes("reclutador") || value.includes("humano") || value === WHATSAPP_HUMAN_RECRUITER_ID) return "human";
  if (value === "menu" || value === "inicio" || value === "hola") return "menu";
  return null;
}

export function recruitmentOptionReply(option: string | null) {
  switch (option) {
    case "vacancies":
      return "Perfecto. Para mostrarte vacantes, dime tu nombre completo, edad, ciudad y el puesto que te interesa.";
    case "followup":
      return "Claro. Para revisar tu seguimiento, comparte tu nombre completo o el telefono con el que iniciaste tu proceso.";
    case "interview":
      return "Con gusto reviso entrevista. Dime tu nombre completo, vacante de interes y disponibilidad de horario.";
    case "human":
      return "Te canalizo con reclutamiento humano. Mientras tanto, comparte tu nombre, telefono y la duda puntual para avanzar mas rapido.";
    case "menu":
      return WELCOME_MENU_TEXT;
    default:
      return null;
  }
}
