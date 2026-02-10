# 🎓 AI Examentrainer

Een intelligente examentrainer gebouwd met React, Supabase en Google Gemini AI. Studenten kunnen oefenen met meerkeuzevragen en open vragen, met AI-powered feedback.

## ✨ Features

- 🤖 **AI-powered vraag generatie** met Google Gemini
- 📝 **Twee vraag types**: Meerkeuze en open vragen
- 👥 **Student management**: Admin kan studenten aanmaken en beheren
- 🔐 **Veilige authenticatie** met Supabase Auth + RLS
- 📊 **Progress tracking**: Studenten kunnen hun voortgang volgen
- 📦 **Bulk import**: Importeer vragen via CSV of tekst
- 🎯 **Adaptief leren**: Focus op struggle points

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ geïnstalleerd
- Een Supabase account (gratis)
- Een Google Gemini API key (gratis tier beschikbaar)

### 1. Clone en Install

```bash
git clone https://github.com/frisoboot/ai-saas-examens2.git
cd ai-saas-examen
npm install
```

### 2. Environment Variables

Kopieer `.env.example` naar `.env.local`:

```bash
cp .env.example .env.local
```

Vul je credentials in:

```env
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ALLOW_DEV_FALLBACK=true

# ⚠️ VERPLICHT: Stel een STERK admin wachtwoord in!
# LET OP: GEEN "VITE_" prefix = server-side only (veilig!)
# Zie SECURITY.md voor volledige instructies
ADMIN_PASSWORD=jouw-super-sterke-wachtwoord-hier
ADMIN_USERNAME=admin

# AI Gateway (server-side only, GEEN VITE_ prefix!)
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key

# Optioneel voor lokaal development:
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Database Setup

Volg de stappen in [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md):

1. Voer `database/supabase-auth-rls-migration.sql` uit in Supabase SQL Editor
2. Maak een admin user aan:
   ```bash
   npx tsx scripts/create-admin-user.ts
   ```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) en login als admin:
- Username: De username die je hebt ingesteld (standaard: `admin`)
- Password: Het sterke wachtwoord uit je `.env.local` bestand

> ⚠️ **BELANGRIJK**: Gebruik NOOIT het wachtwoord uit oude documentatie. Zie [`SECURITY.md`](SECURITY.md) voor veilig wachtwoordbeheer.

## 📖 Documentation

- **[🔒 Security Guide](SECURITY.md)** - **VERPLICHTE LEZING**: Admin wachtwoorden en beveiliging
- **[Supabase Setup Guide](docs/SUPABASE_AUTH_SETUP.md)** - Database configuratie en RLS policies
- **[Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md)** - Production deployment instructies

## 🏗️ Project Structure

```
ai-saas-examen/
├── api/                          # Vercel serverless functions
│   ├── create-student.ts        # Veilige student creation
│   └── reset-password.ts        # Veilige password reset
├── components/                   # React components
├── database/                     # SQL migraties en schema
│   ├── supabase-schema.sql
│   ├── subscriptions-schema.sql
│   ├── migration-secure-rls-v3-FINAL.sql
│   └── NUCLEAR-RESET-AND-INSTALL.sql
├── docs/                        # Documentatie
├── scripts/                     # Helper scripts
│   └── create-admin-user.ts
├── services/                    # Business logic
│   ├── apiService.ts           # API client
│   ├── authService.ts          # Authenticatie
│   └── supabaseService.ts      # Database client
├── utils/                       # Helper functies
├── App.tsx                      # Main app component
└── types.ts                     # TypeScript types
```

## 🔐 Security

Dit project implementeert enterprise-grade beveiliging met:

- ✅ **Server-side admin auth API** - wachtwoord blijft op server!
- ✅ **Supabase Auth** met JWT tokens
- ✅ **Row Level Security (RLS)** policies
- ✅ **Role-based access control** (admin vs student)
- ✅ **Environment-based credentials** (geen hardcoded wachtwoorden!)
- ✅ **Service role key** blijft op server (via API endpoints)
- ✅ **Wachtwoord validatie** (min. 12 karakters)
- ✅ **Timing attack prevention** in admin login
- ✅ **Geen secrets in browser** (geen VITE_ prefix voor admin credentials)

> 🚨 **VERPLICHT**: Lees [`SECURITY.md`](SECURITY.md) voordat je het platform gebruikt!
> Dit bevat kritieke informatie over admin wachtwoorden en beveiligingsbest practices.

**Quick security checklist:**
- [ ] Lees [`SECURITY.md`](SECURITY.md)
- [ ] Stel `ADMIN_PASSWORD` in (ZONDER `VITE_` prefix!) ⚠️ KRITIEK
- [ ] Gebruik een sterk wachtwoord (min. 16 karakters)
- [ ] Zet `VITE_ALLOW_DEV_FALLBACK=false` in productie
- [ ] Commit NOOIT je `.env` bestand
- [ ] Review de [Supabase Setup Guide](docs/SUPABASE_AUTH_SETUP.md)

**Waarom GEEN `VITE_` prefix?**
- Variabelen met `VITE_` prefix worden geëxpositeerd naar de browser
- `ADMIN_PASSWORD` (zonder prefix) blijft veilig op de server
- Vercel/Netlify geven GEEN warning voor server-side variabelen ✅

## 🚢 Deployment

Deploy naar Vercel:

1. Push naar GitHub
2. Importeer project in [Vercel](https://vercel.com)
3. Voeg environment variables toe (zie [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md))
4. Deploy!

**Belangrijk:** In productie moet je `SUPABASE_SERVICE_ROLE_KEY` zonder `VITE_` prefix gebruiken, zodat de key op de server blijft.

## 📝 Admin Gebruik

Als admin kun je:
- ✅ Studenten aanmaken met naam, level en struggle points
- ✅ Vragen importeren (CSV of bulk tekst)
- ✅ Vragen genereren met AI
- ✅ Student progress bekijken
- ✅ Wachtwoorden resetten

## 👨‍🎓 Student Gebruik

Als student kun je:
- ✅ Examens maken op je niveau
- ✅ AI feedback krijgen op open antwoorden
- ✅ Je voortgang bijhouden
- ✅ Focus op je struggle points

## 🛠️ Development

### Build voor productie

```bash
npm run build
```

### Preview productie build

```bash
npm run preview
```

## 📄 License

MIT License - zie LICENSE file voor details.

## 🙏 Credits

Gebouwd met:
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Supabase](https://supabase.com/) - Backend & auth
- [Google Gemini](https://ai.google.dev/) - AI model
- [Lucide React](https://lucide.dev/) - Icons

---

**Made with ❤️ by Friso Boot**
