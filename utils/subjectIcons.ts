import {
  Globe,
  Briefcase,
  Dna,
  MessageCircle,
  Euro,
  Languages,
  Hourglass,
  Palette,
  Users,
  Atom,
  BookOpen,
  FlaskConical,
  Calculator,
  BookMarked
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export const getSubjectIcon = (subject: string): LucideIcon => {
  const normalizedSubject = subject.toLowerCase();

  if (normalizedSubject.includes('aardrijkskunde')) return Globe;
  if (normalizedSubject.includes('bedrijfseconomie')) return Briefcase;
  if (normalizedSubject.includes('biologie')) return Dna;
  if (normalizedSubject.includes('duits')) return MessageCircle;
  if (normalizedSubject.includes('economie')) return Euro;
  if (normalizedSubject.includes('engels')) return Languages;
  if (normalizedSubject.includes('frans')) return Languages;
  if (normalizedSubject.includes('geschiedenis')) return Hourglass;
  if (normalizedSubject.includes('kunst')) return Palette;
  if (normalizedSubject.includes('maatschappij')) return Users;
  if (normalizedSubject.includes('natuurkunde')) return Atom;
  if (normalizedSubject.includes('nederlands')) return BookOpen;
  if (normalizedSubject.includes('scheikunde')) return FlaskConical;
  if (normalizedSubject.includes('wiskunde')) return Calculator;

  return BookMarked; // Default icon
};

export const getSubjectColor = (subject: string): string => {
  const normalizedSubject = subject.toLowerCase();

  if (normalizedSubject.includes('wiskunde')) return 'text-blue-600 bg-blue-50';
  if (normalizedSubject.includes('natuurkunde')) return 'text-purple-600 bg-purple-50';
  if (normalizedSubject.includes('scheikunde')) return 'text-yellow-600 bg-yellow-50';
  if (normalizedSubject.includes('biologie')) return 'text-green-600 bg-green-50';
  if (normalizedSubject.includes('aardrijkskunde')) return 'text-emerald-600 bg-emerald-50';
  if (normalizedSubject.includes('geschiedenis')) return 'text-amber-700 bg-amber-50';
  if (normalizedSubject.includes('economie') || normalizedSubject.includes('bedrijf')) return 'text-orange-600 bg-orange-50';
  if (normalizedSubject.includes('taal') || normalizedSubject.includes('engels') || normalizedSubject.includes('nederlands') || normalizedSubject.includes('duits') || normalizedSubject.includes('frans')) return 'text-red-600 bg-red-50';
  if (normalizedSubject.includes('maatschappij')) return 'text-pink-600 bg-pink-50';
  if (normalizedSubject.includes('kunst')) return 'text-fuchsia-600 bg-fuchsia-50';

  return 'text-indigo-600 bg-indigo-50';
};
