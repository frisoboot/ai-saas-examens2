-- ============================================================================
-- MIGRATION: Add section fields to questions table
-- ============================================================================
-- Dit voegt sectie-ondersteuning toe voor officiële examens die meerdere
-- secties hebben met een gezamenlijke introductietekst.
--
-- Velden:
--   - section: Sectietitel (bijv. "Kwaliteitscontrole voor straight whiskey")
--   - section_intro: Introductietekst voor de sectie (alleen bij eerste vraag)
-- ============================================================================

-- Voeg section kolom toe als deze nog niet bestaat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'section'
  ) THEN
    ALTER TABLE questions ADD COLUMN section TEXT;
    RAISE NOTICE '✅ Column "section" added to questions table';
  ELSE
    RAISE NOTICE '⚠️  Column "section" already exists';
  END IF;
END $$;

-- Voeg section_intro kolom toe als deze nog niet bestaat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'section_intro'
  ) THEN
    ALTER TABLE questions ADD COLUMN section_intro TEXT;
    RAISE NOTICE '✅ Column "section_intro" added to questions table';
  ELSE
    RAISE NOTICE '⚠️  Column "section_intro" already exists';
  END IF;
END $$;

-- Optioneel: Index op section voor snellere queries
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section);

-- Verificatie
DO $$
DECLARE
  section_exists BOOLEAN;
  section_intro_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'section'
  ) INTO section_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'section_intro'
  ) INTO section_intro_exists;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE: Section Fields';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'section column: %', CASE WHEN section_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'section_intro column: %', CASE WHEN section_intro_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
END $$;
