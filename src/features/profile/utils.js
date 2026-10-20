/** Pure helpers for the profile page. */

export const EMPTY_PASSWORD_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };

export const MIN_PASSWORD_LENGTH = 6;

/** Shape accepted by PUT /api/profile (see profileUpdateSchema). The role is managed from the Users page. */
export const toProfilePayload = ({ name, email, phone, avatar }) => ({ name, email, phone, avatar });

/** Returns a message when the password form is invalid, otherwise null. */
export const validatePasswordForm = ({ newPassword, confirmPassword }) => {
  if (newPassword !== confirmPassword) return "New password and confirm password do not match.";
  if (newPassword.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  return null;
};
