<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1DHs0WDPrH3n9Z6Soe3sJ1WeWn890QR6b

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configureer environment variabelen in `.env.local`:
   ```bash
   GEMINI_API_KEY=je_gemini_api_key_hier
   VITE_SUPABASE_URL=je_supabase_project_url
   VITE_SUPABASE_ANON_KEY=je_supabase_anon_key
   ```

3. **Database Setup (Supabase):**
   
   a. Maak een gratis account aan op [Supabase](https://supabase.com)
   
   b. Maak een nieuw project aan
   
   c. Ga naar de SQL Editor in je Supabase dashboard
   
   d. Voer het SQL script uit uit `supabase-schema.sql` om de database tabellen aan te maken
   
   e. Kopieer je Project URL en anon/public key naar `.env.local`
   
   **Let op:** Als je geen Supabase configureert, gebruikt de app automatisch localStorage als fallback.

4. Run the app:
   ```bash
   npm run dev
   ```

## Database Setup

De app gebruikt Supabase (PostgreSQL) voor het opslaan van vragen, resultaten en student profielen. Dit maakt het mogelijk om grote hoeveelheden vragen op te slaan zonder localStorage limieten.

### Supabase Setup Stappen:

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account
2. Klik op "New Project"
3. Kies een naam en wachtwoord voor je database
4. Wacht tot het project is aangemaakt
5. Ga naar Settings > API om je credentials te vinden:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
6. Ga naar SQL Editor en voer `supabase-schema.sql` uit
7. Voeg de credentials toe aan je `.env.local` bestand

De app werkt ook zonder Supabase (gebruikt localStorage), maar voor grote hoeveelheden vragen is een database aanbevolen.
