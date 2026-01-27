# 🔐 Supabase Auth + RLS Security Setup

Deze guide helpt je om veilige authenticatie en Row Level Security (RLS) policies in te stellen.

## 📋 Overzicht van Wijzigingen

### Wat is er veranderd?
- ✅ **Supabase Auth**: Gebruikt nu Supabase's ingebouwde authenticatie ipv custom auth
- ✅ **JWT Tokens**: Alle users krijgen JWT tokens met role metadata
- ✅ **RLS Policies**: Database is nu beveiligd met role-based access control
- ✅ **Service Role Client**: Admin kan studenten aanmaken via service role key
- ✅ **Backward Compatible**: LocalStorage fallback blijft werken voor development

### Wat blijft hetzelfde?
- ✅ Login UI blijft identiek
- ✅ Admin kan nog steeds studenten aanmaken
- ✅ Alle functionaliteit werkt zoals voorheen
- ✅ Geen breaking changes voor bestaande features

## 🚀 Setup Stappen

### Stap 1: Haal je Supabase credentials op

1. Ga naar je [Supabase Dashboard](https://app.supabase.com)
2. Selecteer je project
3. Ga naar **Settings** → **API**
4. Kopieer de volgende waarden:
   - **Project URL** (bijv. `https://abcxyz.supabase.co`)
   - **anon public** key (lang, begint met `eyJ...`)
   - **service_role** key (GEHEIM! begint met `eyJ...`)

### Stap 2: Maak .env.local bestand aan

Kopieer `.env.example` naar `.env.local`:

```bash
cp .env.example .env.local
```

Vul je credentials in:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...je-anon-key...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...je-service-role-key...

# Vercel AI Gateway (server-side only, GEEN VITE_ prefix!)
AI_GATEWAY_API_KEY=je-ai-gateway-key

# Development fallback
VITE_ALLOW_DEV_FALLBACK=true
```

**⚠️ BELANGRIJK**: De `service_role` key is heel krachtig en bypast alle RLS policies. Deel deze NOOIT publiekelijk!

### Stap 3: Voer database migratie uit

1. Open je [Supabase SQL Editor](https://app.supabase.com/project/_/sql)
2. Maak een nieuwe query
3. Kopieer de inhoud van `supabase-auth-rls-migration.sql`
4. Plak in SQL Editor
5. Klik **Run**

Dit doet:
- ✅ Voegt `auth_user_id` kolom toe aan `student_profiles`
- ✅ Verwijdert oude onveilige RLS policies
- ✅ Maakt nieuwe veilige RLS policies aan
- ✅ Maakt helper functies aan (`is_admin()`, `is_student()`, etc.)

### Stap 4: Maak admin user aan

**Optie A: Via script (Aanbevolen)**

```bash
# Installeer tsx als je dat nog niet hebt
npm install -D tsx

# Run script
npx tsx scripts/create-admin-user.ts
```

Je zou moeten zien:
```
✅ Admin user succesvol aangemaakt!
   Email: admin@admin.local
   Password: admin123
```

**Optie B: Via Supabase Dashboard**

1. Ga naar **Authentication** → **Users**
2. Klik **Add user**
3. Vul in:
   - Email: `admin@admin.local`
   - Password: `admin123` (of je eigen wachtwoord)
   - Auto Confirm User: ✅ YES
4. Klik **Create user**
5. Klik op de nieuwe user
6. Ga naar **User Metadata** tab
7. Voeg toe: `{"role": "admin", "username": "admin"}`
8. Klik **Save**

### Stap 5: Test de applicatie

1. Start je app:
```bash
npm run dev
```

2. Test admin login:
   - Klik "Admin Login"
   - Username: `admin`
   - Password: `admin123`
   - Je zou moeten kunnen inloggen en het admin dashboard moeten zien

3. Test student aanmaken:
   - Maak een nieuwe student aan via admin dashboard
   - Log uit
   - Log in als die student
   - Je zou alleen je eigen data moeten zien

## 🔍 Verificatie

### Check RLS Policies

In Supabase SQL Editor:

```sql
-- Als admin ingelogd
SELECT get_user_role(), is_admin();
-- Verwacht: 'admin', true

-- Test data access
SELECT COUNT(*) FROM questions;
SELECT COUNT(*) FROM student_profiles;
SELECT COUNT(*) FROM exam_results;
-- Admin ziet alles
```

### Check Student Access

1. Log in als student
2. Open browser console
3. Run in console:
```javascript
// Dit zou moeten werken
const { data: questions } = await supabase.from('questions').select('*');
console.log('Questions:', questions.length);

// Dit zou alleen eigen profiel moeten tonen
const { data: profile } = await supabase.from('student_profiles').select('*');
console.log('Profile:', profile);

// Dit zou moeten falen (alleen admins kunnen studenten zien)
const { data: allStudents } = await supabase.from('student_profiles').select('*');
console.log('All students:', allStudents); // Alleen eigen profiel
```

## 🔐 Hoe het werkt

### Admin Flow

1. Admin logt in met `admin@admin.local` + wachtwoord
2. Supabase Auth geeft JWT token met `role: 'admin'` in metadata
3. RLS policies checken `is_admin()` functie
4. Admin heeft volledige toegang tot alles

### Student Creation Flow

1. Admin maakt student aan via dashboard
2. App gebruikt `supabaseAdmin` (service role) om:
   - Auth user aan te maken met `role: 'student'` metadata
   - Student profiel in database aan te maken
3. Student kan nu inloggen met naam + wachtwoord

### Student Login Flow

1. Student logt in met naam (wordt `naam@student.local`)
2. Supabase Auth geeft JWT token met `role: 'student'` + `name: 'Studentnaam'`
3. RLS policies checken `is_student() AND student_name = get_student_name()`
4. Student ziet alleen eigen data

## 🛡️ Beveiliging Features

### Wat is nu beveiligd?

✅ **Questions Table**
- Iedereen (authenticated) kan lezen
- Alleen admins kunnen toevoegen/updaten/verwijderen

✅ **Exam Results**
- Studenten zien alleen eigen resultaten
- Studenten kunnen alleen eigen resultaten toevoegen
- Admins zien en beheren alles

✅ **Student Profiles**
- Studenten zien alleen eigen profiel
- Studenten kunnen eigen profiel updaten
- Admins zien en beheren alles

✅ **Student Progress**
- Studenten zien en updaten alleen eigen progress
- Admins zien alles

✅ **Import History**
- Alleen admins hebben toegang

### Service Role Key

De `VITE_SUPABASE_SERVICE_ROLE_KEY` is nodig voor:
- Admin om studenten aan te maken (bypast RLS)
- Student wachtwoorden resetten

**⚠️ BELANGRIJK**: Deze key is nu in de browser visible. Voor productie moet je dit verplaatsen naar:
- Serverless functions (Vercel, Netlify)
- Backend API
- Supabase Edge Functions

## 🐛 Troubleshooting

### "User is not an admin" fout bij admin login

**Oorzaak**: Admin user heeft geen `role: 'admin'` metadata

**Oplossing**:
1. Ga naar Supabase Dashboard → Authentication → Users
2. Klik op admin user
3. Ga naar User Metadata tab
4. Voeg toe: `{"role": "admin", "username": "admin"}`
5. Save

### "Student niet gevonden" bij student login

**Oorzaak**: Student profiel niet correct aangemaakt

**Oplossing**:
1. Check of student bestaat in `student_profiles` tabel
2. Check of `auth_user_id` correct is ingevuld
3. Probeer student opnieuw aan te maken via admin dashboard

### RLS policy errors

**Symptomen**: `new row violates row-level security policy` errors

**Oplossing**:
1. Check of user is ingelogd: `supabase.auth.getUser()`
2. Check user metadata: `user.user_metadata.role`
3. Check RLS policies in Supabase Dashboard → Database → Policies

### Service role key werkt niet

**Oorzaak**: Key niet correct of niet in .env.local

**Oplossing**:
1. Check `.env.local` bestaat en is niet `.env.example`
2. Restart development server na `.env.local` wijzigingen
3. Verifieer key in Supabase Dashboard → Settings → API

## 📚 Volgende Stappen

### Voor Productie

1. **Verander admin wachtwoord**:
   ```typescript
   await supabaseAdmin.auth.admin.updateUserById(
     'admin-user-id',
     { password: 'veilig-wachtwoord-hier' }
   );
   ```

2. **Verplaats service role key naar backend**:
   - Maak serverless functions voor student creation
   - Maak API endpoint voor password reset
   - Verwijder `VITE_SUPABASE_SERVICE_ROLE_KEY` uit frontend

3. **Disable development fallback**:
   ```env
   VITE_ALLOW_DEV_FALLBACK=false
   ```

4. **Verwijder oude kolommen** (na volledige migratie):
   ```sql
   ALTER TABLE student_profiles DROP COLUMN IF EXISTS password;
   ALTER TABLE student_profiles DROP COLUMN IF EXISTS password_hash;
   DROP TABLE IF EXISTS admin_users CASCADE;
   ```

### Extra Security

- Implementeer rate limiting op login endpoints
- Voeg 2FA toe voor admin accounts
- Implementeer password strength requirements
- Voeg audit logging toe voor admin acties
- Implementeer session timeout

## ✅ Checklist

- [ ] `.env.local` aangemaakt met alle credentials
- [ ] Database migratie uitgevoerd
- [ ] Admin user aangemaakt
- [ ] Admin login getest
- [ ] Student aangemaakt via admin dashboard
- [ ] Student login getest
- [ ] RLS policies geverifieerd
- [ ] Development fallback disabled in production
- [ ] Admin wachtwoord veranderd
- [ ] Service role key naar backend verplaatst (productie)

## 💡 Tips

- **Browser console**: Gebruik `await supabase.auth.getUser()` om current user te zien
- **SQL Editor**: Test policies met `SELECT get_user_role(), is_admin();`
- **Network tab**: Check JWT tokens in Authorization headers
- **Supabase Logs**: Check realtime logs in Dashboard → Logs

## 📞 Hulp Nodig?

Als je vast zit:
1. Check browser console voor errors
2. Check Supabase logs in Dashboard
3. Verify `.env.local` credentials
4. Test RLS policies in SQL Editor
5. Check user metadata in Authentication tab

---

**Gemaakt door**: Claude Code
**Datum**: 2026-01-13
**Versie**: 1.0
