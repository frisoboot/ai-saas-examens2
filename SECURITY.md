# 🔒 Beveiligingshandleiding AI Examens Platform

## Overzicht
Dit document bevat kritieke beveiligingsinformatie voor het AI Examens Platform, inclusief admin authenticatie, wachtwoordbeleid en beveiligingsbest practices.

---

## ⚠️ KRITIEK: Admin Wachtwoord Configuratie

### Stap 1: Stel een STERK admin wachtwoord in

Het admin wachtwoord wordt **NIET** hardcoded in de code. In plaats daarvan moet je het instellen via environment variabelen.

#### Voor Development (lokaal):

1. Kopieer `.env.example` naar `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` en stel een **STERK** wachtwoord in:
   ```bash
   VITE_ADMIN_PASSWORD=jouw-super-sterke-wachtwoord-hier
   VITE_ADMIN_USERNAME=admin
   ```

3. **Wachtwoord eisen**:
   - ✅ Minimaal 16 karakters (systeem vereist minimaal 12)
   - ✅ Mix van hoofdletters en kleine letters
   - ✅ Cijfers en speciale karakters (@, #, $, %, !, etc.)
   - ❌ NOOIT veelvoorkomende wachtwoorden (admin123, password, etc.)
   - ❌ NOOIT persoonlijke informatie (naam, geboortedatum, etc.)

4. **Genereer een sterk wachtwoord**:
   ```bash
   # Met OpenSSL
   openssl rand -base64 24

   # Met pwgen
   pwgen -s 24 1

   # Of gebruik een wachtwoordmanager:
   # - 1Password
   # - Bitwarden
   # - LastPass
   # - KeePassXC
   ```

#### Voor Productie (Vercel/andere hosts):

1. **NOOIT** commit je `.env` bestand naar Git!
2. Stel environment variabelen in via je hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Andere: Zie documentatie van je host

3. Productie environment variabelen:
   ```bash
   VITE_ADMIN_PASSWORD=zeer-sterk-productie-wachtwoord
   VITE_ADMIN_USERNAME=admin
   VITE_ALLOW_DEV_FALLBACK=false  # ⚠️ VERPLICHT in productie!
   ```

---

## 🛡️ Beveiligingsmaatregelen

### 1. Admin Authenticatie

#### ✅ Geïmplementeerd:
- ✅ Wachtwoorden via environment variabelen (niet hardcoded)
- ✅ Minimale wachtwoordlengte check (12 karakters)
- ✅ Development fallback alleen in DEV mode
- ✅ Supabase Auth integratie met role-based access
- ✅ Warning bij zwakke wachtwoorden

#### 🔄 Aanbevolen voor de toekomst:
- ⚠️ Rate limiting (max 5 login pogingen per 15 min)
- ⚠️ Two-Factor Authentication (2FA/MFA)
- ⚠️ Session timeout (bijv. 30 min inactief = uitloggen)
- ⚠️ Audit logging (wie, wanneer, welke actie)
- ⚠️ IP whitelisting voor admin toegang
- ⚠️ Email notificaties bij admin login

### 2. Development vs Productie

#### Development Mode:
- Fallback authenticatie mogelijk via environment variabelen
- `VITE_ALLOW_DEV_FALLBACK=true` toestaan
- Gebruik test databases en API keys

#### Productie Mode:
- **VERPLICHT**: `VITE_ALLOW_DEV_FALLBACK=false`
- Alleen Supabase Auth gebruiken (geen fallback!)
- Gebruik productie databases en API keys
- HTTPS verplicht
- Security headers geconfigureerd

### 3. Wachtwoord Management Best Practices

#### Voor Admins:
1. **Gebruik een wachtwoordmanager** (1Password, Bitwarden, etc.)
2. **Deel NOOIT** je admin wachtwoord via email/chat
3. **Wijzig regelmatig** je wachtwoord (elke 3-6 maanden)
4. **Gebruik unieke wachtwoorden** (niet hergebruiken)
5. **Schakel 2FA in** zodra beschikbaar

#### Voor Developers:
1. **NOOIT** commit `.env` bestanden naar Git
2. **NOOIT** hardcode wachtwoorden in de code
3. **Gebruik altijd** environment variabelen
4. **Roteer credentials** na teamleden vertrek
5. **Review code** op security issues voor elke merge

---

## 🔍 Security Audit Checklist

### Voor elke deployment:

- [ ] `.env` staat in `.gitignore`
- [ ] Geen hardcoded credentials in de code
- [ ] `VITE_ALLOW_DEV_FALLBACK=false` in productie
- [ ] Sterk admin wachtwoord ingesteld (min. 16 chars)
- [ ] HTTPS geconfigureerd
- [ ] Supabase RLS policies actief
- [ ] Service role key NIET in productie frontend
- [ ] API keys voor productie (niet test keys)

### Regelmatig controleren:

- [ ] Admin login logs reviewen
- [ ] Ongebruikte accounts verwijderen
- [ ] Dependencies updaten (npm audit)
- [ ] Security headers testen
- [ ] Penetration testing overwegen

---

## 🚨 Security Incidents

### Als je denkt dat beveiliging is gecompromitteerd:

1. **DIRECT**: Wijzig alle wachtwoorden en API keys
2. **CHECK**: Review admin login logs in Supabase
3. **DISABLE**: Tijdelijk admin toegang uitschakelen
4. **INVESTIGATE**: Zoek naar verdachte activiteit
5. **DOCUMENT**: Noteer wat er gebeurd is
6. **UPDATE**: Patch de security vulnerability
7. **NOTIFY**: Informeer betrokkenen indien nodig

### Contact voor security issues:

Voor het rapporteren van security vulnerabilities:
- **NIET** publiekelijk delen in issues
- Stuur een private melding naar de repository maintainer
- Geef tijd voor een fix voordat je publiceert

---

## 📚 Aanvullende Bronnen

### Security Best Practices:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Supabase Security Guide](https://supabase.com/docs/guides/auth/security)

### Tools:
- [Have I Been Pwned](https://haveibeenpwned.com/) - Check compromised passwords
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Check dependencies
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing

---

## 📝 Changelog

### v1.0.0 (2026-01-14)
- ✅ Verwijderd: Hardcoded admin wachtwoord 'admin123'
- ✅ Toegevoegd: Environment variabele voor admin wachtwoord
- ✅ Toegevoegd: Minimale wachtwoordlengte validatie (12 chars)
- ✅ Toegevoegd: Development fallback security check
- ✅ Verbeterd: Security logging en warnings
- ✅ Gedocumenteerd: Complete security guidelines

---

**Laatst bijgewerkt**: 14 januari 2026
**Versie**: 1.0.0
