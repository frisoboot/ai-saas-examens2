# 🔒 Beveiligingshandleiding AI Examens Platform

## Overzicht

Dit document bevat kritieke beveiligingsinformatie voor het AI Examens Platform. Het systeem gebruikt **uitsluitend Supabase Auth** voor alle authenticatie.

---

## ⚠️ KRITIEK: Authenticatie Setup

### Supabase Auth Configuratie

Alle authenticatie verloopt via Supabase Auth. Er zijn geen fallbacks of alternatieve auth methodes.

#### Vereiste Environment Variabelen

```bash
# Browser (public - beschermd door RLS)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (GEEN VITE_ prefix!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Admin Account Aanmaken

Admins moeten handmatig worden aangemaakt in Supabase:

1. Ga naar Supabase → Authentication → Users
2. Klik "Add user" → "Create new user"
3. **Email**: Je echte email adres (bijv. `admin@jouwdomein.nl`)
4. **Wachtwoord**: Minimaal 12 karakters
5. **Auto confirm**: Aan
6. **User metadata**: `{ "role": "admin" }`

**Wachtwoord eisen**:
- ✅ Minimaal 12 karakters (16+ aanbevolen)
- ✅ Mix van hoofdletters en kleine letters
- ✅ Cijfers en speciale karakters
- ❌ Geen veelvoorkomende wachtwoorden
- ❌ Geen persoonlijke informatie

**Genereer een sterk wachtwoord**:
```bash
openssl rand -base64 24
```

---

## 🛡️ Beveiligingsmaatregelen

### 1. Authenticatie

#### ✅ Geïmplementeerd:
- ✅ **Supabase Auth** - Alle authenticatie via Supabase
- ✅ **Echte email adressen** - Geen fake emails meer, gewoon je eigen email
- ✅ **Unified login** - Één login form voor iedereen
- ✅ **Session persistence** - Gebruikers blijven ingelogd
- ✅ **Proper logout** - `signOut()` verwijdert sessie volledig
- ✅ **Role-based access** - Via `user_metadata.role` in Supabase
- ✅ **RLS policies** - Alle data beveiligd op database niveau

#### 🔄 Aanbevolen voor de toekomst:
- ⚠️ Two-Factor Authentication (2FA/MFA)
- ⚠️ Session timeout (bijv. 30 min inactief = uitloggen)
- ⚠️ Audit logging (wie, wanneer, welke actie)
- ⚠️ IP whitelisting voor admin toegang
- ⚠️ Email notificaties bij admin login

### 2. Server-side Beveiliging

#### API Endpoints

Alle admin operaties gaan via server-side API endpoints:
- `/api/create-student` - Student account aanmaken
- `/api/reset-password` - Wachtwoord resetten
- `/api/delete-student` - Student verwijderen

Deze endpoints:
- Verifiëren de JWT token
- Checken of de user admin is (via metadata)
- Gebruiken de service role key (nooit in browser)

### 3. Row Level Security (RLS)

Alle tabellen zijn beveiligd met RLS policies:

| Tabel | Studenten | Admins |
|-------|-----------|--------|
| `questions` | Lezen | Lezen + Schrijven |
| `exam_results` | Alleen eigen | Alle |
| `student_profiles` | Alleen eigen | Alle |
| `student_progress` | Alleen eigen | Alle |

### 4. Environment Variabelen

- `VITE_*` variabelen → Beschikbaar in de browser (public)
- Variabelen zonder `VITE_` prefix → Alleen server-side (secret)

**NOOIT** de `SUPABASE_SERVICE_ROLE_KEY` in de browser!

---

## 🔍 Security Audit Checklist

### Voor elke deployment:

- [ ] `.env` staat in `.gitignore`
- [ ] Geen hardcoded credentials in de code
- [ ] Admin account aangemaakt in Supabase Auth dashboard
- [ ] Sterk admin wachtwoord (min. 16 chars)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ZONDER `VITE_` prefix
- [ ] HTTPS geconfigureerd
- [ ] RLS policies actief op alle tabellen

### Regelmatig controleren:

- [ ] Supabase Auth logs reviewen
- [ ] Ongebruikte accounts verwijderen
- [ ] Dependencies updaten (`npm audit`)
- [ ] Security headers testen
- [ ] Penetration testing overwegen

---

## 🔒 CORS en Security Headers

### CORS Whitelist

De API endpoints accepteren alleen requests van:
- Productie domains (geconfigureerd in `api/utils/cors.ts`)
- Vercel preview URLs
- `localhost` (alleen development)

### Security Headers

Aanbevolen headers voor productie:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

---

## 🚨 Security Incidents

### Als je denkt dat beveiliging is gecompromitteerd:

1. **DIRECT**: Wijzig alle wachtwoorden in Supabase Auth
2. **CHECK**: Review auth logs in Supabase dashboard
3. **DISABLE**: Tijdelijk admin accounts deactiveren
4. **INVESTIGATE**: Zoek naar verdachte activiteit
5. **ROTATE**: Genereer nieuwe API keys
6. **UPDATE**: Patch de security vulnerability
7. **NOTIFY**: Informeer betrokkenen indien nodig

### Contact voor security issues:

- **NIET** publiekelijk delen in GitHub issues
- Stuur een private melding naar de repository maintainer

---

## 📚 Aanvullende Bronnen

### Security Best Practices:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Guide](https://supabase.com/docs/guides/auth/security)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

### Tools:
- [Supabase Dashboard](https://app.supabase.com/) - Auth & logs
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Check dependencies
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing

---

## 📝 Changelog

### v2.0.0 (2026-01-17) - Supabase Auth Only
- ✅ **BREAKING**: Verwijderd: Server-side admin-login API endpoint
- ✅ **BREAKING**: Alle authenticatie nu uitsluitend via Supabase Auth
- ✅ Toegevoegd: Session persistence (onthoud ingelogde gebruikers)
- ✅ Toegevoegd: Proper logout met signOut()
- ✅ Toegevoegd: getCurrentSession() voor session check bij app start
- ✅ Verbeterd: Email domain verificatie voor admin/student onderscheid
- ✅ Verbeterd: Error handling in auth flows

### v1.1.0 (2026-01-14) - Security Improvements
- ✅ Server-side API endpoint voor admin login
- ✅ Timing attack prevention
- ✅ Rate limiting op login endpoint

### v1.0.0 (2026-01-14)
- ✅ Initiële release met Supabase Auth integratie
- ✅ RLS policies geïmplementeerd
- ✅ Environment variabelen voor credentials

---

**Laatst bijgewerkt**: 17 januari 2026
**Versie**: 2.0.0
