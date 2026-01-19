import { describe, it, expect } from 'vitest';
import { getSubjectIcon, getSubjectColor } from './subjectIcons';
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

describe('getSubjectIcon', () => {
  it('should return Globe icon for aardrijkskunde', () => {
    expect(getSubjectIcon('aardrijkskunde')).toBe(Globe);
    expect(getSubjectIcon('AARDRIJKSKUNDE')).toBe(Globe);
    expect(getSubjectIcon('Aardrijkskunde HAVO')).toBe(Globe);
  });

  it('should return Briefcase icon for bedrijfseconomie', () => {
    expect(getSubjectIcon('bedrijfseconomie')).toBe(Briefcase);
    expect(getSubjectIcon('BEDRIJFSECONOMIE')).toBe(Briefcase);
  });

  it('should return Dna icon for biologie', () => {
    expect(getSubjectIcon('biologie')).toBe(Dna);
    expect(getSubjectIcon('Biologie VWO')).toBe(Dna);
  });

  it('should return MessageCircle icon for duits', () => {
    expect(getSubjectIcon('duits')).toBe(MessageCircle);
    expect(getSubjectIcon('DUITS')).toBe(MessageCircle);
  });

  it('should return Euro icon for economie', () => {
    expect(getSubjectIcon('economie')).toBe(Euro);
    expect(getSubjectIcon('Economie HAVO')).toBe(Euro);
  });

  it('should return Languages icon for engels', () => {
    expect(getSubjectIcon('engels')).toBe(Languages);
    expect(getSubjectIcon('ENGELS')).toBe(Languages);
  });

  it('should return Languages icon for frans', () => {
    expect(getSubjectIcon('frans')).toBe(Languages);
    expect(getSubjectIcon('Frans VMBO-TL')).toBe(Languages);
  });

  it('should return Hourglass icon for geschiedenis', () => {
    expect(getSubjectIcon('geschiedenis')).toBe(Hourglass);
    expect(getSubjectIcon('GESCHIEDENIS')).toBe(Hourglass);
  });

  it('should return Palette icon for kunst', () => {
    expect(getSubjectIcon('kunst')).toBe(Palette);
    expect(getSubjectIcon('Kunst algemeen')).toBe(Palette);
  });

  it('should return Users icon for maatschappij', () => {
    expect(getSubjectIcon('maatschappij')).toBe(Users);
    expect(getSubjectIcon('Maatschappijleer')).toBe(Users);
  });

  it('should return Atom icon for natuurkunde', () => {
    expect(getSubjectIcon('natuurkunde')).toBe(Atom);
    expect(getSubjectIcon('NATUURKUNDE VWO')).toBe(Atom);
  });

  it('should return BookOpen icon for nederlands', () => {
    expect(getSubjectIcon('nederlands')).toBe(BookOpen);
    expect(getSubjectIcon('Nederlands HAVO')).toBe(BookOpen);
  });

  it('should return FlaskConical icon for scheikunde', () => {
    expect(getSubjectIcon('scheikunde')).toBe(FlaskConical);
    expect(getSubjectIcon('Scheikunde VWO')).toBe(FlaskConical);
  });

  it('should return Calculator icon for wiskunde', () => {
    expect(getSubjectIcon('wiskunde')).toBe(Calculator);
    expect(getSubjectIcon('Wiskunde A')).toBe(Calculator);
    expect(getSubjectIcon('wiskunde B')).toBe(Calculator);
  });

  it('should return BookMarked (default) for unknown subjects', () => {
    expect(getSubjectIcon('unknown')).toBe(BookMarked);
    expect(getSubjectIcon('latijn')).toBe(BookMarked);
    expect(getSubjectIcon('')).toBe(BookMarked);
  });
});

describe('getSubjectColor', () => {
  it('should return blue color for wiskunde', () => {
    expect(getSubjectColor('wiskunde')).toBe('text-blue-600 bg-blue-50');
    expect(getSubjectColor('Wiskunde A')).toBe('text-blue-600 bg-blue-50');
    expect(getSubjectColor('WISKUNDE B')).toBe('text-blue-600 bg-blue-50');
  });

  it('should return purple color for natuurkunde', () => {
    expect(getSubjectColor('natuurkunde')).toBe('text-purple-600 bg-purple-50');
    expect(getSubjectColor('NATUURKUNDE')).toBe('text-purple-600 bg-purple-50');
  });

  it('should return yellow color for scheikunde', () => {
    expect(getSubjectColor('scheikunde')).toBe('text-yellow-600 bg-yellow-50');
    expect(getSubjectColor('Scheikunde VWO')).toBe('text-yellow-600 bg-yellow-50');
  });

  it('should return green color for biologie', () => {
    expect(getSubjectColor('biologie')).toBe('text-green-600 bg-green-50');
    expect(getSubjectColor('BIOLOGIE')).toBe('text-green-600 bg-green-50');
  });

  it('should return emerald color for aardrijkskunde', () => {
    expect(getSubjectColor('aardrijkskunde')).toBe('text-emerald-600 bg-emerald-50');
    expect(getSubjectColor('Aardrijkskunde HAVO')).toBe('text-emerald-600 bg-emerald-50');
  });

  it('should return amber color for geschiedenis', () => {
    expect(getSubjectColor('geschiedenis')).toBe('text-amber-700 bg-amber-50');
    expect(getSubjectColor('GESCHIEDENIS')).toBe('text-amber-700 bg-amber-50');
  });

  it('should return orange color for economie', () => {
    expect(getSubjectColor('economie')).toBe('text-orange-600 bg-orange-50');
    expect(getSubjectColor('Economie HAVO')).toBe('text-orange-600 bg-orange-50');
  });

  it('should return orange color for bedrijfseconomie', () => {
    expect(getSubjectColor('bedrijfseconomie')).toBe('text-orange-600 bg-orange-50');
    expect(getSubjectColor('Bedrijf')).toBe('text-orange-600 bg-orange-50');
  });

  it('should return red color for language subjects', () => {
    expect(getSubjectColor('nederlands')).toBe('text-red-600 bg-red-50');
    expect(getSubjectColor('engels')).toBe('text-red-600 bg-red-50');
    expect(getSubjectColor('duits')).toBe('text-red-600 bg-red-50');
    expect(getSubjectColor('frans')).toBe('text-red-600 bg-red-50');
    expect(getSubjectColor('taal')).toBe('text-red-600 bg-red-50');
  });

  it('should return pink color for maatschappij', () => {
    expect(getSubjectColor('maatschappij')).toBe('text-pink-600 bg-pink-50');
    expect(getSubjectColor('Maatschappijleer')).toBe('text-pink-600 bg-pink-50');
  });

  it('should return fuchsia color for kunst', () => {
    expect(getSubjectColor('kunst')).toBe('text-fuchsia-600 bg-fuchsia-50');
    expect(getSubjectColor('Kunst algemeen')).toBe('text-fuchsia-600 bg-fuchsia-50');
  });

  it('should return indigo (default) for unknown subjects', () => {
    expect(getSubjectColor('unknown')).toBe('text-indigo-600 bg-indigo-50');
    expect(getSubjectColor('latijn')).toBe('text-indigo-600 bg-indigo-50');
    expect(getSubjectColor('')).toBe('text-indigo-600 bg-indigo-50');
  });
});
