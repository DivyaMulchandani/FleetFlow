export async function sendPasswordResetEmail(email, token) {
  // Mock sender for development/testing. Replace with provider integration in production.
  if (process.env.NODE_ENV !== 'production') {
    console.info('[password-reset-email]', { email, token });
  }
}
