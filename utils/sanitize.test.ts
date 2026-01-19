import { describe, it, expect } from 'vitest';
import { sanitizeText } from './sanitize';

describe('sanitizeText', () => {
  it('should remove basic HTML tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const expected = 'alert("xss")Hello';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should remove multiple HTML tags', () => {
    const input = '<div><p>Test</p><span>content</span></div>';
    const expected = 'Testcontent';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should handle self-closing tags', () => {
    const input = 'Line 1<br/>Line 2<hr/>End';
    const expected = 'Line 1Line 2End';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should remove tags with attributes', () => {
    const input = '<a href="malicious.com">Click here</a>';
    const expected = 'Click here';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should handle nested tags', () => {
    const input = '<div><strong><em>Nested</em></strong></div>';
    const expected = 'Nested';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should return unchanged text without HTML tags', () => {
    const input = 'This is plain text';
    expect(sanitizeText(input)).toBe(input);
  });

  it('should handle empty strings', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should handle strings with only tags', () => {
    const input = '<div></div><script></script>';
    expect(sanitizeText(input)).toBe('');
  });

  it('should handle malformed HTML', () => {
    const input = '<div>Test<p>Content';
    const expected = 'TestContent';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should remove angle brackets when they form tags', () => {
    const input = '5 < 10 and 20 > 15';
    // Note: The regex treats '< 10 and 20 >' as a tag and removes it
    const expected = '5  15';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should handle XSS attempt with event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">Test';
    const expected = 'Test';
    expect(sanitizeText(input)).toBe(expected);
  });

  it('should handle style tags', () => {
    const input = '<style>body { display: none; }</style>Content';
    const expected = 'body { display: none; }Content';
    expect(sanitizeText(input)).toBe(expected);
  });
});
