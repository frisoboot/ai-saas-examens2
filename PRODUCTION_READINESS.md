# Production Readiness Checklist - AI Examentrainer

> Status: **In review** | Datum: 2026-02-07

Dit document bevat alle issues die opgelost moeten worden voordat het platform productie-klaar is, geordend op prioriteit.

---

## 🔴 KRITIEK (Moet gefixt voor lancering)

### 1. Geen authenticatie op `/api/gemini`
**Bestand:** `api/gemini.ts`
**Probleem:** Het AI endpoint controleert alleen rate limiting op IP, maar verifieert niet of de caller een ingelogde gebruiker is. Iedereen met de URL kan AI-calls maken.
**Oplossing:** Voeg Bearer token verificatie toe (Supabase JWT check) voordat requests worden verwerkt.

### 2. Geen authenticatie op `/api/check-subscription`
**Bestand:** `api/check-subscription.ts`
**Probleem:** Dit endpoint accepteert een `email` parameter en retourneert abonnementsinformatie zonder enige authenticatie. Iedereen kan de subscriptionstatus van willekeurige gebruikers opvragen.
**Oplossing:** Vereis Bearer token en valideer dat de ingelogde gebruiker alleen eigen data kan opvragen.

### 3. Geen authenticatie op `/api/check-payment-status`
**Bestand:** `api/check-payment-status.ts`
**Probleem:** Accepteert een `payment_id` parameter zonder auth check. Potentieel informatie-lek over betalingen.
**Oplossing:** Vereis Bearer token verificatie.

### 4. Hardcoded `'salt'` in wachtwoord-encryptie
**Bestand:** `api/mollie-webhook.ts:31`
**Probleem:** De `scryptSync` call gebruikt een hardcoded string `'salt'` als salt. Dit ondermijnt de cryptografische beveiliging van de wachtwoord-encryptie.
**Oplossing:** Genereer een random salt per wachtwoord en sla deze op naast de encrypted data (bijv. als 4e segment in het `iv:authTag:encrypted` formaat).

### 5. Open CORS in admin endpoints
**Bestanden:** `api/admin/users.ts`, `api/admin/health-check.ts`
**Probleem:** Deze admin endpoints reflecteren elke origin terug in de CORS header in plaats van de gedeelde `setCorsHeaders()` utility te gebruiken.
**Oplossing:** Vervang de handmatige CORS headers door `setCorsHeaders(res, req.headers.origin)`.

### 6. Geen Content-Security-Policy header
**Bestand:** `vercel.json`
**Probleem:** Er is geen CSP header geconfigureerd. Zonder CSP is het platform kwetsbaar voor XSS-aanvallen via ingevoegde scripts.
**Oplossing:** Voeg een CSP header toe, bijv.:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://gateway.ai.cloudflare.com;
```

### 7. Geen Error Boundary component
**Probleem:** De React app heeft geen ErrorBoundary. Een onafgevangen JavaScript error crasht de hele applicatie.
**Oplossing:** Voeg een top-level `<ErrorBoundary>` component toe in `index.tsx` of `App.tsx` die crashes opvangt en een gebruiksvriendelijke foutpagina toont.

---

## 🟠 HOOG (Belangrijk voor betrouwbaarheid)

### 8. JS bundle is ~987 kB (geen code splitting)
**Bestand:** `App.tsx`
**Probleem:** Alle routes worden synchronous geïmporteerd. De totale JS bundle is bijna 1 MB, wat de initiële laadtijd significant beïnvloedt, vooral op mobiel.
**Oplossing:** Gebruik `React.lazy()` + `Suspense` voor route-level code splitting:
```tsx
const StudentDashboard = React.lazy(() => import('./components/StudentDashboard'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const ExamTaker = React.lazy(() => import('./components/ExamTaker'));
// etc.
```

### 9. In-memory rate limiter is niet distributed
**Bestand:** `api/utils/rateLimiter.ts`
**Probleem:** De rate limiter gebruikt een in-memory `Map`. Bij Vercel worden serverless functions over meerdere instances gedistribueerd, waardoor rate limits niet gedeeld worden. Een aanvaller kan limiet ontwijken door requests naar verschillende instances te sturen.
**Oplossing:** Migreer naar Upstash Redis (gratis tier beschikbaar) of Vercel KV voor een distributed rate limiter.

### 10. Geen Permissions-Policy header
**Bestand:** `vercel.json`
**Probleem:** Er ontbreekt een `Permissions-Policy` header om browser-features te beperken (camera, microfoon, geolocation etc.).
**Oplossing:** Voeg toe aan `vercel.json`:
```json
{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
```

### 11. Geen error tracking / monitoring
**Probleem:** Er is geen Sentry, LogRocket, of vergelijkbaar systeem. Production errors zijn onzichtbaar tenzij je handmatig Vercel logs checkt.
**Oplossing:** Integreer Sentry (gratis tier) voor error tracking op zowel frontend als backend.

### 12. Webhook retourneert foutdetails in response body
**Bestand:** `api/mollie-webhook.ts:573`
**Probleem:** Bij errors wordt `error.message` meegestuurd in de 200-response. Dit kan interne informatie lekken.
**Oplossing:** Log error details server-side, retourneer alleen `{ received: true }`.

### 13. 6 npm vulnerabilities (4 high)
**Probleem:** `npm audit` toont 6 kwetsbaarheden, waarvan 4 high severity (in `undici` en `tar`).
**Oplossing:** Run `npm audit fix` voor non-breaking fixes. Evalueer `npm audit fix --force` voor de breaking change in `@vercel/node`.

### 14. `check-subscription` lekt interne error details
**Bestand:** `api/check-subscription.ts:170-171`
**Probleem:** De catch block retourneert `error.message` in de response (`details` field). Dit kan stack traces of interne info naar de client sturen.
**Oplossing:** Verwijder het `details` veld uit de error response.

---

## 🟡 MEDIUM (Moet voor of kort na lancering)

### 15. Geen `Permissions-Policy` of `Feature-Policy` header
Al behandeld bij punt 10.

### 16. `listUsers()` in webhook haalt ALLE users op
**Bestand:** `api/mollie-webhook.ts:180`
**Probleem:** Bij duplicate user errors wordt `supabase.auth.admin.listUsers()` zonder paginatie aangeroepen. Bij veel gebruikers wordt dit traag en geheugenintensief.
**Oplossing:** Gebruik een directe query op email in plaats van de hele userlijst ophalen, of gebruik de Supabase admin API met email filter.

### 17. Ongebruikte dependencies
**Bestand:** `package.json`
**Probleem:** De packages `express`, `cors`, en `openai` staan als dependencies maar worden mogelijk niet gebruikt (het project gebruikt Vercel serverless, eigen CORS utility, en Vercel AI Gateway).
**Oplossing:** Verifieer of deze packages ergens geïmporteerd worden. Zo niet, verwijder ze om de bundle/install kleiner te maken.

### 18. `@types/bcryptjs` in dependencies i.p.v. devDependencies
**Bestand:** `package.json`
**Probleem:** Type-packages zijn alleen nodig bij build/development.
**Oplossing:** Verplaats naar `devDependencies`.

### 19. `@mollie/api-client` is een beta versie
**Bestand:** `package.json`
**Probleem:** Version `4.0.0-beta.4` kan breaking changes bevatten bij updates.
**Oplossing:** Pin de versie exact en evalueer of een stabiele release beschikbaar is.

### 20. Package version is `0.0.0`
**Bestand:** `package.json`
**Probleem:** De standaard placeholder versie is nooit bijgewerkt.
**Oplossing:** Zet naar `1.0.0` bij lancering.

### 21. `PASSWORD_ENCRYPTION_KEY` fallback naar Mollie API key
**Bestand:** `api/mollie-webhook.ts:141`
**Probleem:** Als `PASSWORD_ENCRYPTION_KEY` niet is geconfigureerd, wordt de Mollie API key als encryptie-sleutel gebruikt. Dit is een onveilige fallback die gevoelige keys hergebruikt.
**Oplossing:** Maak `PASSWORD_ENCRYPTION_KEY` een verplichte env var (fail als niet geconfigureerd).

### 22. Geen database connection pooling configuratie
**Probleem:** Elke serverless function invocation maakt een nieuwe Supabase client aan. Bij hoge load kan dit problemen veroorzaken met connection limits.
**Oplossing:** Gebruik Supabase connection pooling (Supavisor) en configureer de juiste connection string.

---

## 🟢 LAAG (Nice to have)

### 23. Geen gestructureerde logging
**Probleem:** Alle logging is via `console.log/error`. Er is geen structured logging (JSON format) met consistent log levels.
**Oplossing:** Overweeg een lichtgewicht logger met JSON output voor betere doorzoekbaarheid in Vercel logs.

### 24. Test coverage beperkt
**Probleem:** Er zijn 5 testbestanden met 113 tests. Frontend components hebben geen tests. Services worden goed getest, maar UI edge cases niet.
**Oplossing:** Voeg component tests toe voor kritieke flows (login, checkout, exam-taking).

### 25. Geen sitemap dynamisch gegenereerd
**Probleem:** `sitemap.xml` is een statisch bestand. Bij nieuwe landing pages moet het handmatig bijgewerkt worden.
**Oplossing:** Overweeg automatische generatie bij build time.

### 26. `localhost` patterns in CORS voor productie
**Bestand:** `api/utils/cors.ts:18-20`
**Probleem:** Localhost patterns zijn altijd actief, ook in productie. Dit is geen direct security risico (CORS is browser-enforced), maar het is netter om dit te beperken tot development.
**Oplossing:** Check `NODE_ENV` of een environment flag om localhost patterns alleen in development toe te staan.

### 27. Prompt injection bescherming is beperkt
**Bestand:** `api/gemini.ts:655-658`
**Probleem:** De `escapePromptString` functie escaped slechts 4 speciale tekens. Geavanceerde prompt injection via user input (open vragen, chat) is nog mogelijk.
**Oplossing:** Overweeg extra sanitization, input length limits, en output validation.

---

## Samenvatting

| Prioriteit | Aantal | Status |
|-----------|--------|--------|
| 🔴 Kritiek | 7 | Open |
| 🟠 Hoog | 7 | Open |
| 🟡 Medium | 8 | Open |
| 🟢 Laag | 5 | Open |
| **Totaal** | **27** | **Open** |

### Aanbevolen aanpak
1. **Week 1**: Los alle 7 kritieke issues op (security gaten dichten)
2. **Week 2**: Pak de 7 hoge issues aan (betrouwbaarheid + performance)
3. **Doorlopend**: Medium en lage issues als onderdeel van reguliere development
