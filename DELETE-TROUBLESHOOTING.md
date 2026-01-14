# Delete Student - Troubleshooting Guide

## ✅ Verificatie Checklist

Gebruik deze checklist om te verifiëren dat alles correct werkt:

### 1. Backend Verificatie (Terminal)

```bash
# Run comprehensive verification
npx tsx scripts/verify-delete-flow.ts

# Test met een specifieke student (OPGELET: dit verwijdert echt!)
npx tsx scripts/verify-delete-flow.ts "TestStudentName"

# Run de oorspronkelijke test
npx tsx scripts/test-delete-student.ts
```

### 2. Frontend Verificatie (Browser)

1. Start de dev server: `npm run dev`
2. Log in als admin
3. Open Developer Console (F12)
4. Kopieer en plak de inhoud van `scripts/browser-debug-delete.js`
5. Run: `await testDeleteFlow("StudentName")`

### 3. Database Verificatie (Supabase Dashboard)

1. Open je Supabase project
2. Ga naar Table Editor
3. Check de volgende tabellen:
   - `student_profiles` - moet student profiel bevatten
   - `exam_results` - moet resultaten voor student bevatten
   - `student_progress` - moet progress voor student bevatten
4. Verwijder via admin panel
5. Verifieer dat alles weg is

---

## 🐛 Veelvoorkomende Problemen & Oplossingen

### Probleem 1: "Student wordt niet verwijderd"

**Symptoom:** De delete knop doet niets, of er komt geen feedback.

**Mogelijke oorzaken:**

1. **Console errors?**
   - Open Developer Console (F12)
   - Check of er JavaScript errors zijn
   - Kijk naar Network tab voor gefaalde requests

2. **API endpoint niet bereikbaar**
   ```bash
   # Check of API endpoint bestaat
   ls -la api/delete-student.ts

   # Check of Vercel dev server draait (als je local test)
   # De API moet draaien op http://localhost:3001
   ```

3. **Auth token wordt niet meegestuurd**
   - Check in Network tab of Authorization header aanwezig is
   - Token moet starten met "Bearer eyJ..."

**Oplossing:**
```javascript
// In browser console:
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Token:', session?.access_token);
```

---

### Probleem 2: "403 Forbidden" Error

**Symptoom:** API geeft "Forbidden - alleen admins kunnen studenten verwijderen"

**Oorzaak:** Je bent niet ingelogd als admin, of de JWT token heeft niet de juiste role.

**Oplossing:**
```javascript
// Check je role in browser console:
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Role:', session?.user?.user_metadata?.role);
// Moet 'admin' zijn, niet 'student'
```

Als role niet 'admin' is:
1. Log uit
2. Log opnieuw in met admin credentials
3. Probeer opnieuw

---

### Probleem 3: "Student profiel verwijderd, maar Auth user niet"

**Symptoom:** Student profile is weg uit `student_profiles`, maar Auth user bestaat nog.

**Oorzaak:**
- `auth_user_id` was `null` of incorrect
- Service role key heeft geen rechten om Auth users te verwijderen

**Verificatie:**
```sql
-- In Supabase SQL Editor:
SELECT name, auth_user_id FROM student_profiles WHERE name = 'StudentName';
```

**Oplossing:**
```bash
# Handmatig opruimen via script:
npx tsx scripts/cleanup-orphaned-auth-users.ts
```

**Preventie:**
- Zorg dat `auth_user_id` ALTIJD wordt ingevuld bij student aanmaken
- Check [create-student.ts](api/create-student.ts:135) - auth_user_id moet worden opgeslagen

---

### Probleem 4: "Exam results blijven staan"

**Symptoom:** Student profile is verwijderd, maar exam results niet.

**Oorzaak:**
- RLS policy blokkeert de delete
- `student_name` kolom komt niet overeen (hoofdletters?)

**Verificatie:**
```sql
-- In Supabase SQL Editor:
SELECT student_name, COUNT(*)
FROM exam_results
WHERE student_name ILIKE '%studentname%'
GROUP BY student_name;
```

**Oplossing:**
```javascript
// Handmatig verwijderen via service role:
const { data, error } = await supabaseAdmin
  .from('exam_results')
  .delete()
  .eq('student_name', 'ExacteNaam');
```

---

### Probleem 5: "500 Internal Server Error" van API

**Symptoom:** API geeft 500 error, maar geen duidelijke foutmelding.

**Oorzaak:**
- Environment variables ontbreken
- Database connectie mislukt
- SQL error (bijv. foreign key constraint)

**Verificatie:**
```bash
# Check environment variables
cat .env.local | grep SUPABASE

# Moet bevatten:
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...  (zonder VITE_ prefix!)
```

**Oplossing:**
1. Check Vercel logs (als deployed):
   ```bash
   vercel logs
   ```

2. Check local API logs:
   - API errors worden gelogd in terminal waar je `vercel dev` draait

3. Voeg meer logging toe aan [delete-student.ts](api/delete-student.ts):
   ```typescript
   console.log('Deleting student:', studentName);
   console.log('Auth user ID:', authUserId);
   ```

---

### Probleem 6: "CORS Error" in browser

**Symptoom:** Network error met CORS melding in console.

**Oorzaak:** CORS headers niet correct ingesteld in API.

**Oplossing:**

Check [api/delete-student.ts](api/delete-student.ts:24-28):
```typescript
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
```

Als deployed op Vercel, voeg `vercel.json` toe:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization" }
      ]
    }
  ]
}
```

---

## 🔍 Debug Stappen

Als het nog steeds niet werkt, volg deze stappen:

### Stap 1: Verifieer Backend

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test API direct
curl -X POST http://localhost:3001/api/delete-student \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"studentName": "TestStudent"}'
```

### Stap 2: Test Database Access

```bash
npx tsx scripts/verify-delete-flow.ts
```

Alle checks moeten ✅ zijn.

### Stap 3: Test Frontend

1. Open [http://localhost:5173](http://localhost:5173)
2. Log in als admin
3. Ga naar Admin Dashboard → Student Management
4. Klik op 🗑️ (trash icon) bij een test student
5. Bevestig 2x
6. Check of student verdwijnt uit de lijst

### Stap 4: Check Network Tab

1. Open Developer Tools (F12)
2. Ga naar Network tab
3. Klik delete knop
4. Check de `/api/delete-student` request:
   - Status moet 200 zijn
   - Response moet `{"success": true}` bevatten
   - Request moet Authorization header hebben

### Stap 5: Check Database

In Supabase SQL Editor:
```sql
-- Verifieer dat student weg is
SELECT * FROM student_profiles WHERE name = 'StudentName';
-- Moet 0 rows returnen

-- Verifieer dat exam results weg zijn
SELECT * FROM exam_results WHERE student_name = 'StudentName';
-- Moet 0 rows returnen

-- Verifieer dat progress weg is
SELECT * FROM student_progress WHERE student_name = 'StudentName';
-- Moet 0 rows returnen
```

---

## 🛠️ Handmatige Fix Tools

### Cleanup Script voor wees Auth Users

Maak `scripts/cleanup-orphaned-auth-users.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  // Haal alle student profiles op
  const { data: profiles } = await supabase
    .from('student_profiles')
    .select('auth_user_id');

  const validAuthIds = profiles?.map(p => p.auth_user_id).filter(Boolean) || [];

  // Haal alle auth users op met role=student
  const { data: { users } } = await supabase.auth.admin.listUsers();

  const studentsInAuth = users?.filter(u => u.user_metadata?.role === 'student') || [];

  // Find orphans
  const orphans = studentsInAuth.filter(u => !validAuthIds.includes(u.id));

  console.log(`Found ${orphans.length} orphaned auth users`);

  for (const orphan of orphans) {
    console.log(`Deleting: ${orphan.email} (${orphan.id})`);
    await supabase.auth.admin.deleteUser(orphan.id);
  }

  console.log('Cleanup complete!');
}

cleanup();
```

---

## 📊 Database Schema Verificatie

De volgende kolommen MOETEN bestaan:

### student_profiles
- `name` (TEXT, PRIMARY KEY)
- `auth_user_id` (UUID, REFERENCES auth.users)
- `level` (TEXT)
- `is_active` (BOOLEAN)
- `created_by_admin` (TEXT)

### exam_results
- `id` (TEXT, PRIMARY KEY)
- `student_name` (TEXT) ← Moet overeenkomen met student_profiles.name

### student_progress
- `id` (TEXT, PRIMARY KEY)
- `student_name` (TEXT) ← Moet overeenkomen met student_profiles.name

### RLS Policies

Run in Supabase SQL Editor:
```sql
-- Check of policies bestaan
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('student_profiles', 'exam_results', 'student_progress')
  AND cmd = 'DELETE';
```

Moet returnen:
- `student_profiles` - `Admins can delete students`
- `exam_results` - `Admins can delete results`
- `student_progress` - `Admins can delete progress`

---

## 🎯 Success Criteria

Delete functionaliteit werkt correct als:

✅ Student profile wordt verwijderd uit `student_profiles`
✅ Alle exam results worden verwijderd uit `exam_results`
✅ Alle progress records worden verwijderd uit `student_progress`
✅ Supabase Auth user wordt verwijderd
✅ Student verdwijnt uit admin panel lijst
✅ Geen errors in browser console
✅ Geen errors in server logs
✅ Verification script geeft "ALL VERIFICATIONS PASSED"

---

## 📞 Nog steeds problemen?

Als je alle bovenstaande stappen hebt geprobeerd en het werkt nog niet:

1. **Check alle logs:**
   - Browser console (F12)
   - Terminal waar `npm run dev` draait
   - Vercel deployment logs
   - Supabase logs (in dashboard)

2. **Run volledige verificatie:**
   ```bash
   npm run build  # Check of er geen TypeScript errors zijn
   npx tsx scripts/verify-delete-flow.ts  # Backend check
   ```

3. **Verzamel debug info:**
   ```bash
   # In browser console na delete geprobeerd:
   await testDeleteFlow("StudentName")
   ```

4. **Test met nieuwe student:**
   - Maak een nieuwe test student aan
   - Voeg exam result toe
   - Verwijder via admin panel
   - Check of alles weg is

---

## 🔐 Security Checklist

✅ Service role key zit alleen in `.env.local` en Vercel env vars
✅ Service role key staat NIET in frontend code
✅ API verificeert admin role via JWT token
✅ Dubbele confirmatie in UI
✅ RLS policies beschermen tegen unauthorized deletes
✅ Cascade delete voor gerelateerde data

---

Last updated: 2026-01-13
