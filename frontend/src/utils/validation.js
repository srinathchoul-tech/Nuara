export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getEmailError(value) {
  const email = value.trim();

  if (!email) {
    return "Enter your email address.";
  }

  if (!isValidEmail(email)) {
    return "Enter a valid email address, like name@example.com.";
  }

  return "";
}

export function getPasswordError(value) {
  if (!value) {
    return "Enter your password.";
  }

  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return "";
}
