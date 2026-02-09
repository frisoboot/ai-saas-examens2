# Uitgebreid Testplan - AI Examentrainer

## Overzicht

Dit document beschrijft het volledige testplan voor de AI Examentrainer applicatie. Het omvat zowel bestaande als nog te schrijven automatische tests, georganiseerd per prioriteit en categorie.

### Huidige Teststatus

| Categorie | Bestanden | Met Tests | Zonder Tests | Dekking |
|-----------|-----------|-----------|--------------|---------|
| **Services** | 11 | 4 | 7 | 36% |
| **API Endpoints** | 12 | 3 | 9 | 25% |
| **Components** | 36 | 0 | 36 | 0% |
| **Contexts** | 2 | 0 | 2 | 0% |
| **Totaal** | **61** | **7** | **54** | **~11%** |

### Bestaande Tests (113 tests in 5 bestanden)

| Bestand | Aantal | Status |
|---------|--------|--------|
| `tests/services/auth.test.ts` | 23 | Bestaand |
| `tests/services/subscription.test.ts` | 21 | Bestaand |
| `tests/api/endpoints.test.ts` | 31 | Bestaand |
| `tests/database/connection.test.ts` | 21 | Bestaand |
| `tests/services/supabaseService.test.ts` | 17 | Bestaand |

---

## Prioriteiten

- **P0 - Kritiek**: Betalingen, authenticatie, dataverlies-scenario's
- **P1 - Hoog**: Kernfunctionaliteit (examens, AI-integratie, voortgang)
- **P2 - Middel**: UI-componenten, admin-tools, import/export
- **P3 - Laag**: Cosmetische UI, edge cases, hulppagina's

---

## P0 - Kritieke Tests

### 1. API: `/api/create-checkout.ts`

**Testbestand**: `tests/api/create-checkout.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 1.1 | POST met geldig email, wachtwoord (8+ tekens, hoofd+klein+cijfer), niveau | `{ success: true, checkoutUrl, paymentId }` | Unit |
| 1.2 | POST zonder email | 400: "Email is verplicht" | Unit |
| 1.3 | POST met ongeldig email formaat | 400: "Ongeldig email formaat" | Unit |
| 1.4 | POST met wachtwoord < 8 tekens | 400: wachtwoord validatiefout | Unit |
| 1.5 | POST met wachtwoord zonder hoofdletter | 400: wachtwoord validatiefout | Unit |
| 1.6 | POST met wachtwoord zonder kleine letter | 400: wachtwoord validatiefout | Unit |
| 1.7 | POST met wachtwoord zonder cijfer | 400: wachtwoord validatiefout | Unit |
| 1.8 | POST met bestaande actieve subscription | 400: "Registratie niet mogelijk" | Unit |
| 1.9 | GET request (verkeerde methode) | 405: Method not allowed | Unit |
| 1.10 | OPTIONS request | 200 met CORS headers | Unit |
| 1.11 | Rate limiting: 11e poging binnen 1 uur | 429 met Retry-After header | Unit |
| 1.12 | Plan "monthly" -> correcte prijs €14.95 | Mollie payment met juist bedrag | Unit |
| 1.13 | Plan "exam_package" -> correcte prijs €39.00 | Mollie payment met juist bedrag | Unit |
| 1.14 | Plan "yearly" -> correcte prijs €99.00 | Mollie payment met juist bedrag | Unit |
| 1.15 | Wachtwoord wordt AES-256-GCM versleuteld opgeslagen | Encrypted string in pending_registrations | Unit |
| 1.16 | Pending registration bevat email, encrypted password, level, plan | Alle velden aanwezig | Unit |

**Mocking**: Mollie API client, Supabase service role client

---

### 2. API: `/api/mollie-webhook.ts`

**Testbestand**: `tests/api/mollie-webhook.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 2.1 | Webhook met betaling status "paid" (eerste betaling monthly) | Auth user + profiel + subscription aangemaakt, status "active" | Unit |
| 2.2 | Webhook met betaling status "paid" (exam_package) | Account + subscription voor 4 maanden | Unit |
| 2.3 | Webhook met betaling status "paid" (yearly) | Account + subscription voor 12 maanden | Unit |
| 2.4 | Webhook met status "failed" | Pending registration verwijderd | Unit |
| 2.5 | Webhook met status "canceled" | Pending registration verwijderd | Unit |
| 2.6 | Webhook met status "expired" | Pending registration verwijderd | Unit |
| 2.7 | Dubbele webhook voor zelfde payment_id | Idempotent: geen dubbel account, geen error | Unit |
| 2.8 | Webhook voor reeds bestaand account | "Account already exists", geen crash | Unit |
| 2.9 | Recurring payment succesvol | Subscription periode verlengd +1 maand | Unit |
| 2.10 | Recurring payment mislukt | Status "payment_failed", student gedeactiveerd | Unit |
| 2.11 | Wachtwoord correct gedecrypt uit pending_registrations | Auth user aangemaakt met gedecrypt wachtwoord | Unit |
| 2.12 | POST zonder body.id | 400: "Missing payment ID" | Unit |
| 2.13 | Webhook met onbekend payment_id (geen pending) | Graceful handling, geen crash | Unit |
| 2.14 | Mollie recurring subscription wordt aangemaakt na eerste betaling | createSubscription() aangeroepen met juiste params | Unit |

**Mocking**: Mollie API (getPayment, createSubscription), Supabase admin (createUser, from)

---

### 3. API: `/api/cancel-subscription.ts`

**Testbestand**: `tests/api/cancel-subscription.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 3.1 | POST met geldig token en actieve subscription | `{ success: true, accessUntil }` | Unit |
| 3.2 | POST zonder Authorization header | 401: Unauthorized | Unit |
| 3.3 | POST met ongeldige token | 401: Ongeldige sessie | Unit |
| 3.4 | POST met token van user zonder subscription | 404: "Geen abonnement gevonden" | Unit |
| 3.5 | Annulering van exam_package plan | 400: niet opzegbaar (eenmalig) | Unit |
| 3.6 | Annulering van yearly plan | 400: niet opzegbaar (eenmalig) | Unit |
| 3.7 | Na annulering: DB status = "cancelled" | Subscription record updated | Unit |
| 3.8 | Na annulering: Mollie subscription geannuleerd | cancelSubscription() aangeroepen | Unit |
| 3.9 | OPTIONS request | 200 met CORS headers | Unit |
| 3.10 | GET request (verkeerde methode) | 405: Method not allowed | Unit |

**Mocking**: Mollie API, Supabase auth + from

---

### 4. API: `/api/check-payment-status.ts`

**Testbestand**: `tests/api/check-payment-status.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 4.1 | GET met geldig payment_id (status "paid") | `{ success: true, status: "paid", accountReady: true }` | Unit |
| 4.2 | GET met geldig payment_id (status "pending") | `{ status: "pending", accountReady: false }` | Unit |
| 4.3 | GET met geldig payment_id (status "failed") | `{ status: "failed" }` | Unit |
| 4.4 | GET zonder payment_id | 400: "Payment ID is verplicht" | Unit |
| 4.5 | GET met ongeldig payment_id formaat (niet tr_) | 400: "Ongeldig betaling ID formaat" | Unit |
| 4.6 | GET met onbekend payment_id | 404 of foutmelding | Unit |
| 4.7 | OPTIONS request | 200 met CORS headers | Unit |

**Mocking**: Mollie API (getPayment), Supabase

---

### 5. Context: `AuthContext.tsx`

**Testbestand**: `tests/contexts/AuthContext.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 5.1 | Provider mount: geen sessie -> isAuthenticated=false, isLoading=false | Correcte initialisatie | Unit |
| 5.2 | Provider mount: geldige sessie -> laadt profiel, isAuthenticated=true | User + profile geladen | Unit |
| 5.3 | signIn met geldige credentials | user, session, profile gezet | Unit |
| 5.4 | signIn met ongeldige credentials | error string gereturned, state ongewijzigd | Unit |
| 5.5 | signOut | Alle state gereset naar null/false | Unit |
| 5.6 | Admin email detectie | isAdmin=true voor VITE_ADMIN_EMAILS | Unit |
| 5.7 | Niet-admin email | isAdmin=false | Unit |
| 5.8 | onAuthStateChange: SIGNED_OUT event | State gereset | Unit |
| 5.9 | onAuthStateChange: TOKEN_REFRESHED event | Sessie bijgewerkt | Unit |
| 5.10 | Subscription check voor niet-admin | subscriptionStatus gevuld | Unit |
| 5.11 | Subscription check overgeslagen voor admin | hasSubscriptionAccess=true zonder API call | Unit |
| 5.12 | refreshProfile() haalt nieuw profiel op | Profile state bijgewerkt | Unit |

**Mocking**: Supabase auth, supabaseService (getStudentByEmail)

---

## P1 - Hoge Prioriteit Tests

### 6. Service: `geminiService.ts`

**Testbestand**: `tests/services/geminiService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 6.1 | `getExplanation()` met MC-vraag en antwoord | Fetch naar /api/gemini met action "getExplanation" | Unit |
| 6.2 | `getExplanation()` met open vraag | Correcte payload inclusief modelAnswer | Unit |
| 6.3 | `gradeOpenQuestion()` retourneert grade + feedback | `{ grade: 'correct'|'partial'|'incorrect', feedback }` | Unit |
| 6.4 | `gradeOpenQuestion()` met leeg antwoord | Grade "incorrect" | Unit |
| 6.5 | `generateFlashcards()` retourneert array van Flashcards | Flashcard[] met front, back, topic | Unit |
| 6.6 | `generateFlashcards()` met topic filter | Topic meegegeven in request | Unit |
| 6.7 | `generateLookalikeExamQuestions()` retourneert Question[] | Vragen met juist subject, level, type | Unit |
| 6.8 | `generateExamSummary()` retourneert feedback object | `{ overall, strengths[], improvements[], studyTips[] }` | Unit |
| 6.9 | `createSubjectChat()` retourneert chat sessie met sendMessage() | Chat object met werkende sendMessage functie | Unit |
| 6.10 | Chat sliding window: max 8 berichten behouden | Oudste berichten verwijderd bij overflow | Unit |
| 6.11 | `generateStudyFeedback()` retourneert AIStudyFeedback | `{ personalizedAdvice, prioritySubjects[], weeklyGoal }` | Unit |
| 6.12 | `streamLookalikeExamQuestions()` verwerkt SSE events | Questions via onQuestion callback ontvangen | Unit |
| 6.13 | Netwerk-error in fetch | Fout wordt correct afgehandeld, geen crash | Unit |
| 6.14 | API retourneert 429 (rate limit) | Foutmelding doorgegeven | Unit |

**Mocking**: global fetch (responses als JSON of SSE stream)

---

### 7. API: `/api/gemini.ts`

**Testbestand**: `tests/api/gemini.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 7.1 | POST action "getExplanation" met vraag + antwoord | AI uitleg string | Unit |
| 7.2 | POST action "gradeOpenQuestion" met open vraag | `{ grade, feedback }` | Unit |
| 7.3 | POST action "generateFlashcards" | Array van flashcards | Unit |
| 7.4 | POST action "generateLookalikeQuestions" | Array van Question objecten | Unit |
| 7.5 | POST action "generateExamSummary" | Summary object | Unit |
| 7.6 | POST action "chat" met message + systemInstruction | AI response string | Unit |
| 7.7 | POST action "generateStudyFeedback" | Feedback object | Unit |
| 7.8 | POST zonder action veld | 400: "Action is verplicht" | Unit |
| 7.9 | POST met onbekende action | 400: "Onbekende action" | Unit |
| 7.10 | GET request | 405: Method not allowed | Unit |
| 7.11 | Rate limiting: 21e call binnen 1 minuut | 429 | Unit |
| 7.12 | Model selectie: exacte vakken (Wiskunde/Natuur/Scheikunde) op HAVO/VWO -> Pro model | GEMINI_MODEL_PRO gebruikt | Unit |
| 7.13 | Model selectie: overige vakken -> Flash model | GEMINI_MODEL gebruikt | Unit |
| 7.14 | Prompt injection bescherming | Speciale tekens escaped in user input | Unit |
| 7.15 | Level-specifieke grading: VMBO soepeler, VWO strenger | Juiste grading prompt per niveau | Unit |

**Mocking**: AI Gateway SDK, rate limiter

---

### 8. API: `/api/gemini-stream.ts`

**Testbestand**: `tests/api/gemini-stream.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 8.1 | POST met subject, level, count | SSE stream met Question objecten | Unit |
| 8.2 | extractCompleteObjects() parse valide JSON uit buffer | Correcte Question objecten | Unit |
| 8.3 | transformRawQuestion() zet raw AI output om naar Question type | Juiste veldnamen en types | Unit |
| 8.4 | Stream eindigt met `[DONE]` event | Laatste SSE event is [DONE] | Unit |
| 8.5 | Ongeldige JSON in stream wordt overgeslagen | Geen crash, valide vragen doorgegeven | Unit |
| 8.6 | Rate limiting op stream endpoint | 429 bij overschrijding | Unit |

**Mocking**: AI Gateway SDK streaming response

---

### 9. Service: `progressService.ts`

**Testbestand**: `tests/services/progressService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 9.1 | `calculateProgress()` met meerdere examresultaten | Correct gemiddelde, improvement rate, recent scores | Unit |
| 9.2 | `calculateProgress()` met 1 examen | Score = gemiddelde, improvementRate = 0 | Unit |
| 9.3 | `calculateProgress()` met 0 examens | Lege/default progress | Unit |
| 9.4 | `getStudentProgress()` haalt alle voortgang op | StudentProgress[] per vak | Unit |
| 9.5 | `getOverallProgress()` berekent cross-subject stats | totalExams, averageScore, improvementRate | Unit |
| 9.6 | `updateProgressAfterExam()` herberekent stats na nieuw examen | Progress record bijgewerkt | Unit |
| 9.7 | `getWeakestSubjects()` sorteert op laagste score | Gesorteerd ascending, limit gerespecteerd | Unit |
| 9.8 | `getStrongestSubjects()` sorteert op hoogste score | Gesorteerd descending, limit gerespecteerd | Unit |
| 9.9 | `getTopicAnalysis()` cross-referenceert examens met vragen | TopicAnalysis[] met correcte topic performance | Unit |
| 9.10 | Improvement rate berekening: stijgende scores -> positief | Positieve waarde | Unit |
| 9.11 | Improvement rate berekening: dalende scores -> negatief | Negatieve waarde | Unit |

**Mocking**: Supabase client (from, select, eq, etc.)

---

### 10. Service: `storageService.ts`

**Testbestand**: `tests/services/storageService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 10.1 | `getQuestions()` haalt alle vragen op | Question[] in camelCase | Unit |
| 10.2 | `saveQuestion()` slaat vraag op in DB | upsert aangeroepen met snake_case data | Unit |
| 10.3 | `deleteQuestion()` verwijdert vraag op ID | delete().eq('id') aangeroepen | Unit |
| 10.4 | `saveResult()` slaat resultaat op | insert met snake_case conversie | Unit |
| 10.5 | `deleteExam()` verwijdert alle vragen + storage files | Questions, images, worksheets, PDFs verwijderd | Unit |
| 10.6 | `getQuestionsByYear()` filtert op jaar | Correct filter in query | Unit |
| 10.7 | `getAvailableYears()` retourneert unieke jaren (desc) | Gesorteerd descending, geen duplicaten | Unit |
| 10.8 | `getQuestionCountByYear()` telt vragen per jaar | Correct count gereturned | Unit |
| 10.9 | `getAvailableYearsForSubject()` filtert op vak + jaar | Juiste combinatie in query | Unit |
| 10.10 | `getQuestionsBySubjectAndYear()` haalt vragen op | Gefilterd op subject + year + optioneel level | Unit |
| 10.11 | Database error bij getQuestions() | Fout gelogd, lege array gereturned | Unit |
| 10.12 | Database error bij saveQuestion() | Fout gelogd, exception gegooid | Unit |

**Mocking**: Supabase client, Supabase storage

---

### 11. Service: `flashcardService.ts`

**Testbestand**: `tests/services/flashcardService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 11.1 | `getFlashcardProgress()` met bestaande voortgang | FlashcardProgress object | Unit |
| 11.2 | `getFlashcardProgress()` zonder voortgang | undefined gereturned | Unit |
| 11.3 | `saveFlashcardProgress()` met nieuw record | upsert aangeroepen met juiste data | Unit |
| 11.4 | `saveFlashcardProgress()` update bestaand record | upsert overschrijft bestaand record | Unit |
| 11.5 | Database error in getFlashcardProgress() | undefined gereturned, error gelogd | Unit |
| 11.6 | Database error in saveFlashcardProgress() | Error gelogd, geen crash | Unit |

**Mocking**: Supabase client

---

### 12. Service: `importService.ts`

**Testbestand**: `tests/services/importService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 12.1 | `parseCSV()` met geldige CSV | BulkImportQuestion[] correct geparsed | Unit |
| 12.2 | `parseCSV()` met lege CSV | Lege array | Unit |
| 12.3 | `parseCSV()` met ontbrekende kolommen | Error gegooid met beschrijving | Unit |
| 12.4 | `parseJSON()` met geldig JSON array | BulkImportQuestion[] correct geparsed | Unit |
| 12.5 | `parseJSON()` met JSON object met questions property | BulkImportQuestion[] correct geparsed | Unit |
| 12.6 | `parseJSON()` met ongeldige JSON | Error gegooid | Unit |
| 12.7 | `bulkImportQuestions()` met geldige vragen | ImportResult met successCount > 0 | Unit |
| 12.8 | `bulkImportQuestions()` met ongeldige vragen | ImportResult met errors[] gevuld | Unit |
| 12.9 | Validatie: ongeldig vak | Error in ImportResult | Unit |
| 12.10 | Validatie: ongeldig niveau | Error in ImportResult | Unit |
| 12.11 | Validatie: MC vraag zonder options | Error in ImportResult | Unit |
| 12.12 | Validatie: open vraag zonder modelAnswer | Error in ImportResult | Unit |
| 12.13 | Validatie: examYear buiten 2000-2100 | Error in ImportResult | Unit |
| 12.14 | `generateCSVTemplate()` retourneert template met headers | String met correcte kolommen | Unit |
| 12.15 | `validateFileType()` met .csv bestand | `{ valid: true }` | Unit |
| 12.16 | `validateFileType()` met .json bestand | `{ valid: true }` | Unit |
| 12.17 | `validateFileType()` met .txt bestand | `{ valid: false, error }` | Unit |
| 12.18 | `validateFileType()` met bestand > 5MB | `{ valid: false, error }` | Unit |
| 12.19 | `readFileAsText()` leest bestandsinhoud | String met file content | Unit |

**Mocking**: Supabase client (voor bulkImport), File API

---

## P2 - Middelhoge Prioriteit Tests

### 13. Service: `imageStorageService.ts`

**Testbestand**: `tests/services/imageStorageService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 13.1 | `uploadImage()` met geldig JPEG bestand (< 5MB) | URL string gereturned | Unit |
| 13.2 | `uploadImage()` met bestand > 5MB | Error: bestand te groot | Unit |
| 13.3 | `uploadImage()` met ongeldig bestandstype (.exe) | Error: ongeldig bestandstype | Unit |
| 13.4 | `deleteImage()` met geldige URL | Storage delete aangeroepen | Unit |
| 13.5 | `deleteImage()` met base64 URL | Overgeslagen (geen storage actie) | Unit |
| 13.6 | `isBase64Image()` met base64 string | true | Unit |
| 13.7 | `isBase64Image()` met https URL | false | Unit |
| 13.8 | `base64ToFile()` converteert correct | File object met juist type en grootte | Unit |
| 13.9 | `migrateBase64ToStorage()` uploadt en retourneert URL | Nieuwe storage URL gereturned | Unit |
| 13.10 | `ensureBucketExists()` als bucket bestaat | Geen error | Unit |
| 13.11 | `ensureBucketExists()` als bucket niet bestaat | Duidelijke foutmelding | Unit |
| 13.12 | Magic number validatie: JPEG header | Geaccepteerd | Unit |
| 13.13 | Magic number validatie: PNG header | Geaccepteerd | Unit |
| 13.14 | Magic number validatie: onbekende header | Geweigerd | Unit |

**Mocking**: Supabase storage (upload, remove, listBuckets)

---

### 14. Service: `worksheetStorageService.ts`

**Testbestand**: `tests/services/worksheetStorageService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 14.1 | `uploadWorksheet()` met geldig PDF bestand (< 20MB) | URL string gereturned | Unit |
| 14.2 | `uploadWorksheet()` met bestand > 20MB | Error: bestand te groot | Unit |
| 14.3 | `uploadWorksheet()` met ongeldig type | Error: ongeldig bestandstype | Unit |
| 14.4 | `deleteWorksheet()` met geldige URL | Storage delete aangeroepen | Unit |
| 14.5 | `getFileNameFromUrl()` extraheert bestandsnaam | Correcte naam | Unit |
| 14.6 | `ensureBucketExists()` controleert bucket | Geen error als bestaat | Unit |
| 14.7 | Magic number validatie: PDF header (%PDF) | Geaccepteerd | Unit |

**Mocking**: Supabase storage

---

### 15. Service: `subjectPreferencesService.ts`

**Testbestand**: `tests/services/subjectPreferencesService.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 15.1 | `saveSelectedSubjects()` met array van vakken | DB update met juiste vakken | Unit |
| 15.2 | `saveSelectedSubjects()` met null (alle vakken) | DB update met null | Unit |
| 15.3 | `getVisibleSubjects()` met selectie | Gefilterde array in SUBJECTS volgorde | Unit |
| 15.4 | `getVisibleSubjects()` met null (alle vakken) | Volledige SUBJECTS array | Unit |
| 15.5 | `getVisibleSubjects()` met undefined | Volledige SUBJECTS array | Unit |
| 15.6 | `getVisibleSubjects()` behoudt SUBJECTS volgorde | Volgorde identiek aan constants/subjects.ts | Unit |

**Mocking**: Supabase client

---

### 16. Service: `examData.ts`

**Testbestand**: `tests/services/examData.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 16.1 | `getTopicsForSubject()` met geldig vak + niveau | String array met topics | Unit |
| 16.2 | `getTopicsForSubject()` met ongeldig vak | Lege array | Unit |
| 16.3 | `EXAM_TOPICS` bevat alle ondersteunde vakken | Alle subjects uit constants/subjects.ts aanwezig | Unit |
| 16.4 | Elk vak heeft topics voor alle 3 niveaus | VMBO-TL, HAVO, VWO arrays niet leeg | Unit |

---

### 17. API: `/api/admin/subscriptions.ts`

**Testbestand**: `tests/api/admin-subscriptions.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 17.1 | GET met admin token | `{ success: true, subscriptions: [...] }` | Unit |
| 17.2 | GET zonder token | 401: Unauthorized | Unit |
| 17.3 | GET met student token | 403: Forbidden | Unit |
| 17.4 | POST request | 405: Method not allowed | Unit |
| 17.5 | Subscriptions gesorteerd op created_at desc | Nieuwste eerst | Unit |
| 17.6 | OPTIONS request | 200 met CORS headers | Unit |

**Mocking**: Supabase auth + from

---

### 18. API: `/api/utils/cors.ts`

**Testbestand**: `tests/api/utils/cors.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 18.1 | Origin `https://ai-examentrainer.nl` | Toegestaan | Unit |
| 18.2 | Origin `https://ai-examentrainer.vercel.app` | Toegestaan | Unit |
| 18.3 | Origin `https://preview-xyz.vercel.app` | Toegestaan (regex match) | Unit |
| 18.4 | Origin `http://localhost:3000` | Toegestaan | Unit |
| 18.5 | Origin `https://kwaadaardige-site.com` | Geweigerd | Unit |
| 18.6 | Geen origin header | Standaard afhandeling | Unit |
| 18.7 | CORS headers correct gezet | Allow-Origin, Methods, Headers, Credentials | Unit |

---

### 19. API: `/api/utils/rateLimiter.ts`

**Testbestand**: `tests/api/utils/rateLimiter.test.ts`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 19.1 | Eerste request voor IP | Toegestaan, teller = 1 | Unit |
| 19.2 | Request onder limiet | Toegestaan, teller verhoogd | Unit |
| 19.3 | Request op limiet | Geweigerd (429) | Unit |
| 19.4 | Request na window reset | Opnieuw toegestaan | Unit |
| 19.5 | Verschillende IPs onafhankelijk geteld | IP A vol, IP B nog vrij | Unit |
| 19.6 | Retry-After header correct berekend | Juiste seconden tot reset | Unit |

---

### 20. Context: `NotificationContext.tsx`

**Testbestand**: `tests/contexts/NotificationContext.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 20.1 | `showSuccess()` toont groene toast | Notification type "success" in lijst | Unit |
| 20.2 | `showError()` toont rode toast met 8s duur | Notification type "error", 8s duration | Unit |
| 20.3 | `showWarning()` toont oranje toast | Notification type "warning" | Unit |
| 20.4 | `showInfo()` toont blauwe toast | Notification type "info" | Unit |
| 20.5 | Auto-dismiss na ingestelde duur | Notification verwijderd na timeout | Unit |
| 20.6 | Handmatig sluiten via X knop | Notification direct verwijderd | Unit |
| 20.7 | Meerdere toasts stacken verticaal | Meerdere items in notification array | Unit |
| 20.8 | `useNotification()` buiten provider | Error gegooid | Unit |

**Mocking**: Timer mocks (vi.useFakeTimers)

---

## P2 - Component Tests

### 21. Component: `LoginPage.tsx`

**Testbestand**: `tests/components/LoginPage.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 21.1 | Render: email en wachtwoord velden aanwezig | Inputs gerenderd | Render |
| 21.2 | Leeg formulier indienen | Foutmelding getoond | User Event |
| 21.3 | Geldig email + wachtwoord -> onLogin aangeroepen | Callback met juiste params | User Event |
| 21.4 | onLogin retourneert error -> foutmelding in NL | Nederlandse vertaling getoond | User Event |
| 21.5 | Supabase "Invalid login credentials" -> Nederlandse melding | "Het ingevoerde e-mailadres of wachtwoord is onjuist" | Unit |
| 21.6 | isLoading=true -> submit knop disabled | Knop niet klikbaar | Render |
| 21.7 | Link naar "Wachtwoord vergeten" roept onForgotPassword aan | Callback aangeroepen | User Event |
| 21.8 | Link naar aanmelden roept onCheckout aan | Callback aangeroepen | User Event |

**Testing Library**: render, screen, userEvent, waitFor

---

### 22. Component: `CheckoutForm.tsx`

**Testbestand**: `tests/components/CheckoutForm.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 22.1 | Render: alle formuliervelden aanwezig | Email, wachtwoord, niveau, plan | Render |
| 22.2 | Plan selectie wisselt pricing info | Correct bedrag getoond | User Event |
| 22.3 | Wachtwoord < 8 tekens bij submit | Validatiefout getoond | User Event |
| 22.4 | Wachtwoord zonder hoofdletter | Validatiefout | User Event |
| 22.5 | Wachtwoord zonder cijfer | Validatiefout | User Event |
| 22.6 | Ongeldig email formaat | Validatiefout | User Event |
| 22.7 | Geldig formulier -> fetch naar /api/create-checkout | Fetch aangeroepen met juiste body | User Event |
| 22.8 | Succesvolle checkout -> redirect naar Mollie URL | window.location of redirect uitgevoerd | User Event |
| 22.9 | Server error -> foutmelding in formulier | Foutmelding zichtbaar | User Event |
| 22.10 | Wachtwoord zichtbaarheid toggle | Input type wisselt password/text | User Event |
| 22.11 | Niveau selectie (VMBO-TL, HAVO, VWO) | Geselecteerd niveau highlighted | User Event |

**Mocking**: global fetch, window.location

---

### 23. Component: `ExamTaker.tsx`

**Testbestand**: `tests/components/ExamTaker.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 23.1 | Render: vraag tekst en opties getoond | Eerste vraag zichtbaar | Render |
| 23.2 | MC-optie selecteren | Antwoord opgeslagen in state | User Event |
| 23.3 | Open vraag tekst invoeren | Antwoord opgeslagen | User Event |
| 23.4 | Volgende/vorige navigatie | Vraagindex wijzigt | User Event |
| 23.5 | Timer countdown | Timer toont resterende tijd | Render |
| 23.6 | Timer op 0 -> auto-finish | onFinish aangeroepen | Timer |
| 23.7 | Coach modus: antwoord controleren | Inline feedback getoond | User Event |
| 23.8 | Examen afronden via knop | Resultaten berekend en opgeslagen | User Event |
| 23.9 | Moeilijke vraag markeren | Vraag gemarkeerd in state | User Event |
| 23.10 | Loading state bij streaming vragen | Loading screen getoond | Render |
| 23.11 | Keyboard navigatie (pijltjestoetsen) | Vraag wisselt | User Event |

**Mocking**: geminiService (gradeOpenQuestion), timer (vi.useFakeTimers)

---

### 24. Component: `StudentDashboard.tsx`

**Testbestand**: `tests/components/StudentDashboard.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 24.1 | Render: vakkaarten getoond | Grid met subject cards | Render |
| 24.2 | Vak klikken -> SubjectOptions getoond | Modal/overlay verschijnt | User Event |
| 24.3 | Student naam en niveau in sidebar | Correcte tekst gerenderd | Render |
| 24.4 | Uitlogknop roept onLogout aan | Callback aangeroepen | User Event |
| 24.5 | Instellingen knop roept onSettings aan | Callback aangeroepen | User Event |
| 24.6 | Exam count per vak getoond | Badge met aantal examens | Render |
| 24.7 | Gefilterde vakken op basis van selectedSubjects | Alleen geselecteerde vakken zichtbaar | Render |

**Mocking**: storageService (getQuestions)

---

### 25. Component: `SubjectChat.tsx`

**Testbestand**: `tests/components/SubjectChat.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 25.1 | Render: header met vak en niveau | Correcte tekst | Render |
| 25.2 | Begroetingsbericht bij mount | Welkomstbericht met student naam | Render |
| 25.3 | Bericht versturen -> verschijnt in lijst | User message in chat | User Event |
| 25.4 | AI-antwoord verschijnt na bericht | Model message na user message | User Event |
| 25.5 | Typing indicator tijdens wachten | Animatie zichtbaar | Render |
| 25.6 | Input leeg na versturen | Input veld gereset | User Event |
| 25.7 | Send knop disabled tijdens typing | Knop niet klikbaar | Render |
| 25.8 | Terug-knop roept onBack aan | Callback aangeroepen | User Event |
| 25.9 | Markdown rendering in antwoorden | Bold, lijsten etc. correct gerenderd | Render |

**Mocking**: geminiService (createSubjectChat)

---

### 26. Component: `FlashcardStudy.tsx`

**Testbestand**: `tests/components/FlashcardStudy.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 26.1 | Render: eerste kaart voorkant getoond | Vraag tekst zichtbaar | Render |
| 26.2 | Klik op kaart -> flip animatie | Achterkant getoond (antwoord) | User Event |
| 26.3 | Spatie/Enter toets -> flip | Kaart omgedraaid | User Event |
| 26.4 | "Geweten" knop -> kaart in known set | Known count +1 | User Event |
| 26.5 | "Niet geweten" knop -> kaart in unknown set | Unknown count +1 | User Event |
| 26.6 | Voortgangsbalk update | Groen/oranje percentage correct | Render |
| 26.7 | Alle kaarten doorlopen -> completion scherm | Stats getoond, mastery % | Render |
| 26.8 | "Onbekende herhalen" knop | Alleen unknown kaarten geladen | User Event |
| 26.9 | Pijltjestoetsen navigatie | Volgende/vorige kaart | User Event |
| 26.10 | Progress opgeslagen bij afronden | saveFlashcardProgress aangeroepen | User Event |

**Mocking**: flashcardService

---

### 27. Component: `ExamBuilder.tsx`

**Testbestand**: `tests/components/ExamBuilder.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 27.1 | Render: metadata formulier (vak, jaar, niveau) | Invoervelden aanwezig | Render |
| 27.2 | Vraag toevoegen met alle velden | Vraag verschijnt in lijst | User Event |
| 27.3 | MC-vraag zonder opties -> validatiefout | Foutmelding getoond | User Event |
| 27.4 | Open vraag zonder modelantwoord -> validatiefout | Foutmelding getoond | User Event |
| 27.5 | Vraag bewerken laadt velden correct | Formulier gevuld met bestaande data | User Event |
| 27.6 | Vraag verwijderen uit lijst | Vraag verdwijnt | User Event |
| 27.7 | Examen opslaan -> alle vragen opgeslagen | saveQuestion voor elke vraag aangeroepen | User Event |
| 27.8 | JSON import met geldige data | Vragen geladen in editor | User Event |
| 27.9 | Terug knop roept onBack aan | Callback aangeroepen | User Event |

**Mocking**: storageService, imageStorageService

---

### 28. Component: `ExamLibrary.tsx`

**Testbestand**: `tests/components/ExamLibrary.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 28.1 | Render: mappenstructuur Vak -> Jaar -> Vragen | Accordion gerenderd | Render |
| 28.2 | Vak uitklappen -> jaren zichtbaar | Jaar items verschijnen | User Event |
| 28.3 | Zoeken op vraagtekst | Alleen matches getoond | User Event |
| 28.4 | Filter op niveau | Alleen vragen van niveau getoond | User Event |
| 28.5 | Vraag verwijderen met bevestiging | Vraag verdwijnt na confirm | User Event |
| 28.6 | Heel examen verwijderen | Alle vragen voor vak/jaar verwijderd | User Event |
| 28.7 | Bewerken knop roept onEditQuestion aan | Callback met question object | User Event |

**Mocking**: storageService

---

### 29. Component: `AdminDashboard.tsx`

**Testbestand**: `tests/components/AdminDashboard.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 29.1 | Render: sidebar met alle tabs | Tab knoppen zichtbaar | Render |
| 29.2 | Tab wisselen toont juiste content | Tab content verandert | User Event |
| 29.3 | Mobiel: hamburger menu | Menu opent bij klik | User Event |
| 29.4 | Uitlogknop roept onBack aan | Callback aangeroepen | User Event |
| 29.5 | Library tab toont ExamLibrary | Component gerenderd | User Event |
| 29.6 | Exam Builder tab toont ExamBuilder | Component gerenderd | User Event |
| 29.7 | Students tab toont AdminStudentManagement | Component gerenderd | User Event |

**Mocking**: storageService, child components

---

## P3 - Lagere Prioriteit Tests

### 30. Component: `ForgotPasswordPage.tsx`

**Testbestand**: `tests/components/ForgotPasswordPage.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 30.1 | Leeg email -> foutmelding | "Vul je email adres in" | User Event |
| 30.2 | Ongeldig email -> foutmelding | "Vul een geldig email adres in" | User Event |
| 30.3 | Geldig email -> succes melding | "Email verzonden!" of vergelijkbaar | User Event |

---

### 31. Component: `ResetPasswordPage.tsx`

**Testbestand**: `tests/components/ResetPasswordPage.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 31.1 | Geen tokens in URL -> error pagina | "Ongeldige of verlopen link" | Render |
| 31.2 | Wachtwoord validatie (alle regels) | Fouten per regel getoond | User Event |
| 31.3 | Wachtwoorden niet gelijk | "Wachtwoorden komen niet overeen" | User Event |
| 31.4 | Geldig nieuw wachtwoord -> succes | "Wachtwoord gewijzigd!" | User Event |

---

### 32. Component: `PaymentCallback.tsx`

**Testbestand**: `tests/components/PaymentCallback.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 32.1 | Payment ID in localStorage -> status check | check-payment-status aangeroepen | Render |
| 32.2 | Status "paid" -> succes scherm | "Betaling geslaagd!" getoond | Render |
| 32.3 | Status "failed" -> fout scherm | Foutmelding + retry optie | Render |
| 32.4 | Geen payment ID -> fallback | "Geen betaling gevonden" | Render |

---

### 33. Component: `SubscriptionSettings.tsx`

**Testbestand**: `tests/components/SubscriptionSettings.test.tsx`

| # | Test | Verwacht resultaat | Type |
|---|------|-------------------|------|
| 33.1 | Render: abonnement details getoond | Status, einddatum zichtbaar | Render |
| 33.2 | Opzeg knop -> bevestigingsdialoog | Confirm modal verschijnt | User Event |
| 33.3 | Bevestig opzeggen -> API call | cancel-subscription aangeroepen | User Event |

---

### 34. Overige Components (Minimale Tests)

| Component | Testbestand | Key Test |
|-----------|-------------|----------|
| `BulkImportQuestions.tsx` | `tests/components/BulkImportQuestions.test.tsx` | CSV/JSON upload + validatiefeedback |
| `AdminStudentManagement.tsx` | `tests/components/AdminStudentManagement.test.tsx` | Student CRUD form + lijst |
| `AdminHealthCheck.tsx` | `tests/components/AdminHealthCheck.test.tsx` | Service status rendering |
| `LandingPageNew.tsx` | `tests/components/LandingPageNew.test.tsx` | CTA knoppen + hero render |
| `LoadingScreen.tsx` | `tests/components/LoadingScreen.test.tsx` | Spinner rendering |
| `exam/ExamScoreCards.tsx` | `tests/components/ExamScoreCards.test.tsx` | Score display correctheid |
| `exam/QuestionReviewCard.tsx` | `tests/components/QuestionReviewCard.test.tsx` | Antwoord + uitleg rendering |

---

## Testinfrastructuur Verbeteringen

### Benodigde Setup-uitbreidingen

| # | Verbetering | Beschrijving |
|---|-------------|--------------|
| I.1 | **React Testing Library toevoegen** | `@testing-library/react` + `@testing-library/user-event` voor component tests |
| I.2 | **Global fetch mock** | Centraal fetch mock in setup.ts voor API client tests |
| I.3 | **Router mock** | `react-router-dom` mock voor navigatie-afhankelijke components |
| I.4 | **Timer utilities** | `vi.useFakeTimers()` helpers voor timer-gerelateerde tests |
| I.5 | **Test data factories** | Herbruikbare mock data factories (createMockQuestion, createMockStudent, etc.) |
| I.6 | **Coverage config uitbreiden** | `components/**/*.tsx` en `contexts/**/*.tsx` toevoegen aan coverage includes |
| I.7 | **MSW (Mock Service Worker)** | Optioneel: voor meer realistische API mocking in integration tests |

### Aanbevolen Teststructuur

```
tests/
├── setup.ts                          # Bestaand
├── helpers/
│   ├── mockData.ts                   # Gedeelde mock data factories
│   ├── renderWithProviders.tsx        # Render helper met AuthContext + Notifications
│   └── mockFetch.ts                  # Fetch mock utilities
├── api/
│   ├── endpoints.test.ts             # Bestaand
│   ├── create-checkout.test.ts       # Nieuw
│   ├── mollie-webhook.test.ts        # Nieuw
│   ├── cancel-subscription.test.ts   # Nieuw
│   ├── check-payment-status.test.ts  # Nieuw
│   ├── gemini.test.ts                # Nieuw
│   ├── gemini-stream.test.ts         # Nieuw
│   ├── admin-subscriptions.test.ts   # Nieuw
│   └── utils/
│       ├── cors.test.ts              # Nieuw
│       └── rateLimiter.test.ts       # Nieuw
├── services/
│   ├── auth.test.ts                  # Bestaand
│   ├── subscription.test.ts          # Bestaand
│   ├── supabaseService.test.ts       # Bestaand
│   ├── geminiService.test.ts         # Nieuw
│   ├── storageService.test.ts        # Nieuw
│   ├── flashcardService.test.ts      # Nieuw
│   ├── progressService.test.ts       # Nieuw
│   ├── importService.test.ts         # Nieuw
│   ├── imageStorageService.test.ts   # Nieuw
│   ├── worksheetStorageService.test.ts # Nieuw
│   ├── subjectPreferencesService.test.ts # Nieuw
│   └── examData.test.ts             # Nieuw
├── contexts/
│   ├── AuthContext.test.tsx           # Nieuw
│   └── NotificationContext.test.tsx   # Nieuw
├── components/
│   ├── LoginPage.test.tsx            # Nieuw
│   ├── CheckoutForm.test.tsx         # Nieuw
│   ├── ExamTaker.test.tsx            # Nieuw
│   ├── StudentDashboard.test.tsx     # Nieuw
│   ├── SubjectChat.test.tsx          # Nieuw
│   ├── FlashcardStudy.test.tsx       # Nieuw
│   ├── ExamBuilder.test.tsx          # Nieuw
│   ├── ExamLibrary.test.tsx          # Nieuw
│   ├── AdminDashboard.test.tsx       # Nieuw
│   ├── ForgotPasswordPage.test.tsx   # Nieuw
│   ├── ResetPasswordPage.test.tsx    # Nieuw
│   ├── PaymentCallback.test.tsx      # Nieuw
│   ├── SubscriptionSettings.test.tsx # Nieuw
│   └── ...                           # Overige
└── database/
    └── connection.test.ts            # Bestaand
```

---

## Implementatievolgorde

### Fase 1: Kritieke Backend (P0)
1. `tests/api/create-checkout.test.ts` (16 tests)
2. `tests/api/mollie-webhook.test.ts` (14 tests)
3. `tests/api/cancel-subscription.test.ts` (10 tests)
4. `tests/api/check-payment-status.test.ts` (7 tests)
5. `tests/contexts/AuthContext.test.tsx` (12 tests)

**Subtotaal: ~59 nieuwe tests**

### Fase 2: Kernservices (P1)
6. `tests/services/geminiService.test.ts` (14 tests)
7. `tests/api/gemini.test.ts` (15 tests)
8. `tests/api/gemini-stream.test.ts` (6 tests)
9. `tests/services/progressService.test.ts` (11 tests)
10. `tests/services/storageService.test.ts` (12 tests)
11. `tests/services/flashcardService.test.ts` (6 tests)
12. `tests/services/importService.test.ts` (19 tests)

**Subtotaal: ~83 nieuwe tests**

### Fase 3: Utilities & Contexten (P2)
13. `tests/services/imageStorageService.test.ts` (14 tests)
14. `tests/services/worksheetStorageService.test.ts` (7 tests)
15. `tests/services/subjectPreferencesService.test.ts` (6 tests)
16. `tests/services/examData.test.ts` (4 tests)
17. `tests/api/admin-subscriptions.test.ts` (6 tests)
18. `tests/api/utils/cors.test.ts` (7 tests)
19. `tests/api/utils/rateLimiter.test.ts` (6 tests)
20. `tests/contexts/NotificationContext.test.tsx` (8 tests)

**Subtotaal: ~58 nieuwe tests**

### Fase 4: Component Tests (P2-P3)
21-34. Component tests (zie secties 21-34)

**Subtotaal: ~100+ nieuwe tests**

---

## Samenvatting

| | Bestaand | Nieuw (Fase 1-4) | Totaal |
|---|---------|-------------------|--------|
| **Testbestanden** | 5 | ~35 | ~40 |
| **Tests** | 113 | ~300+ | ~413+ |
| **Service dekking** | 36% | → 100% | 100% |
| **API dekking** | 25% | → 100% | 100% |
| **Component dekking** | 0% | → ~50% | ~50% |
| **Context dekking** | 0% | → 100% | 100% |

### Commands

```bash
# Alle tests draaien
npm run test

# Specifieke fase draaien
npx vitest run tests/api/create-checkout.test.ts
npx vitest run tests/services/geminiService.test.ts

# Coverage rapport
npm run test:coverage

# Watch mode voor development
npm run test:watch
```

---

## Bijlage: Bestaand Handmatig Testplan

Het bestaande `TESTPLAN.md` bevat een handmatige checklist voor authenticatie- en accountflows. Dit uitgebreide plan is complementair: het beschrijft de **automatische tests** die geschreven moeten worden om de handmatige tests te vervangen of aan te vullen.

Secties in het handmatige testplan die gedekt worden door automatische tests na implementatie van dit plan:

| Handmatig (TESTPLAN.md) | Automatisch (dit plan) |
|--------------------------|------------------------|
| 1. Account Aanmaken | Tests 1.x, 2.x, 22.x |
| 2. Inloggen | Tests 5.x, 21.x |
| 3. Uitloggen | Test 5.5 |
| 4. Wachtwoord Reset | Tests 30.x, 31.x |
| 5. Route Beveiliging | Tests 5.x (AuthContext) |
| 6. Admin Gebruikersbeheer | Tests 29.x |
| 7. Subscription Management | Tests 3.x, 33.x |
| 8. Webhook Verwerking | Tests 2.x |
| 9. Beveiligings-checks | Tests 18.x, 19.x, 7.14 |
| 10. Edge Cases | Tests 5.8-5.9, 13.x, 14.x |
