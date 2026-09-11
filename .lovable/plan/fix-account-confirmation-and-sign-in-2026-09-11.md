# Fix account confirmation and sign-in

## Outcome
Users who create an email/password account will be told to confirm their email instead of being sent into the app prematurely. Sign-in failures caused by an unconfirmed account will show actionable guidance.

## Changes
- Keep authentication account-only; do not add new profile data.
- Update account creation to inspect the returned session. When confirmation is required, show a dedicated “check your email” state and do not navigate to the dashboard.
- Add a resend-confirmation action for users who did not receive the email.
- Improve sign-in error handling so invalid or unconfirmed credentials do not look like a successful signup.
- Use a verified user check for existing-session redirects and for the protected app area.
- Add page-specific sign-in metadata.

## Validation
- Confirm the sign-up form transitions to the email-confirmation state.
- Confirm resend feedback and sign-in error feedback are visible and accurate.
- Confirm authenticated users still reach the dashboard and signed-out users remain on the sign-in page.
