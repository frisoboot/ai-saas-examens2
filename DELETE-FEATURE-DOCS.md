# Delete Student Feature - Complete Documentatie

## 📋 Overzicht

Deze feature maakt het mogelijk voor admins om student accounts volledig te verwijderen uit het systeem, inclusief:
- Student profiel
- Alle examen resultaten
- Alle voortgangs data
- Supabase Auth user account

## 🎯 Gebruik

### Via Admin Panel (UI)

1. Log in als admin
2. Ga naar **Admin Dashboard** → **Student Management** tab
3. Zoek de student in de lijst
4. Klik op het **🗑️ (trash)** icoon in de "Acties" kolom
5. Bevestig de eerste waarschuwing
6. Bevestig de tweede waarschuwing
7. Student wordt verwijderd en verdwijnt uit de lijst

### Via Code

```typescript
import { deleteStudent } from './services/authService';

// Verwijder een student
const result = await deleteStudent('StudentName');

if (result.success) {
  console.log('Student verwijderd!');
} else {
  console.error('Error:', result.error);
}
```

## 🏗️ Architectuur

### Flow Diagram

```
┌─────────────────┐
│  Admin Panel    │
│  (React UI)     │
└────────┬────────┘
         │ onClick delete button
         ▼
┌─────────────────────────────────────┐
│  AdminStudentManagement.tsx         │
│  - handleDeleteStudent()            │
│  - Dubbele confirmatie dialog       │
└────────┬────────────────────────────┘
         │ calls deleteStudent()
         ▼
┌─────────────────────────────────────┐
│  authService.ts                     │
│  - deleteStudent()                  │
│  - Detecteert prod vs dev           │
└────────┬────────────────────────────┘
         │
         ├─ PRODUCTION ─────────────────┐
         │                              │
         ▼                              │
    ┌─────────────────────────┐        │
    │  apiService.ts          │        │
    │  - apiDeleteStudent()   │        │
    │  - Adds auth token      │        │
    └────────┬────────────────┘        │
             │ HTTP POST               │
             ▼                         │
    ┌──────────────────────────┐      │
    │  API: delete-student.ts  │      │
    │  - Verifies admin JWT    │      │
    │  - Uses service role key │      │
    └────────┬─────────────────┘      │
             │                         │
             └─────────────────────────┤
                                       │
         ├─ DEVELOPMENT ───────────────┤
         │                             │
         ▼                             │
    ┌─────────────────────────┐       │
    │  Direct supabaseAdmin   │       │
    │  (dev only)             │       │
    └────────┬────────────────┘       │
             │                         │
             └─────────────────────────┤
                                       ▼
                            ┌───────────────────────┐
                            │  SUPABASE DATABASE    │
                            │  1. exam_results      │
                            │  2. student_progress  │
                            │  3. student_profiles  │
                            │  4. auth.users        │
                            └───────────────────────┘
```

## 📁 File Structuur

### Nieuwe Bestanden

```
ai-saas-examen/
├── api/
│   └── delete-student.ts                    # API endpoint voor delete
├── scripts/
│   ├── test-delete-student.ts              # Automated test script
│   ├── verify-delete-flow.ts               # Comprehensive verification
│   └── browser-debug-delete.js             # Browser console helper
├── DELETE-FEATURE-DOCS.md                  # Deze file
└── DELETE-TROUBLESHOOTING.md               # Troubleshooting guide
```

### Gewijzigde Bestanden

```
ai-saas-examen/
├── components/
│   └── AdminStudentManagement.tsx          # + Delete button & handler
├── services/
│   ├── authService.ts                      # + deleteStudent()
│   └── apiService.ts                       # + apiDeleteStudent()
```

## 🔧 Implementatie Details

### 1. API Endpoint (`api/delete-student.ts`)

**Verantwoordelijkheden:**
- Verificatie van admin JWT token
- Gebruik van service role key voor database operaties
- Cascade delete in de juiste volgorde

**Request:**
```typescript
POST /api/delete-student
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <JWT_TOKEN>"
}
Body: {
  "studentName": "StudentName"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Student StudentName is volledig verwijderd"
}
```

**Response Error:**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Delete Volgorde:**
1. Fetch student profile (get auth_user_id)
2. Delete from `exam_results` (WHERE student_name = ...)
3. Delete from `student_progress` (WHERE student_name = ...)
4. Delete from `student_profiles` (WHERE name = ...)
5. Delete from `auth.users` (WHERE id = auth_user_id)

### 2. Auth Service (`services/authService.ts`)

**deleteStudent() functie:**

```typescript
export const deleteStudent = async (
  name: string
): Promise<{ success: boolean; error?: string }> => {
  // Production: Gebruik API endpoint (veilig!)
  if (supabase && !supabaseAdmin) {
    return await apiDeleteStudent(name);
  }

  // Development: Gebruik supabaseAdmin direct
  if (supabaseAdmin) {
    // ... delete logic ...
  }

  // Fallback: localStorage
  // ... fallback logic ...
}
```

### 3. API Service (`services/apiService.ts`)

**apiDeleteStudent() functie:**

```typescript
export const apiDeleteStudent = async (
  studentName: string
): Promise<{ success: boolean; error?: string }> => {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/delete-student`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ studentName })
  });

  return await response.json();
}
```

### 4. UI Component (`components/AdminStudentManagement.tsx`)

**handleDeleteStudent() functie:**

```typescript
const handleDeleteStudent = async (name: string) => {
  // Eerste confirmatie
  const confirmed = window.confirm(
    `Weet je zeker dat je ${name} wilt verwijderen?\n\n` +
    `Dit verwijdert:\n- Het student account\n- Alle examen resultaten\n- Alle voortgangsdata\n\n` +
    `Deze actie kan NIET ongedaan gemaakt worden!`
  );
  if (!confirmed) return;

  // Tweede confirmatie
  const doubleConfirm = window.confirm(`Laatste kans: verwijder ${name} definitief?`);
  if (!doubleConfirm) return;

  // Voer delete uit
  const result = await deleteStudent(name);

  if (result.success) {
    setSuccess(`${name} is volledig verwijderd uit het systeem`);
    loadStudents(); // Refresh lijst
  } else {
    setError(result.error || 'Fout bij verwijderen student');
  }
};
```

**UI Implementatie:**
- Trash icon (🗑️) in de acties kolom
- Hover effect: rood met rode achtergrond
- Tooltip: "Student permanent verwijderen"

## 🔐 Security

### Verificaties

1. **JWT Token Verificatie**
   ```typescript
   const { data: { user }, error } = await supabase.auth.getUser(token);
   if (error || !user) {
     return res.status(401).json({ error: 'Unauthorized' });
   }
   ```

2. **Admin Role Check**
   ```typescript
   const role = user.user_metadata?.role;
   if (role !== 'admin') {
     return res.status(403).json({ error: 'Forbidden - alleen admins' });
   }
   ```

3. **Dubbele Confirmatie in UI**
   - Eerste warning: Info over wat verwijderd wordt
   - Tweede warning: Laatste kans om te annuleren

4. **Service Role Key Isolatie**
   - Service role key is ALLEEN beschikbaar op server-side
   - NOOIT geëxporteerd naar browser
   - Alleen in `.env.local` (development) en Vercel env vars (production)

### RLS Policies

Database heeft Row Level Security policies die alleen admins toestaan om te verwijderen:

```sql
-- student_profiles
CREATE POLICY "Admins can delete students"
  ON student_profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- exam_results
CREATE POLICY "Admins can delete results"
  ON exam_results FOR DELETE
  TO authenticated
  USING (is_admin());

-- student_progress
CREATE POLICY "Admins can delete progress"
  ON student_progress FOR DELETE
  TO authenticated
  USING (is_admin());
```

**Let op:** De API gebruikt de **service role key**, die RLS policies **bypass't**. Daarom is de JWT verificatie in de API endpoint cruciaal!

## 🧪 Testing

### Automated Tests

```bash
# Complete test (maakt test student, verwijdert, verifieert)
npx tsx scripts/test-delete-student.ts

# Verificatie van alle componenten
npx tsx scripts/verify-delete-flow.ts

# Test met specifieke student (OPGELET: verwijdert echt!)
npx tsx scripts/verify-delete-flow.ts "StudentName"
```

### Manual Testing (Browser)

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open browser console (F12)

3. Kopieer inhoud van `scripts/browser-debug-delete.js`

4. Test delete flow:
   ```javascript
   await testDeleteFlow("TestStudent")
   ```

5. Lijst alle studenten:
   ```javascript
   await listStudents()
   ```

### Test Checklist

- [ ] Student profile wordt verwijderd
- [ ] Exam results worden verwijderd
- [ ] Student progress wordt verwijderd
- [ ] Auth user wordt verwijderd
- [ ] Student verdwijnt uit admin lijst
- [ ] Success message verschijnt
- [ ] Geen errors in console
- [ ] Tweede delete poging geeft "Student niet gevonden"

## 📊 Database Schema

### student_profiles

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| name | TEXT | PRIMARY KEY, student naam |
| auth_user_id | UUID | FOREIGN KEY naar auth.users |
| level | TEXT | Student niveau (VMBO-TL, HAVO, VWO) |
| struggle_points | TEXT | Zwakke punten |
| is_active | BOOLEAN | Account actief? |
| created_by_admin | TEXT | Welke admin heeft student gemaakt |

### exam_results

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | TEXT | PRIMARY KEY |
| student_name | TEXT | Referentie naar student (geen FK!) |
| subject | TEXT | Vak |
| score | INTEGER | Behaalde score |
| total_questions | INTEGER | Totaal aantal vragen |
| date | TIMESTAMP | Datum van examen |

### student_progress

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | TEXT | PRIMARY KEY |
| student_name | TEXT | Referentie naar student (geen FK!) |
| subject | TEXT | Vak |
| total_exams_taken | INTEGER | Aantal examens gedaan |
| average_score | DECIMAL | Gemiddelde score |
| last_exam_date | TIMESTAMP | Laatste examen datum |

**Belangrijk:** `exam_results.student_name` en `student_progress.student_name` zijn GEEN foreign keys, maar string references. Daarom moet cascade delete handmatig gebeuren.

## 🚀 Deployment

### Environment Variables

Zorg dat de volgende variabelen zijn ingesteld:

**Development (.env.local):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Alleen voor dev!
```

**Production (Vercel):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Zonder VITE_ prefix!
```

### Vercel Configuration

Het API endpoint wordt automatisch gedeployd als Vercel Serverless Function.

**Verifieer deployment:**
```bash
# Check of endpoint bestaat
curl https://your-app.vercel.app/api/delete-student -X OPTIONS

# Moet CORS headers returnen
```

## 🔍 Troubleshooting

Zie [DELETE-TROUBLESHOOTING.md](DELETE-TROUBLESHOOTING.md) voor een complete troubleshooting guide.

**Snelle checks:**

```bash
# 1. Verifieer backend
npx tsx scripts/verify-delete-flow.ts

# 2. Check build errors
npm run build

# 3. Test API endpoint lokaal
curl -X POST http://localhost:3001/api/delete-student \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"studentName": "TestStudent"}'
```

## 📝 Code Examples

### Voorbeeld 1: Delete met error handling

```typescript
import { deleteStudent } from './services/authService';

async function handleDelete(name: string) {
  try {
    const result = await deleteStudent(name);

    if (result.success) {
      alert(`${name} succesvol verwijderd`);
      // Refresh de student lijst
      await loadStudents();
    } else {
      alert(`Fout: ${result.error}`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    alert('Er ging iets mis');
  }
}
```

### Voorbeeld 2: Verificatie na delete

```typescript
async function deleteAndVerify(name: string) {
  // Delete
  const result = await deleteStudent(name);
  if (!result.success) {
    console.error('Delete failed:', result.error);
    return;
  }

  // Verificatie
  const { data: student } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (student) {
    console.error('❌ Student still exists!');
  } else {
    console.log('✅ Student successfully deleted');
  }
}
```

### Voorbeeld 3: Bulk delete met progress

```typescript
async function bulkDelete(studentNames: string[]) {
  let deleted = 0;
  let failed = 0;

  for (const name of studentNames) {
    const result = await deleteStudent(name);

    if (result.success) {
      deleted++;
      console.log(`✅ Deleted ${name} (${deleted}/${studentNames.length})`);
    } else {
      failed++;
      console.error(`❌ Failed to delete ${name}:`, result.error);
    }
  }

  console.log(`\nSummary: ${deleted} deleted, ${failed} failed`);
}
```

## 🎓 Best Practices

1. **Altijd dubbele confirmatie** bij destructieve operaties
2. **Verificeer admin role** op zowel frontend als backend
3. **Log alle delete operaties** voor audit trail
4. **Cascade delete** in de juiste volgorde (child records eerst)
5. **Error handling** op elke stap
6. **Test grondig** voordat je in productie gaat
7. **Backup maken** voordat je bulk deletes doet

## 🔄 Future Improvements

Mogelijke verbeteringen voor de toekomst:

- [ ] Soft delete (is_deleted flag) in plaats van hard delete
- [ ] Audit log voor wie wanneer welke student verwijderd heeft
- [ ] Bulk delete functionaliteit (selecteer meerdere studenten)
- [ ] "Undo" functionaliteit (binnen 5 minuten)
- [ ] Export student data voor archivering
- [ ] Cascade delete via database foreign keys
- [ ] Async job queue voor grote delete operaties

## 📚 Referenties

- [AdminStudentManagement.tsx](components/AdminStudentManagement.tsx)
- [authService.ts](services/authService.ts#L527-L618)
- [apiService.ts](services/apiService.ts#L125-L163)
- [delete-student.ts](api/delete-student.ts)
- [DELETE-TROUBLESHOOTING.md](DELETE-TROUBLESHOOTING.md)

---

**Laatst bijgewerkt:** 2026-01-13
**Versie:** 1.0.0
**Status:** ✅ Production Ready
