# 🚀 Vercel Deployment Guide

Deze guide helpt je om je AI Examentrainer veilig te deployen op Vercel met Supabase authenticatie.

## 📋 Wat is er veranderd?

### ✅ Veiligheidsverbeteringen

- **API Endpoints**: Service role key wordt nu veilig gebruikt via serverless functions
- **Geen secrets in browser**: De krachtige service role key is niet meer zichtbaar in de frontend
- **Production-ready**: De app is nu klaar voor productie gebruik

### 📁 Nieuwe bestanden

- `api/create-student.ts` - API endpoint om studenten aan te maken
- `api/reset-password.ts` - API endpoint om wachtwoorden te resetten
- `services/apiService.ts` - Frontend service die de API endpoints aanroept
- `vercel.json` - Vercel configuratie

## 🚀 Deployment Stappen

### Stap 1: Install Vercel CLI (optioneel)

```bash
npm install -g vercel
```

### Stap 2: Deploy naar Vercel

**Optie A: Via Vercel Dashboard (Makkelijkst)**

1. Ga naar [vercel.com](https://vercel.com) en log in
2. Klik **"Add New Project"**
3. Import je GitHub repository
4. Vercel detecteert automatisch dat het een Vite project is
5. Klik **"Deploy"**

**Optie B: Via CLI**

```bash
vercel
```

Volg de prompts:
- Set up and deploy? **Yes**
- Which scope? Kies je account
- Link to existing project? **No**
- What's your project's name? `ai-examentrainer`
- In which directory is your code located? `./`
- Override settings? **No**

### Stap 3: Environment Variables Toevoegen

⚠️ **BELANGRIJK**: Je moet de environment variables handmatig toevoegen in Vercel.

1. Ga naar je project in Vercel Dashboard
2. Ga naar **Settings** → **Environment Variables**
3. Voeg de volgende variables toe:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://jouw-project.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (je anon key) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (je service role key) | Production, Preview, Development |
| `AI_GATEWAY_API_KEY` | Je Vercel AI Gateway key | Production, Preview, Development |

**Let op**:
- De `SUPABASE_SERVICE_ROLE_KEY` en `AI_GATEWAY_API_KEY` hebben GEEN `VITE_` prefix!
- Dit is opzettelijk - hierdoor zijn deze keys NIET zichtbaar in de browser
- Deze keys worden alleen gebruikt door de serverless functions

### Stap 4: Redeploy

Na het toevoegen van de environment variables:

1. Ga naar **Deployments** tab
2. Klik op de **3 dots** (...) bij de laatste deployment
3. Klik **"Redeploy"**

Of via CLI:

```bash
vercel --prod
```

### Stap 5: Test je Productie App

1. Open je Vercel deployment URL (bijv. `https://ai-examentrainer.vercel.app`)
2. Test admin login:
   - Username: `admin`
   - Password: `admin123`
3. Test student aanmaken via admin dashboard
4. Log uit en log in als die student

## 🔍 Verificatie

### Check of API werkt

Open je browser console en run:

```javascript
// Check of de API beschikbaar is
fetch('/api/create-student', { method: 'OPTIONS' })
  .then(r => console.log('API available:', r.status))
  .catch(e => console.error('API error:', e));
```

Je zou een `200` status moeten zien.

### Check Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

✅ Alle 4 variables moeten aanwezig zijn
✅ `SUPABASE_SERVICE_ROLE_KEY` moet **geen** `VITE_` prefix hebben
✅ Alle variables moeten voor **Production** enabled zijn

## 🐛 Troubleshooting

### "Admin client niet beschikbaar" error

**Oorzaak**: De environment variables zijn niet correct ingesteld in Vercel.

**Oplossing**:
1. Check of `SUPABASE_SERVICE_ROLE_KEY` bestaat (zonder VITE_ prefix)
2. Redeploy na het toevoegen van variables
3. Check Vercel Function logs: Dashboard → Deployments → [Latest] → Functions

### API endpoints geven 500 error

**Oorzaak**: Service role key is incorrect of niet beschikbaar.

**Oplossing**:
1. Verifieer je service role key in Supabase Dashboard → Settings → API
2. Update de `SUPABASE_SERVICE_ROLE_KEY` in Vercel
3. Redeploy

### CORS errors

**Oorzaak**: API endpoints accepteren requests van verkeerd origin.

**Oplossing**: De API endpoints hebben al CORS headers. Als je problemen hebt:
1. Check je deployment URL
2. Verifieer dat je niet `localhost` gebruikt voor productie

### Student aanmaken werkt lokaal maar niet in productie

**Oorzaak**: Lokaal gebruik je `supabaseAdmin` direct, maar in productie moet je de API gebruiken.

**Oplossing**: De code checkt automatisch of `supabaseAdmin` beschikbaar is:
- Lokaal (met `VITE_SUPABASE_SERVICE_ROLE_KEY`): gebruikt `supabaseAdmin` direct
- Productie (zonder `VITE_SUPABASE_SERVICE_ROLE_KEY`): gebruikt API endpoints

Dit is correct gedrag!

## 📊 Monitoring

### Vercel Function Logs

1. Ga naar Vercel Dashboard → je project
2. Klik op **Deployments**
3. Klik op de laatste deployment
4. Scroll naar **Functions**
5. Klik op een function om logs te zien

Hier zie je:
- Console.log output van je API endpoints
- Errors die optreden
- Performance metrics

### Supabase Logs

1. Ga naar Supabase Dashboard → Logs
2. Check **API** logs voor database queries
3. Check **Auth** logs voor authenticatie events

## 🔐 Security Checklist

Na deployment:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NIET in browser zichtbaar (check DevTools → Application → Environment)
- [ ] Admin user heeft een veilig wachtwoord (verander `admin123`!)
- [ ] RLS policies zijn actief in Supabase (check Database → Policies)
- [ ] Development fallback is disabled (`VITE_ALLOW_DEV_FALLBACK=false`)
- [ ] API endpoints vereisen authenticatie (test zonder token)

## ⚙️ Custom Domain (optioneel)

1. Ga naar Vercel Dashboard → Settings → Domains
2. Klik **"Add Domain"**
3. Vul je domain in (bijv. `examentrainer.jouwdomein.nl`)
4. Volg de DNS instructies
5. Wacht op DNS propagatie (kan tot 48 uur duren)

## 🔄 Updates Deployen

Na het maken van wijzigingen:

**Automatisch (via GitHub)**:
- Push naar je `main` branch
- Vercel deployt automatisch

**Handmatig**:
```bash
git add .
git commit -m "Update beschrijving"
git push
```

Of via CLI:
```bash
vercel --prod
```

## 💡 Tips

1. **Preview Deployments**: Elke branch krijgt een preview URL
2. **Rollback**: Klik op een oude deployment en klik "Promote to Production"
3. **Environment Variables per branch**: Stel verschillende keys in voor preview/development
4. **Analytics**: Enable Vercel Analytics in project settings

## 📞 Hulp Nodig?

- Check [Vercel Documentation](https://vercel.com/docs)
- Check [Supabase Documentation](https://supabase.com/docs)
- Check Vercel Function logs voor errors
- Check Supabase logs voor database issues

---

**Gemaakt door**: Claude Code
**Datum**: 2026-01-13
**Versie**: 1.0
