# Development Guide - AI Examentrainer

## 🔐 Authenticatie via Supabase Auth

Dit systeem gebruikt **uitsluitend Supabase Auth** voor alle authenticatie. Er zijn geen fallbacks of alternatieve auth methodes.

### Admin Account Aanmaken

Admins worden bepaald op basis van email adres:

1. Ga naar je Supabase project → Authentication → Users
2. Klik "Add user" → "Create new user"
3. Vul in:
   - **Email**: Je echte email adres (bijv. `admin@jouwdomein.nl`)
   - **Wachtwoord**: Minimaal 12 karakters, sterk wachtwoord
   - **Auto confirm**: Aan
4. Voeg het email adres toe aan `VITE_ADMIN_EMAILS` in je `.env` bestand

### Student Accounts

Studenten worden aangemaakt via:
- **Admin dashboard**: Admins maken studenten aan met hun echte email adres
- **Registratie flow**: Via de checkout/betaal flow

**Let op**: Studenten loggen in met hun echte email adres.

## 🚀 Development Setup

### Vereiste Environment Variabelen

Maak een `.env` bestand aan met:

```bash
# Supabase (VERPLICHT)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Admin email adressen (komma-gescheiden)
VITE_ADMIN_EMAILS=admin@jouwdomein.nl

# Server-side only (voor API endpoints)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI features (optioneel)
GEMINI_API_KEY=your-gemini-key
```

### Starten in Development

#### Optie A: Vercel Dev (aanbevolen)

```bash
# Installeer Vercel CLI (als je dat nog niet hebt)
npm install -g vercel

# Start de development server met API endpoints
vercel dev
```

De applicatie draait op `http://localhost:3000` met volledige API functionaliteit.

#### Optie B: Vite Dev (alleen frontend)

```bash
npm run dev
```

⚠️ **Let op**: Met deze methode werken de API endpoints (`/api/*`) NIET. Je kunt wel inloggen via Supabase Auth.

## 📝 Development Checklist

- [x] Supabase project aangemaakt
- [x] Environment variabelen ingesteld
- [ ] Admin account aangemaakt in Supabase Auth dashboard
- [ ] RLS policies geactiveerd op alle tabellen
- [ ] Optioneel: Gemini API key voor AI features

## 🔧 Troubleshooting

### "Gebruikersnaam of wachtwoord onjuist"

1. **Check Supabase**: Is de admin user aangemaakt in Authentication → Users?
2. **Check email format**: Moet eindigen op `@admin.example.com`
3. **Check wachtwoord**: Correct wachtwoord ingevuld?

### "Supabase niet beschikbaar"

1. Check of `.env` bestand bestaat
2. Check of `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` zijn ingesteld
3. Herstart de development server

### API endpoint fouten

1. Check of `SUPABASE_SERVICE_ROLE_KEY` is ingesteld (zonder VITE_ prefix!)
2. Gebruik `vercel dev` in plaats van `npm run dev`

## 🔒 Security Notes

### Environment Variabelen

- `VITE_*` variabelen → Beschikbaar in de browser (public)
- Variabelen zonder `VITE_` prefix → Alleen server-side (secret)

### Belangrijke Security Principes

1. **Service Role Key**: NOOIT in de browser, alleen in `/api/*` endpoints
2. **RLS Policies**: Alle tabellen zijn beveiligd met Row Level Security
3. **Role-based Access**: Admin rol wordt bepaald via `VITE_ADMIN_EMAILS` environment variable

## 📚 Architectuur

### Login Flow

```
1. User vult email + password in
   ↓
2. Frontend roept login() aan
   ↓
3. Supabase Auth signInWithPassword()
   ↓
4. Email check: staat in VITE_ADMIN_EMAILS?
   ↓
5. Ja → Admin Dashboard
   Nee → Student profiel ophalen → Student Dashboard
```

### Session Persistence

Het systeem onthoudt ingelogde gebruikers via Supabase Auth's session management:
- Bij app start wordt `getCurrentSession()` aangeroepen
- Als er een geldige sessie is, wordt de gebruiker automatisch ingelogd
- Logout via `signOut()` verwijdert de sessie

### Bestanden

- `/services/authService.ts` - Alle authenticatie logica via Supabase Auth
- `/services/supabaseService.ts` - Supabase client configuratie
- `/api/create-student.ts` - Server-side student account creatie
- `/api/reset-password.ts` - Server-side wachtwoord reset
- `/api/delete-student.ts` - Server-side student verwijderen

## 🎯 Next Steps

1. **Maak admin account**: Via Supabase Auth dashboard
2. **Test login**: Start met `vercel dev` en login als admin
3. **Maak studenten**: Via het admin dashboard
4. **Deploy**: Push naar GitHub en deploy via Vercel

## 💡 Tips

- Gebruik `vercel dev` voor lokale development met API endpoints
- Check de browser console voor debug informatie
- Session blijft bewaard tussen page refreshes
- Logout via de uitlog knop in het dashboard
