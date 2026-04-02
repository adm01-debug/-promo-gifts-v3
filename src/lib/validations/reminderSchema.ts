import { z } from "zod";

export const followUpReminderSchema = z.object({
  quote_id: z.string().uuid("ID do orçamento inválido"),
  scheduled_for: z.string().min(1, "Data agendada é obrigatória").refine(
    (val) => new Date(val) > new Date(),
    "Data deve ser no futuro"
  ),
  reminder_type: z.enum(["first_contact", "follow_up", "negotiation", "closing", "custom"], {
    required_error: "Tipo de lembrete é obrigatório",
  }),
  notes: z.string().max(500, "Notas devem ter no máximo 500 caracteres").optional().or(z.literal("")),
});

export type FollowUpReminderFormData = z.infer<typeof followUpReminderSchema>;
