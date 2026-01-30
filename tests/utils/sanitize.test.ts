/**
 * Sanitize Utility Tests
 * Test XSS preventie en HTML stripping
 */

import { describe, it, expect } from 'vitest';
import { sanitizeText } from '../../utils/sanitize';

describe('sanitizeText', () => {
  it('moet gewone tekst ongewijzigd laten', () => {
    expect(sanitizeText('Hallo wereld')).toBe('Hallo wereld');
  });

  it('moet lege string accepteren', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('moet HTML tags verwijderen', () => {
    expect(sanitizeText('<b>vet</b>')).toBe('vet');
    expect(sanitizeText('<i>cursief</i>')).toBe('cursief');
    expect(sanitizeText('<p>paragraaf</p>')).toBe('paragraaf');
  });

  it('moet script tags verwijderen (XSS preventie)', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('moet event handlers in tags verwijderen', () => {
    expect(sanitizeText('<img onerror="alert(1)" src="x">')).toBe('');
    expect(sanitizeText('<div onmouseover="steal()">tekst</div>')).toBe('tekst');
  });

  it('moet geneste HTML tags verwijderen', () => {
    expect(sanitizeText('<div><p><b>tekst</b></p></div>')).toBe('tekst');
  });

  it('moet zelf-sluitende tags verwijderen', () => {
    expect(sanitizeText('voor<br/>na')).toBe('voorna');
    expect(sanitizeText('voor<hr>na')).toBe('voorna');
  });

  it('moet HTML met attributen verwijderen', () => {
    expect(sanitizeText('<a href="https://evil.com">klik hier</a>')).toBe('klik hier');
    expect(sanitizeText('<div class="container" id="main">inhoud</div>')).toBe('inhoud');
  });

  it('moet tekst met ampersand en speciale tekens behouden', () => {
    expect(sanitizeText('a & b')).toBe('a & b');
    expect(sanitizeText('prijs > 10')).toBe('prijs > 10');
    // "5 < 10" bevat geen sluitende >, dus de regex /<[^>]*>/g matcht niet
    expect(sanitizeText('5 < 10')).toBe('5 < 10');
  });

  it('moet wiskundige expressies deels behouden', () => {
    // Tekst zonder < > tekens
    expect(sanitizeText('x² + y² = z²')).toBe('x² + y² = z²');
    expect(sanitizeText('f(x) = 2x + 3')).toBe('f(x) = 2x + 3');
  });

  it('moet meerdere tags in één string verwijderen', () => {
    const input = '<h1>Titel</h1><p>Tekst met <b>vetgedrukte</b> woorden</p>';
    expect(sanitizeText(input)).toBe('TitelTekst met vetgedrukte woorden');
  });

  it('moet iframe tags verwijderen (XSS preventie)', () => {
    expect(sanitizeText('<iframe src="evil.com"></iframe>')).toBe('');
  });

  it('moet style tags verwijderen', () => {
    expect(sanitizeText('<style>body{display:none}</style>tekst')).toBe('body{display:none}tekst');
  });
});
