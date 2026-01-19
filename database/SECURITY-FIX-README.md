# 🔒 Database Security Fix - RLS Policies

## ⚠️ KRITIEK BEVEILIGINGSLEK OPGELOST

Dit document beschrijft het kritieke beveiligingslek in de Row Level Security (RLS) policies en hoe het is opgelost.

---

## 📋 Probleem Analyse

### Wat was het probleem?

De originele database schema (`database/supabase-schema.sql`) had **volledig open RLS policies**:

```sql
-- ⚠️ ONVEILIG - Iedereen kan alles!
CREATE POLICY "Allow public read access to questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to questions" ON questions
    FOR INSERT WITH CHECK (true);
```

### Impact

1. **Iedereen kon alle vragen lezen/schrijven/verwijderen** - inclusief niet-geauthenticeerde gebruikers
2. **Iedereen kon exam results van andere studenten bekijken** - privacy schending
3. **Iedereen kon student profielen manipuleren** - data integriteit risico
4. **Geen authenticatie vereist** - de `VITE_SUPABASE_ANON_KEY` is publiek (in de browser)

### Severity: KRITIEK 🔴

Dit is een **ernstig beveiligingslek** omdat:
- De anon key publiek is (zit in elke browser)
- Er is geen bescherming tegen misbruik
- Persoonlijke data (exam resultaten, profielen) is volledig open
- Kwaadwillenden kunnen data verwijderen of manipuleren

---

## ✅ Oplossing

### 1. Database Schema Aanpassingen

**Nieuwe kolommen toegevoegd:**
- `exam_results.user_id` - Link naar `auth.users(id)` voor ownership tracking
- `student_profiles.is_admin` - Boolean voor admin role tracking

### 2. Veilige RLS Policies

**Questions tabel:**
- ✅ Authenticated users kunnen lezen (OK voor exam systeem)
- ✅ Alleen admins kunnen toevoegen/wijzigen/verwijderen

**Exam Results tabel:**
- ✅ Users kunnen alleen hun **eigen** resultaten zien
- ✅ Admins kunnen alle resultaten zien
- ✅ Users kunnen alleen resultaten voor **zichzelf** toevoegen
- ✅ Alleen admins kunnen wijzigen/verwijderen

**Student Profiles tabel:**
- ✅ Users kunnen alleen hun **eigen** profiel zien
- ✅ Admins kunnen alle profielen zien
- ✅ Alleen admins kunnen nieuwe profielen aanmaken
- ✅ Users kunnen hun eigen profiel wijzigen (behalve `is_admin` flag)
- ✅ Alleen admins kunnen profielen verwijderen

### 3. Helper Functies

```sql
-- Check of huidige user admin is
is_current_user_admin()

-- Check of user eigenaar is van profiel
is_profile_owner(profile_email)
```

---

## 🚀 Migratie Uitvoeren

### Stap 1: Backup Maken

**BELANGRIJK:** Maak eerst een backup van je database!

In Supabase Dashboard:
1. Ga naar Settings → Database
2. Klik op "Create backup" of gebruik de Supabase CLI

### Stap 2: Migratie Uitvoeren

1. Open Supabase Dashboard
2. Ga naar SQL Editor
3. Open het bestand `database/migration-secure-rls.sql`
4. Kopieer de hele inhoud
5. Plak in SQL Editor
6. Klik op **"Run"**

### Stap 3: Eerste Admin Aanmaken

**KRITIEK:** Maak je eerste admin gebruiker aan, anders kun je niets meer toevoegen!

```sql
-- Vervang EMAIL met jouw admin email
UPDATE student_profiles
SET is_admin = TRUE
WHERE email = 'jouw-admin@example.com';
```

### Stap 4: Data Cleanup (Optioneel)

Als je orphaned exam_results hebt (zonder user_id), verwijder ze:

```sql
-- Check eerst hoeveel
SELECT COUNT(*) FROM exam_results WHERE user_id IS NULL;

-- Verwijder ze (indien gewenst)
DELETE FROM exam_results WHERE user_id IS NULL;
```

### Stap 5: Verificatie

Test de security policies:

```sql
-- Check of RLS actief is
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('questions', 'exam_results', 'student_profiles');
-- Alle drie moeten 'true' zijn

-- Check aantal admins
SELECT email, is_admin
FROM student_profiles
WHERE is_admin = TRUE;
-- Moet minimaal 1 admin teruggeven
```

### Stap 6: Environment Variable Instellen

Update je `.env.local` om admin emails te specificeren (voor de frontend):

```bash
VITE_ADMIN_EMAILS=admin@example.com,admin2@example.com
```

---

## 🧪 Testen

### Test 1: Normal Student Access

1. Log in als normale student
2. Probeer exam results van andere studenten te zien → Moet FALEN
3. Probeer een vraag toe te voegen → Moet FALEN
4. Bekijk je eigen exam results → Moet WERKEN
5. Maak een examen en check of result opgeslagen wordt → Moet WERKEN

### Test 2: Admin Access

1. Log in als admin
2. Bekijk alle student profielen → Moet WERKEN
3. Voeg een nieuwe vraag toe → Moet WERKEN
4. Bekijk alle exam results → Moet WERKEN
5. Verwijder een student profiel → Moet WERKEN

### Test 3: Unauthenticated Access

1. Log uit
2. Probeer questions te lezen via Supabase client → Moet FALEN
3. Probeer exam results te zien → Moet FALEN

---

## 📝 Code Wijzigingen

### TypeScript Types

```typescript
// types.ts - ExamResult updated
export interface ExamResult {
  // ... existing fields
  user_id?: string; // UUID of auth.users - for RLS enforcement
}
```

### ExamTaker Component

```typescript
// ExamTaker.tsx - user_id toegevoegd
const { user } = useAuth();

const result: ExamResult = {
  // ... existing fields
  user_id: user?.id // Link to authenticated user
};
```

### Supabase Service

```typescript
// supabaseService.ts - Field transformatie toegevoegd
const examResultToDb = (result: ExamResult): DbExamResult => {
  return {
    // ... snake_case transformatie
    user_id: result.user_id
  };
};
```

---

## 🔄 Rollback (NOODGEVAL)

**Gebruik dit ALLEEN in noodgevallen!** Dit brengt de onveilige situatie terug.

Zie onderaan `migration-secure-rls.sql` voor rollback SQL.

**WAARSCHUWING:** Rollback betekent:
- ❌ Alle data is weer publiek toegankelijk
- ❌ Iedereen kan alles manipuleren
- ❌ Privacy en data integriteit risico's keren terug

---

## 📚 Meer Informatie

### Supabase RLS Documentatie
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

### Beveiligde Development Practices
1. **Altijd RLS gebruiken** voor publieke tabellen
2. **Test policies** met verschillende user roles
3. **Gebruik auth.uid()** voor user identification
4. **Never trust frontend** - security gebeurt in de database
5. **Monitor access patterns** via Supabase Dashboard

---

## ✅ Checklist

Voordat je live gaat:

- [ ] Backup gemaakt van database
- [ ] Migration script uitgevoerd
- [ ] Eerste admin gebruiker aangemaakt
- [ ] RLS policies geverifieerd (rowsecurity = true)
- [ ] Orphaned exam_results opgeschoond
- [ ] `.env.local` bijgewerkt met `VITE_ADMIN_EMAILS`
- [ ] Getest als normale student (kan alleen eigen data zien)
- [ ] Getest als admin (kan alle data zien/wijzigen)
- [ ] Getest als unauthenticated user (kan niets zien)
- [ ] Application code deployed (TypeScript updates)

---

## 🆘 Hulp Nodig?

Als je problemen ondervindt:

1. Check Supabase logs in Dashboard → Logs
2. Check browser console voor errors
3. Verifieer dat `user_id` correct wordt ingevuld in exam_results
4. Check of admin flag correct is ingesteld

### Veelvoorkomende Problemen

**Probleem:** "Cannot insert exam result"
- **Oorzaak:** User is niet ingelogd of `user_id` is niet ingevuld
- **Oplossing:** Check of `useAuth()` werkt en `user?.id` beschikbaar is

**Probleem:** "Cannot read questions"
- **Oorzaak:** User is niet authenticated
- **Oplossing:** Zorg dat user ingelogd is

**Probleem:** "Cannot add questions (admin can't)"
- **Oorzaak:** Admin flag is niet ingesteld
- **Oplossing:** Run `UPDATE student_profiles SET is_admin = TRUE WHERE email = '...'`

---

## 🎉 Success!

Na deze migratie is je database **veilig** en beschermd tegen ongeautoriseerde toegang! 🔒

Alle data is nu beschermd door:
- ✅ Row Level Security policies
- ✅ Authentication requirements
- ✅ Role-based access control
- ✅ User ownership tracking
