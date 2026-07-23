import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string({ message: "name is required" })
    .trim()
    .min(4, { message: "name is minimum 4 character long" })
    .max(100, { message: "name is too long" }),
  email: z
    .string({ message: "email is required" })
    .email()
    .max(322, { message: "email is too long" }),
  password: z
    .string({ message: "password is required" })
    .min(8, { message: "password is minimum 8 character long" })
    .max(20, { message: "password is too long" }),
});


export const signinSchema = z.object({
  email: z
    .string({ message: "email is required" })
    .email()
    .max(322, { message: "email is too long" }),
  password: z
    .string({ message: "password is required" })
    .min(8, { message: "password is minimum 8 character long" })
    .max(20, { message: "password is too long" }),
});
