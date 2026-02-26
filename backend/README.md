# Backend Notes

## ICICI Breeze Daily Session Token Setup

FinanceOS uses env-based Breeze credentials in this slice. Session token generation is manual.

`FRONTEND_URL` is used for broker callback redirects after reconnect:
- Example: `FRONTEND_URL=http://localhost:5173`

1. Open ICICI Breeze portal and generate a fresh daily session token.
2. Update `backend/.env`:
   - `BREEZE_API_KEY`
   - `BREEZE_API_SECRET`
   - `BREEZE_SESSION_TOKEN`
3. Restart backend server after updating env.
4. Open Sync drawer and run `breeze -> Sync Now`.

If the token is expired, backend returns:
`Breeze session token expired. Update BREEZE_SESSION_TOKEN and try again.`
