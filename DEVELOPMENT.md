# Development Guide - AI Examentrainer

## 🔐 Login Credentials

### Admin Login
- **Gebruikersnaam**: `admin`
- **Wachtwoord**: `qfxohCpsHdFgwqn+d8PIIMwPvyFUAhki`

⚠️ **Belangrijk**: Dit wachtwoord staat in het `.env` bestand en is gegenereerd voor development. Verander dit in productie!

## 🚀 Development Setup

Het nieuwe login systeem heeft twee authenticatie methodes:

### Methode 1: Server-side API (actief)
De `/api/admin-login` endpoint gebruikt de credentials uit het `.env` bestand:
- `ADMIN_USERNAME` - De admin gebruikersnaam
- `ADMIN_PASSWORD` - Het admin wachtwoord (server-side only, geen VITE_ prefix!)

### Methode 2: Supabase Auth (optioneel)
Als je Supabase wilt gebruiken, voeg deze credentials toe aan `.env`:
- `VITE_SUPABASE_URL` - Je Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Je Supabase anonymous key

## 🛠️ Starten in Development

### Optie A: Vercel Dev (aanbevolen voor volledige functionaliteit)

```bash
# Installeer Vercel CLI (als je dat nog niet hebt)
npm install -g vercel

# Start de development server met API endpoints
vercel dev
```

De applicatie draait op `http://localhost:3000` met volledige API functionaliteit.

### Optie B: Vite Dev (alleen frontend, API endpoints werken niet)

```bash
npm run dev
```

⚠️ **Let op**: Met deze methode werken de API endpoints (`/api/*`) NIET. Je kunt alleen inloggen als je Supabase hebt geconfigureerd.

## 📝 Development Checklist

Wanneer je lokaal ontwikkelt:

- [x] `.env` bestand is aangemaakt met `ADMIN_USERNAME` en `ADMIN_PASSWORD`
- [ ] Optioneel: Supabase credentials toegevoegd aan `.env`
- [ ] Optioneel: Gemini API key toegevoegd voor AI features
- [ ] Start met `vercel dev` voor volledige functionaliteit

## 🔧 Troubleshooting Login Problemen

### "Gebruikersnaam of wachtwoord onjuist"

1. **Check `.env` bestand**: Zorg dat `ADMIN_USERNAME` en `ADMIN_PASSWORD` correct zijn ingesteld
2. **Gebruik Vercel Dev**: Als je `npm run dev` gebruikt, gebruik dan `vercel dev` in plaats daarvan
3. **Check browser console**: Open DevTools (F12) en bekijk de Console voor error messages

### "Server configuratie fout"

Dit betekent dat de `ADMIN_PASSWORD` environment variabele niet is ingesteld of te kort is (min 12 karakters).

**Oplossing**:
1. Check of `.env` bestand bestaat
2. Check of `ADMIN_PASSWORD` is ingesteld (geen `VITE_` prefix!)
3. Herstart de development server

### API endpoint is niet bereikbaar

**Probleem**: Je gebruikt `npm run dev` maar de `/api` endpoints werken niet.

**Oplossing**: Gebruik `vercel dev` in plaats van `npm run dev`.

## 🔒 Security Notes

### Belangrijke Security Principes

1. **Server-side credentials**: De `ADMIN_PASSWORD` variabele heeft **GEEN** `VITE_` prefix, wat betekent dat deze ALLEEN op de server beschikbaar is en NOOIT naar de browser wordt gestuurd.

2. **Environment variabelen**:
   - `VITE_*` variabelen → Beschikbaar in de browser (public)
   - Variabelen zonder `VITE_` prefix → Alleen server-side (secret)

3. **Productie deployment**:
   - Zet de environment variabelen in je hosting platform (Vercel/Netlify)
   - Gebruik een sterk, uniek wachtwoord (min 16 karakters)
   - NOOIT credentials committen in Git

### Wachtwoord Genereren

Voor productie, genereer een veilig wachtwoord:

```bash
# Genereer een random wachtwoord
openssl rand -base64 24
```

## 📚 Architectuur

### Login Flow

```
1. User vult username + password in
   ↓
2. Frontend roept verifyAdminLogin() aan
   ↓
3. Probeer eerst Supabase Auth (als geconfigureerd)
   ↓
4. Bij failure: fallback naar /api/admin-login
   ↓
5. API endpoint valideert credentials (server-side)
   ↓
6. Success → Admin dashboard
```

### Bestanden

- `/api/admin-login.ts` - Server-side authenticatie endpoint
- `/services/authService.ts` - Client-side authenticatie logica
- `/.env` - Environment variabelen (NOT in Git!)
- `/.env.example` - Template voor environment variabelen

## 🎯 Next Steps

1. **Test de login**: Start met `vercel dev` en login met de credentials hierboven
2. **Configureer Supabase** (optioneel): Voeg Supabase credentials toe voor database functionaliteit
3. **Wijzig wachtwoord**: Voor productie, gebruik een ander wachtwoord
4. **Deploy**: Push naar GitHub en deploy via Vercel/Netlify

## 💡 Tips

- Gebruik `vercel dev` voor lokale development (niet `npm run dev`)
- Check de browser console voor debug informatie
- Het wachtwoord staat in `.env` en kan je altijd terugvinden daar
- Voor productie: stel environment variabelen in via je hosting platform dashboard
