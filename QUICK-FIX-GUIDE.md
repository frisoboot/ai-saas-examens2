# Quick Fix Guide - Delete Issues

## ⚡ Snelle Oplossingen

### Probleem: "A user with this email address has already been registered"

**Oorzaak:** Er bestaat een orphaned auth user (auth.users record zonder student_profiles record).

**Oplossing:**
```bash
# Stap 1: Check voor orphaned users
npx tsx scripts/cleanup-orphaned-auth-users.ts

# Stap 2: Verwijder orphaned users
npx tsx scripts/cleanup-orphaned-auth-users.ts --delete

# Stap 3: Probeer opnieuw
```

---

### Probleem: Student kan niet verwijderd worden via UI

**Mogelijke oorzaken:**
1. Niet ingelogd als admin
2. API endpoint niet bereikbaar
3. Auth token ontbreekt

**Snelle check:**
```bash
# Check of alles correct werkt
npx tsx scripts/verify-delete-flow.ts

# Alle checks moeten ✅ zijn
```

**Debug in browser:**
1. Open Developer Console (F12)
2. Plak inhoud van `scripts/browser-debug-delete.js`
3. Run: `await testDeleteFlow("StudentName")`

---

### Probleem: Student profiel verwijderd maar auth user niet

**Oplossing:**
```bash
# Run cleanup script
npx tsx scripts/cleanup-orphaned-auth-users.ts --delete
```

---

### Probleem: Delete werkt maar data blijft staan

**Check welke data blijft staan:**
```sql
-- In Supabase SQL Editor:
SELECT * FROM student_profiles WHERE name = 'StudentName';
SELECT * FROM exam_results WHERE student_name = 'StudentName';
SELECT * FROM student_progress WHERE student_name = 'StudentName';
```

**Handmatig opruimen:**
```bash
# Via script
npx tsx scripts/verify-delete-flow.ts "StudentName"
```

---

## 🛠️ Maintenance Scripts

### Dagelijks onderhoud
```bash
# Check voor orphaned auth users
npx tsx scripts/cleanup-orphaned-auth-users.ts
```

### Voor nieuwe feature deploy
```bash
# Test alle functionaliteit
npm run build
npx tsx scripts/test-delete-student.ts
npx tsx scripts/verify-delete-flow.ts
```

### Bij problemen
```bash
# Stap 1: Cleanup
npx tsx scripts/cleanup-orphaned-auth-users.ts --delete

# Stap 2: Verify
npx tsx scripts/verify-delete-flow.ts

# Stap 3: Test
npx tsx scripts/test-delete-student.ts
```

---

## 📊 Health Check Commands

```bash
# Quick check - Alles OK?
npx tsx scripts/verify-delete-flow.ts

# Cleanup orphans
npx tsx scripts/cleanup-orphaned-auth-users.ts --delete

# Full test (creates & deletes test student)
npx tsx scripts/test-delete-student.ts

# Build check
npm run build
```

---

## 🔍 Debug Checklist

Wanneer delete niet werkt, check in deze volgorde:

- [ ] ✅ Alle verifications passed?
  ```bash
  npx tsx scripts/verify-delete-flow.ts
  ```

- [ ] 🧹 Orphaned users opgeruimd?
  ```bash
  npx tsx scripts/cleanup-orphaned-auth-users.ts --delete
  ```

- [ ] 🔐 Ingelogd als admin? (check in browser console)
  ```javascript
  const { data } = await window.supabase.auth.getSession();
  console.log('Role:', data.session?.user?.user_metadata?.role);
  // Moet 'admin' zijn
  ```

- [ ] 🌐 API endpoint bereikbaar?
  - Check Network tab in browser (F12)
  - Kijk naar `/api/delete-student` request
  - Status moet 200 zijn

- [ ] 🔑 Service role key correct ingesteld?
  ```bash
  cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY
  # Moet aanwezig zijn (zonder VITE_ prefix voor productie)
  ```

---

## 💡 Tips & Tricks

### Preventie van orphaned users

**Altijd via admin panel verwijderen** - De UI heeft dubbele confirmatie en correcte delete volgorde.

**Niet handmatig via SQL** - Als je toch via SQL verwijdert:
```sql
-- Correct: Gebruik deze volgorde
DELETE FROM exam_results WHERE student_name = 'Name';
DELETE FROM student_progress WHERE student_name = 'Name';
DELETE FROM student_profiles WHERE name = 'Name';
-- Dan handmatig auth user verwijderen via Supabase Dashboard
```

### Monitoring

Maak een cron job voor automatische cleanup:
```bash
# Voeg toe aan crontab (elke dag om 3:00)
0 3 * * * cd /path/to/project && npx tsx scripts/cleanup-orphaned-auth-users.ts --delete >> cleanup.log 2>&1
```

### Backup voor productie

Voor je delete operaties doet in productie:
```bash
# Export data eerst
# Via Supabase Dashboard → Database → Backups
# Of via SQL dump
```

---

## 🆘 Emergency Recovery

### Student per ongeluk verwijderd?

**Helaas niet meer te herstellen** - Delete is permanent. Daarom heeft de UI dubbele confirmatie.

**Preventie:**
- Maak regelmatig backups via Supabase Dashboard
- Test altijd eerst in development

### Bulk delete ging fout?

```bash
# Check welke users over zijn
npx tsx scripts/cleanup-orphaned-auth-users.ts

# Verwijder orphans
npx tsx scripts/cleanup-orphaned-auth-users.ts --delete

# Verify database state
npx tsx scripts/verify-delete-flow.ts
```

---

## 📞 Hulp Nodig?

1. **Check logs:**
   - Browser console (F12)
   - Terminal waar `npm run dev` draait
   - Vercel deployment logs

2. **Run diagnostics:**
   ```bash
   npx tsx scripts/verify-delete-flow.ts
   ```

3. **Lees troubleshooting:**
   - [DELETE-TROUBLESHOOTING.md](DELETE-TROUBLESHOOTING.md)
   - [DELETE-FEATURE-DOCS.md](DELETE-FEATURE-DOCS.md)

---

**Laatst bijgewerkt:** 2026-01-14
**Status:** ✅ Fixed and Verified
