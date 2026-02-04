import { Question } from '../types';

/**
 * Extract the question number from a question ID.
 * ID format: Subject-Year-TTijdvak-QNumber (e.g., "Nederlands-2024-T1-Q5" → 5)
 * Falls back to Infinity so unparseable IDs sort to the end.
 */
function extractQuestionNumber(id: string): number {
  const match = id.match(/Q(\d+)$/i);
  return match ? parseInt(match[1], 10) : Infinity;
}

/**
 * Sort exam questions so that:
 * 1. Questions are ordered by their question number (extracted from ID)
 * 2. Questions with the same section stay grouped together
 * 3. Section order is determined by the lowest question number in that section
 * 4. sectionIntro is only kept on the first question of each section group
 */
export function sortExamQuestions(questions: Question[]): Question[] {
  if (questions.length <= 1) return questions;

  // Assign a question number to each question
  const withNumbers = questions.map(q => ({
    question: q,
    num: extractQuestionNumber(q.id),
  }));

  // Group questions by section (undefined/empty section = standalone questions)
  const sectionMap = new Map<string, typeof withNumbers>();
  const standaloneQuestions: typeof withNumbers = [];

  for (const item of withNumbers) {
    const section = item.question.section;
    if (section) {
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section)!.push(item);
    } else {
      standaloneQuestions.push(item);
    }
  }

  // Sort questions within each section by question number
  for (const items of sectionMap.values()) {
    items.sort((a, b) => a.num - b.num);
  }

  // Sort standalone questions by question number
  standaloneQuestions.sort((a, b) => a.num - b.num);

  // Build sortable blocks: each section is a block, each standalone is a block
  type Block = { sortKey: number; questions: typeof withNumbers };
  const blocks: Block[] = [];

  for (const [, items] of sectionMap) {
    blocks.push({
      sortKey: items[0].num, // lowest question number in the section
      questions: items,
    });
  }

  for (const item of standaloneQuestions) {
    blocks.push({
      sortKey: item.num,
      questions: [item],
    });
  }

  // Sort blocks by their sort key (lowest question number)
  blocks.sort((a, b) => a.sortKey - b.sortKey);

  // Flatten blocks back into a single sorted array
  const sorted: Question[] = [];
  for (const block of blocks) {
    for (let i = 0; i < block.questions.length; i++) {
      const q = { ...block.questions[i].question };

      // Ensure sectionIntro only appears on the first question of a section group
      if (q.section) {
        if (i === 0) {
          // Keep or move sectionIntro to first question
          const introSource = block.questions.find(bq => bq.question.sectionIntro);
          if (introSource && !q.sectionIntro) {
            q.sectionIntro = introSource.question.sectionIntro;
          }
        } else {
          // Remove sectionIntro from non-first questions
          delete q.sectionIntro;
        }
      }

      sorted.push(q);
    }
  }

  return sorted;
}
