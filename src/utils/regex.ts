export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
export const emailRegex =
  /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

export const userRegex = /^[a-zA-Z][a-zA-Z0-9 ]{2,}$/;

export const phoneRegex =
  /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
