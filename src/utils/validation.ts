// import { userRegex } from "./regex";
// import { signupSchema, loginSchema } from "../schemas/auth";
// import type { SignupFormData, LoginFormData } from "../types/form";

// export const validation = (
//   data: Partial<SignupFormData> | SignupFormData,
// ): Partial<Record<keyof SignupFormData, string>> => {
//   const isPartial = Object.keys(data).length < 4;
//   const schema = isPartial ? signupSchema.partial() : signupSchema;
//   const result = schema.safeParse(data);

//   if (!result.success) {
//     const errors: Partial<Record<keyof SignupFormData, string>> = {};
//     const issues = result.error.issues;

//     issues.forEach((issue) => {
//       const field = issue.path[0] as keyof SignupFormData;
//       if (field && !errors[field]) {
//         errors[field] = issue.message;
//       }
//     });

//     return errors;
//   }

//   return {};
// };

// export const loginValidation = (
//   data: Partial<LoginFormData> | LoginFormData,
// ): Partial<Record<keyof LoginFormData, string>> => {
//   const isPartial = Object.keys(data).length < 2;
//   const schema = isPartial ? loginSchema.partial() : loginSchema;
//   const result = schema.safeParse(data);

//   if (!result.success) {
//     const errors: Partial<Record<keyof LoginFormData, string>> = {};
//     const issues = result.error.issues;

//     issues.forEach((issue) => {
//       const field = issue.path[0] as keyof LoginFormData;
//       if (field && !errors[field]) {
//         errors[field] = issue.message;
//       }
//     });

//     return errors;
//   }

//   return {};
// };

// export const nameValidation = (data: string) => {
//   let newError = "";

//   // Full Name

//   if (!data) {
//     newError = "Name is required.";
//   } else if (!userRegex.test(data)) {
//     newError =
//       "Name must start with a letter and contain at least 3 characters. Only letters, numbers, and spaces are allowed.";
//   }

//   return newError;
// };
import { userRegex } from "./regex";
import { signupSchema, loginSchema } from "../schemas/auth";
import type { SignupFormData, LoginFormData } from "../types/form";

type ValidationIssue = {
  path: readonly PropertyKey[];
  message: string;
};
const formatZodErrors = <T extends string>(
  issues: readonly ValidationIssue[],
): Partial<Record<T, string>> => {
  const errors: Partial<Record<T, string>> = {};

  issues.forEach((issue) => {
    const path = issue.path[0];

    if (typeof path === "string") {
      const field = path as T;

      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
  });

  return errors;
};

export const validation = (
  data: Partial<SignupFormData> | SignupFormData,
): Partial<Record<keyof SignupFormData, string>> => {
  const isPartial = Object.keys(data).length < 4;
  const schema = isPartial ? signupSchema.partial() : signupSchema;
  const result = schema.safeParse(data);

  if (!result.success) {
    return formatZodErrors<keyof SignupFormData>(result.error.issues);
  }

  return {};
};

export const loginValidation = (
  data: Partial<LoginFormData> | LoginFormData,
): Partial<Record<keyof LoginFormData, string>> => {
  const isPartial = Object.keys(data).length < 2;
  const schema = isPartial ? loginSchema.partial() : loginSchema;
  const result = schema.safeParse(data);

  if (!result.success) {
    return formatZodErrors<keyof LoginFormData>(result.error.issues);
  }

  return {};
};

export const nameValidation = (data: string) => {
  let newError = "";

  // Full Name
  if (!data) {
    newError = "Name is required.";
  } else if (!userRegex.test(data)) {
    newError =
      "Name must start with a letter and contain at least 3 characters. Only letters, numbers, and spaces are allowed.";
  }

  return newError;
};
