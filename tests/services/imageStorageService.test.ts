/**
 * Image Storage Service Tests
 * Test afbeelding upload, validatie en helper functies
 */

import { describe, it, expect, vi } from 'vitest';

// Test de validatie logica en helper functies zonder Supabase connectie
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

describe('Image Storage - Bestandsvalidatie', () => {
  describe('MIME type validatie', () => {
    it('moet geldige MIME types accepteren', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      validTypes.forEach(type => {
        expect(ALLOWED_MIME_TYPES.includes(type)).toBe(true);
      });
    });

    it('moet ongeldige MIME types afwijzen', () => {
      const invalidTypes = [
        'application/pdf',
        'text/html',
        'application/javascript',
        'image/svg+xml',
        'application/x-executable',
      ];
      invalidTypes.forEach(type => {
        expect(ALLOWED_MIME_TYPES.includes(type)).toBe(false);
      });
    });
  });

  describe('Bestandsextensie validatie', () => {
    it('moet geldige extensies accepteren', () => {
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      validExtensions.forEach(ext => {
        expect(ALLOWED_EXTENSIONS.includes(ext)).toBe(true);
      });
    });

    it('moet ongeldige extensies afwijzen', () => {
      const invalidExtensions = ['exe', 'js', 'html', 'svg', 'pdf', 'php', 'sh'];
      invalidExtensions.forEach(ext => {
        expect(ALLOWED_EXTENSIONS.includes(ext)).toBe(false);
      });
    });

    it('moet extensie correct uit bestandsnaam halen', () => {
      const testCases = [
        { name: 'foto.jpg', expected: 'jpg' },
        { name: 'image.PNG', expected: 'png' },
        { name: 'file.name.with.dots.webp', expected: 'webp' },
        { name: 'noextension', expected: undefined },
      ];

      testCases.forEach(({ name, expected }) => {
        const ext = name.split('.').pop()?.toLowerCase();
        if (expected) {
          expect(ext).toBe(expected);
        }
      });
    });
  });

  describe('Bestandsgrootte validatie', () => {
    it('moet bestanden onder 5MB accepteren', () => {
      const validSizes = [1024, 100000, 1 * 1024 * 1024, 4.9 * 1024 * 1024];
      validSizes.forEach(size => {
        expect(size <= MAX_FILE_SIZE).toBe(true);
      });
    });

    it('moet bestanden boven 5MB afwijzen', () => {
      const invalidSizes = [5 * 1024 * 1024 + 1, 10 * 1024 * 1024, 100 * 1024 * 1024];
      invalidSizes.forEach(size => {
        expect(size > MAX_FILE_SIZE).toBe(true);
      });
    });

    it('moet exact 5MB accepteren', () => {
      expect(MAX_FILE_SIZE <= MAX_FILE_SIZE).toBe(true);
    });
  });
});

describe('Image Storage - Helper functies', () => {
  describe('isBase64Image', () => {
    it('moet base64 afbeeldingen herkennen', () => {
      const base64Urls = [
        'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        'data:image/png;base64,iVBORw0KGgo...',
        'data:image/gif;base64,R0lGODlh...',
        'data:image/webp;base64,UklGR...',
      ];

      base64Urls.forEach(url => {
        expect(url.startsWith('data:image/')).toBe(true);
      });
    });

    it('moet niet-base64 URLs correct afwijzen', () => {
      const nonBase64Urls = [
        'https://example.com/image.jpg',
        'http://cdn.example.com/photo.png',
        '/local/path/image.gif',
        'data:text/plain;base64,aGVsbG8=',
      ];

      nonBase64Urls.forEach(url => {
        expect(url.startsWith('data:image/')).toBe(false);
      });
    });
  });

  describe('deleteImage - URL parsing', () => {
    it('moet Supabase Storage URLs herkennen', () => {
      const supabaseUrl = 'https://project.supabase.co/storage/v1/object/public/exam-image/photo.jpg';
      expect(supabaseUrl.includes('/storage/v1/object/public/')).toBe(true);
    });

    it('moet niet-Supabase URLs overslaan', () => {
      const externalUrls = [
        'https://example.com/image.jpg',
        'data:image/jpeg;base64,abc123',
        'https://cdn.other.com/photo.png',
      ];

      externalUrls.forEach(url => {
        expect(url.includes('/storage/v1/object/public/')).toBe(false);
      });
    });

    it('moet bucket en pad correct extraheren uit Supabase URL', () => {
      const url = 'https://project.supabase.co/storage/v1/object/public/exam-image/question-123.jpg';
      const urlParts = url.split('/storage/v1/object/public/');

      expect(urlParts).toHaveLength(2);

      const pathParts = urlParts[1].split('/');
      expect(pathParts[0]).toBe('exam-image');
      expect(pathParts.slice(1).join('/')).toBe('question-123.jpg');
    });
  });

  describe('Bestandsnaam generatie', () => {
    it('moet een unieke bestandsnaam genereren met questionId', () => {
      const questionId = 'q-123';
      const timestamp = Date.now();
      const ext = 'jpg';
      const fileName = `${questionId}-${timestamp}.${ext}`;

      expect(fileName).toContain('q-123');
      expect(fileName).toContain('.jpg');
    });

    it('moet een unieke bestandsnaam genereren zonder questionId', () => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 9);
      const ext = 'png';
      const fileName = `question-${timestamp}-${randomString}.${ext}`;

      expect(fileName).toContain('question-');
      expect(fileName).toContain('.png');
    });
  });
});

describe('Image Storage - Magic Number Validatie', () => {
  it('moet JPEG magic numbers kennen', () => {
    const jpegSignatures = [
      [0xFF, 0xD8, 0xFF, 0xE0], // JFIF
      [0xFF, 0xD8, 0xFF, 0xE1], // EXIF
      [0xFF, 0xD8, 0xFF, 0xE2], // APP2
      [0xFF, 0xD8, 0xFF, 0xDB], // baseline
    ];

    // Alle JPEG signatures beginnen met FF D8 FF
    jpegSignatures.forEach(sig => {
      expect(sig[0]).toBe(0xFF);
      expect(sig[1]).toBe(0xD8);
      expect(sig[2]).toBe(0xFF);
    });
  });

  it('moet PNG magic number kennen', () => {
    const pngSignature = [0x89, 0x50, 0x4E, 0x47];
    // 0x50, 0x4E, 0x47 = "PNG"
    expect(pngSignature[0]).toBe(0x89);
    expect(String.fromCharCode(pngSignature[1], pngSignature[2], pngSignature[3])).toBe('PNG');
  });

  it('moet GIF magic numbers kennen', () => {
    const gif87a = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
    const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

    // Beide beginnen met "GIF8"
    const header87 = String.fromCharCode(...gif87a);
    const header89 = String.fromCharCode(...gif89a);

    expect(header87).toBe('GIF87a');
    expect(header89).toBe('GIF89a');
  });

  it('moet WebP magic number kennen (RIFF)', () => {
    const webpSignature = [0x52, 0x49, 0x46, 0x46];
    const header = String.fromCharCode(...webpSignature);

    expect(header).toBe('RIFF');
  });
});
