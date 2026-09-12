export async function verifyTurnstileToken(token: FormDataEntryValue | null) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;
  if (typeof token !== "string" || !token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const result = await response.json();
    return result?.success === true;
  } catch {
    return false;
  }
}
