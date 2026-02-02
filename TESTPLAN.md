# Testplan - Authenticatie & Account Management

## Overzicht

Dit testplan dekt alle authenticatie-flows van de AI Examentrainer applicatie.
Gebruik dit als checklist bij elke deployment of na wijzigingen aan auth-code.

---

## 1. Account Aanmaken (Registratie via Checkout)

### 1.1 Formulier Validatie

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 1.1.1 | Leeg formulier indienen | Foutmelding: "Vul alle velden in" | |
| 1.1.2 | Ongeldig email-adres (bijv. "test@") | Foutmelding: "Vul een geldig e-mailadres in" | |
| 1.1.3 | Wachtwoord < 8 tekens | Foutmelding: "Wachtwoord moet minimaal 8 tekens zijn" | |
| 1.1.4 | Wachtwoord zonder hoofdletter | Foutmelding: "Wachtwoord moet minimaal 1 hoofdletter bevatten" | |
| 1.1.5 | Wachtwoord zonder kleine letter | Foutmelding: "Wachtwoord moet minimaal 1 kleine letter bevatten" | |
| 1.1.6 | Wachtwoord zonder cijfer | Foutmelding: "Wachtwoord moet minimaal 1 cijfer bevatten" | |
| 1.1.7 | Geldig email + sterk wachtwoord + niveau | Doorgestuurd naar Mollie betaalpagina | |
| 1.1.8 | Alle 3 niveaus testen (VMBO-TL, HAVO, VWO) | Elk niveau wordt correct opgeslagen | |

### 1.2 Betalingsflow

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 1.2.1 | Succesvolle betaling via Mollie | Redirect naar payment callback pagina met "Betaling geslaagd!" | |
| 1.2.2 | Mislukte betaling via Mollie | Foutmelding met optie om opnieuw te proberen | |
| 1.2.3 | Geannuleerde betaling | Foutmelding met optie om opnieuw te proberen | |
| 1.2.4 | Verlopen betaling | Foutmelding met optie om opnieuw te proberen | |
| 1.2.5 | Payment callback zonder payment ID | "Geen betaling gevonden" met optie om in te loggen | |
| 1.2.6 | Account wordt aangemaakt na succesvolle betaling | Student profiel + auth user + subscription bestaan in DB | |
| 1.2.7 | Trial periode van 3 dagen wordt gestart | Subscription status = "trial", trial_ends_at = +3 dagen | |
| 1.2.8 | Mollie recurring subscription wordt aangemaakt | Mollie subscription start na trial einde | |

### 1.3 Dubbele Registratie

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 1.3.1 | Registreren met email die al actieve trial heeft | Foutmelding: "Registratie niet mogelijk" | |
| 1.3.2 | Registreren met email die al actief abonnement heeft | Foutmelding: "Registratie niet mogelijk" | |
| 1.3.3 | Registreren met email van verlopen abonnement | Nieuwe registratie wordt gestart | |
| 1.3.4 | Registreren met pending registration (retry) | Oude pending wordt verwijderd, nieuwe aangemaakt | |

### 1.4 Rate Limiting

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 1.4.1 | 10 registraties per uur per IP | 11e poging geeft 429 error met Retry-After header | |

---

## 2. Inloggen

### 2.1 Login Formulier

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 2.1.1 | Leeg formulier indienen | Foutmelding: "Vul je email en wachtwoord in" | |
| 2.1.2 | Correct email + correct wachtwoord | Ingelogd, redirect naar dashboard | |
| 2.1.3 | Correct email + verkeerd wachtwoord | Foutmelding: "Het ingevoerde e-mailadres of wachtwoord is onjuist..." | |
| 2.1.4 | Niet-bestaand email + willekeurig wachtwoord | Foutmelding: "Het ingevoerde e-mailadres of wachtwoord is onjuist..." | |
| 2.1.5 | Email niet bevestigd | Foutmelding: "Je email is nog niet bevestigd" | |
| 2.1.6 | Te veel inlogpogingen (Supabase rate limit) | Foutmelding: "Te veel inlogpogingen" | |
| 2.1.7 | Admin email inloggen | Redirect naar /admin in plaats van /dashboard | |
| 2.1.8 | Student email inloggen | Redirect naar /dashboard | |
| 2.1.9 | Al ingelogd en navigeer naar /login | Automatische redirect naar dashboard/admin | |

### 2.2 Login State Management

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 2.2.1 | Na inloggen: pagina refreshen | Sessie blijft geldig, gebruiker blijft ingelogd | |
| 2.2.2 | Na inloggen: profiel wordt geladen | Student naam, niveau en vakken zijn beschikbaar | |
| 2.2.3 | Nieuwe gebruiker zonder profiel | Default profiel wordt aangemaakt (naam uit email) | |
| 2.2.4 | isLoading state tijdens initialisatie | Loading spinner wordt getoond | |

---

## 3. Uitloggen

### 3.1 Logout Flow

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 3.1.1 | Uitloggen via dashboard knop | Supabase sessie geinvalideerd + localStorage gewist + redirect naar / | |
| 3.1.2 | Na uitloggen: terug-knop in browser | Geen toegang tot dashboard, redirect naar /login | |
| 3.1.3 | Na uitloggen: direct /dashboard openen | Redirect naar /login | |
| 3.1.4 | Na uitloggen: geen Supabase tokens in localStorage | Alle sb-* keys zijn verwijderd | |
| 3.1.5 | Uitloggen bij netwerkfout | State wordt lokaal gereset, gebruiker is uitgelogd | |

---

## 4. Wachtwoord Vergeten / Reset

### 4.1 Wachtwoord Vergeten Pagina

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 4.1.1 | Leeg formulier indienen | Foutmelding: "Vul je email adres in" | |
| 4.1.2 | Ongeldig email-adres | Foutmelding: "Vul een geldig email adres in" | |
| 4.1.3 | Bestaand email-adres | Succes: "Email verzonden!" | |
| 4.1.4 | Niet-bestaand email-adres | Succes: "Als dit email adres bij ons bekend is..." (geen info leak) | |
| 4.1.5 | Te veel verzoeken | Foutmelding over rate limiting | |

### 4.2 Wachtwoord Reset Pagina

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 4.2.1 | Reset link openen met geldige tokens | Reset formulier wordt getoond | |
| 4.2.2 | Reset link openen met verlopen tokens | "Ongeldige of verlopen link" pagina | |
| 4.2.3 | Reset link openen zonder tokens | "Ongeldige of verlopen link" pagina | |
| 4.2.4 | Wachtwoord < 8 tekens invoeren | Foutmelding validatie | |
| 4.2.5 | Wachtwoord zonder hoofdletter | Foutmelding validatie | |
| 4.2.6 | Wachtwoord zonder kleine letter | Foutmelding validatie | |
| 4.2.7 | Wachtwoord zonder cijfer | Foutmelding validatie | |
| 4.2.8 | Wachtwoorden komen niet overeen | Foutmelding: "Wachtwoorden komen niet overeen" | |
| 4.2.9 | Geldig nieuw wachtwoord instellen | Succes: "Wachtwoord gewijzigd!" + redirect knop | |
| 4.2.10 | Zelfde wachtwoord als huidige | Foutmelding: "Je nieuwe wachtwoord moet anders zijn" | |
| 4.2.11 | Na reset: inloggen met nieuw wachtwoord | Succesvol ingelogd | |
| 4.2.12 | Na reset: inloggen met oud wachtwoord | Login mislukt | |

---

## 5. Route Beveiliging

### 5.1 Protected Routes

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 5.1.1 | /dashboard zonder login | Redirect naar /login | |
| 5.1.2 | /exam zonder login | Redirect naar /login | |
| 5.1.3 | /chat zonder login | Redirect naar /login | |
| 5.1.4 | /flashcards zonder login | Redirect naar /login | |
| 5.1.5 | /settings zonder login | Redirect naar /login | |
| 5.1.6 | /admin zonder login | Redirect naar /login | |
| 5.1.7 | /admin als student (niet-admin) | Redirect naar /dashboard | |
| 5.1.8 | /admin als admin | Admin dashboard wordt getoond | |

### 5.2 Public Routes

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 5.2.1 | / (landing page) | Altijd toegankelijk | |
| 5.2.2 | /login | Toegankelijk als niet ingelogd | |
| 5.2.3 | /checkout | Altijd toegankelijk | |
| 5.2.4 | /forgot-password | Toegankelijk als niet ingelogd | |
| 5.2.5 | /reset-password | Altijd toegankelijk (tokens in URL) | |
| 5.2.6 | /payment/callback | Altijd toegankelijk | |
| 5.2.7 | Onbekende route (bijv. /xyz) | Redirect naar / | |

---

## 6. Admin Gebruikersbeheer

### 6.1 Student Aanmaken (Admin)

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 6.1.1 | Student aanmaken met geldig email/naam/niveau/wachtwoord | Student verschijnt in lijst | |
| 6.1.2 | Student aanmaken zonder Bearer token | 401 Unauthorized | |
| 6.1.3 | Student aanmaken als niet-admin | 403 Forbidden | |
| 6.1.4 | Student aanmaken met bestaand email | Foutmelding: "Dit email adres is al geregistreerd" | |
| 6.1.5 | Student aanmaken met wachtwoord < 8 tekens | Foutmelding | |
| 6.1.6 | Student aanmaken met ongeldig email | Foutmelding: "Ongeldig email formaat" | |
| 6.1.7 | Student aanmaken met ongeldig niveau | Foutmelding: "Ongeldig niveau" | |

### 6.2 Student Verwijderen (Admin)

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 6.2.1 | Student verwijderen met email | Auth user + profiel verwijderd | |
| 6.2.2 | Student verwijderen met userId | Auth user verwijderd | |
| 6.2.3 | Admin proberen te verwijderen | 403: "Kan geen admin verwijderen" | |
| 6.2.4 | Niet-bestaande student verwijderen | 404: "Gebruiker niet gevonden" | |

---

## 7. Subscription Management

### 7.1 Subscription Status Check

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 7.1.1 | Check email zonder subscription | hasAccess: false, status: "none" | |
| 7.1.2 | Check email met actieve trial | hasAccess: true, status: "trial", daysLeft > 0 | |
| 7.1.3 | Check email met verlopen trial | hasAccess: false, status: "trial_expired" | |
| 7.1.4 | Check email met actief abonnement | hasAccess: true, status: "active" | |
| 7.1.5 | Check email met verlopen abonnement | hasAccess: false, status: "expired" | |
| 7.1.6 | Check email met opgezegd abo (nog in periode) | hasAccess: true, status: "cancelled", daysLeft > 0 | |
| 7.1.7 | Check email met opgezegd abo (periode voorbij) | hasAccess: false, status: "cancelled" | |
| 7.1.8 | Check email met pending betaling | hasAccess: false, status: "pending" | |

### 7.2 Subscription Opzeggen

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 7.2.1 | Opzeggen met geldig token | Status: "cancelled", accessUntil wordt getoond | |
| 7.2.2 | Opzeggen zonder token | 401 Unauthorized | |
| 7.2.3 | Opzeggen met verlopen token | 401 Ongeldige sessie | |
| 7.2.4 | Opzeggen wanneer geen abonnement | 404: "Geen abonnement gevonden" | |
| 7.2.5 | Na opzeggen: Mollie subscription geannuleerd | Mollie subscription status = cancelled | |
| 7.2.6 | Na opzeggen: toegang tot einde periode | Student kan nog inloggen en features gebruiken | |

---

## 8. Webhook Verwerking (Mollie)

### 8.1 Verificatie Betaling

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 8.1.1 | Webhook met status "paid" | Auth user + profiel + subscription aangemaakt | |
| 8.1.2 | Webhook met status "failed" | Pending registration verwijderd | |
| 8.1.3 | Webhook met status "canceled" | Pending registration verwijderd | |
| 8.1.4 | Webhook met status "expired" | Pending registration verwijderd | |
| 8.1.5 | Dubbele webhook voor zelfde payment | Geen dubbele accounts (idempotent) | |
| 8.1.6 | Webhook voor bestaand account | "Account already exists", geen error | |

### 8.2 Recurring Betaling

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 8.2.1 | Succesvolle maandelijkse betaling | Status: "active", periode verlengd met 1 maand | |
| 8.2.2 | Mislukte maandelijkse betaling | Status: "payment_failed", student gedeactiveerd | |

---

## 9. Beveiligings-checks

### 9.1 API Beveiliging

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 9.1.1 | Admin API zonder auth header | 401 response | |
| 9.1.2 | Admin API met ongeldige token | 401 response | |
| 9.1.3 | Admin API met student token | 403 response | |
| 9.1.4 | Cancel-subscription met andermans token | Kan alleen eigen abonnement opzeggen | |
| 9.1.5 | Check-payment-status met verzonnen ID | 404 of "Betaling niet gevonden" | |
| 9.1.6 | Check-payment-status met ongeldig formaat | 400: "Ongeldig betaling ID formaat" | |
| 9.1.7 | Service role key niet in browser code | Geen SUPABASE_SERVICE_ROLE_KEY in frontend | |
| 9.1.8 | Wachtwoorden niet in API responses | Geen password velden in responses | |
| 9.1.9 | Error details niet gelekt naar client | Geen stack traces of interne details in responses | |

### 9.2 Input Validatie

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 9.2.1 | XSS in email veld | Input wordt niet als HTML gerenderd | |
| 9.2.2 | SQL injection in email veld | Supabase client sanitized input | |
| 9.2.3 | Zeer lang wachtwoord (1000+ tekens) | Geen crash, normaal foutbericht | |
| 9.2.4 | Unicode tekens in naam | Correct opgeslagen en weergegeven | |

---

## 10. Edge Cases & Foutafhandeling

### 10.1 Netwerk & Server Fouten

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 10.1.1 | Login bij Supabase downtime | Foutmelding: "Er is een probleem met de server" | |
| 10.1.2 | Checkout bij Mollie downtime | Foutmelding: "Er ging iets mis" | |
| 10.1.3 | Pagina refreshen tijdens checkout | Form staat weer in beginstaat | |
| 10.1.4 | Browser terug-knop na betaling | Payment callback pagina handelt dit correct af | |
| 10.1.5 | localStorage niet beschikbaar | URL payment ID fallback wordt gebruikt | |

### 10.2 Sessie Scenarios

| # | Test | Verwacht resultaat | Status |
|---|------|-------------------|--------|
| 10.2.1 | Token verloopt tijdens gebruik | Supabase auto-refresh vernieuwt de sessie | |
| 10.2.2 | Meerdere tabs open, uitloggen in 1 tab | Alle tabs detecteren uitlog via onAuthStateChange | |
| 10.2.3 | Wachtwoord reset in 1 tab, andere tab open | Reset flow werkt normaal, andere tab sessie verloopt | |

---

## Hoe dit testplan te gebruiken

1. **Voor elke deployment**: Loop door secties 1-5 (kernfunctionaliteit)
2. **Na auth-wijzigingen**: Loop door alle secties
3. **Na Mollie-wijzigingen**: Focus op secties 1.2, 7, 8
4. **Na admin-wijzigingen**: Focus op secties 6, 9.1
5. **Vul de Status kolom** in met: PASS, FAIL, of SKIP

## Automatische Tests

De volgende tests draaien automatisch via `npx vitest run`:

- `tests/services/auth.test.ts` - Auth service unit tests (23 tests)
- `tests/services/subscription.test.ts` - Subscription logica (21 tests)
- `tests/api/endpoints.test.ts` - API endpoint tests (31 tests)
- `tests/database/connection.test.ts` - Database connectie (21 tests)
- `tests/services/supabaseService.test.ts` - Supabase service (17 tests)

**Totaal: 113 automatische tests**
