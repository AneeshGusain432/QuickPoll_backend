import { z } from "zod";

const optionSchema = z
  .string()
  .trim()
  .min(1, { message: "Option text is required" })
  .max(300, { message: "Option text is too long" });

const questionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, { message: "Question is required" })
    .max(500, { message: "Question is too long" }),

  priorityLevel: z.enum(["low", "medium", "high"]).default("low"),
  isMandatory: z.boolean().default(true),

  options: z
    .array(optionSchema)
    .min(2, { message: "A question needs at least 2 options" })
    .max(20, { message: "Too many options" })
    .refine(
      (opts) => new Set(opts.map((o) => o.toLowerCase())).size === opts.length,
      { message: "Options must be unique" },
    ),
});

export const createPollSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Title is required" })
      .max(200, { message: "Title is too long" }),

    description: z.string().trim().max(200).optional(),

    responseMode: z.enum(["anonymous", "authenticated"]),
    status: z.enum(["draft", "active"]).default("draft"),

    expiresAt: z.coerce.date().refine((d) => d > new Date(), {
      message: "Expiry must be in the future",
    }),

    questions: z
      .array(questionSchema)
      .min(1, { message: "A poll needs at least 1 question" })
      .max(50, { message: "Too many questions" }),
  })
  .strict();

export const submitResponseSchema = z
  .object({
    answers: z
      .array(
        z.object({
          questionId: z.string().uuid({ message: "Invalid question ID" }),
          optionId: z.string().uuid({ message: "Invalid option ID" }),
        }),
      )
      .min(1, { message: "At least one answer is required" }),
  })
  .strict();

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

export type CreatePollInput = z.infer<typeof createPollSchema>;
