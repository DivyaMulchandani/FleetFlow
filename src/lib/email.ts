export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  // Mock sender for development/testing. Replace with provider integration in production.
  if (process.env.NODE_ENV !== 'production') {
    console.info('[password-reset-email]', { email, token });
  }
}
