// Validación del passcode admin, siempre del lado del servidor.
export function checkPasscode(passcode: unknown): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return false;
  return typeof passcode === "string" && passcode === expected;
}
