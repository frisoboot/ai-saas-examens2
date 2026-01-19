import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressImage } from './imageUtils';

describe('compressImage', () => {
  let mockCanvas: any;
  let mockContext: any;
  let mockImage: any;

  beforeEach(() => {
    // Mock canvas context
    mockContext = {
      drawImage: vi.fn(),
    };

    // Mock canvas
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,compressedimage'),
    };

    // Mock document.createElement for canvas
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return document.createElement(tagName);
    });

    // Mock Image
    mockImage = {
      width: 0,
      height: 0,
      src: '',
      onload: null,
      onerror: null,
    };

    global.Image = function() {
      return mockImage;
    } as any;

    // Mock FileReader
    global.FileReader = function() {
      return {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        result: null,
      };
    } as any;
  });

  it('should compress an image that is wider than 800px', async () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

    let fileReader: any;
    global.FileReader = function() {
      fileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        result: null,
      };
      return fileReader;
    } as any;

    const compressionPromise = compressImage(file);

    // Simulate FileReader loading
    await new Promise(resolve => setTimeout(resolve, 0));

    if (fileReader.onload) {
      fileReader.onload({ target: { result: 'data:image/jpeg;base64,originalimage' } });
    }

    // Simulate Image loading with large width
    mockImage.width = 1600;
    mockImage.height = 1200;

    await new Promise(resolve => setTimeout(resolve, 0));

    if (mockImage.onload) {
      mockImage.onload();
    }

    const result = await compressionPromise;

    expect(result).toBe('data:image/jpeg;base64,compressedimage');
    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600); // Height scaled proportionally
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 800, 600);
  });

  it('should compress an image that is taller than 800px', async () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

    let fileReader: any;
    global.FileReader = function() {
      fileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        result: null,
      };
      return fileReader;
    } as any;

    const compressionPromise = compressImage(file);

    // Simulate FileReader loading
    await new Promise(resolve => setTimeout(resolve, 0));

    if (fileReader.onload) {
      fileReader.onload({ target: { result: 'data:image/jpeg;base64,originalimage' } });
    }

    // Simulate Image loading with large height
    mockImage.width = 600;
    mockImage.height = 1200;

    await new Promise(resolve => setTimeout(resolve, 0));

    if (mockImage.onload) {
      mockImage.onload();
    }

    const result = await compressionPromise;

    expect(result).toBe('data:image/jpeg;base64,compressedimage');
    expect(mockCanvas.width).toBe(400); // Width scaled proportionally
    expect(mockCanvas.height).toBe(800);
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 400, 800);
  });

  it('should not resize image smaller than 800x800', async () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

    let fileReader: any;
    global.FileReader = function() {
      fileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        result: null,
      };
      return fileReader;
    } as any;

    const compressionPromise = compressImage(file);

    // Simulate FileReader loading
    await new Promise(resolve => setTimeout(resolve, 0));

    if (fileReader.onload) {
      fileReader.onload({ target: { result: 'data:image/jpeg;base64,originalimage' } });
    }

    // Simulate Image loading with small dimensions
    mockImage.width = 400;
    mockImage.height = 300;

    await new Promise(resolve => setTimeout(resolve, 0));

    if (mockImage.onload) {
      mockImage.onload();
    }

    const result = await compressionPromise;

    expect(result).toBe('data:image/jpeg;base64,compressedimage');
    expect(mockCanvas.width).toBe(400);
    expect(mockCanvas.height).toBe(300);
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 400, 300);
  });

  it('should reject if canvas context cannot be obtained', async () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

    // Mock getContext to return null
    mockCanvas.getContext = vi.fn(() => null);

    let fileReader: any;
    global.FileReader = function() {
      fileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        result: null,
      };
      return fileReader;
    } as any;

    const compressionPromise = compressImage(file);

    // Simulate FileReader loading
    await new Promise(resolve => setTimeout(resolve, 0));

    if (fileReader.onload) {
      fileReader.onload({ target: { result: 'data:image/jpeg;base64,originalimage' } });
    }

    mockImage.width = 400;
    mockImage.height = 300;

    await new Promise(resolve => setTimeout(resolve, 0));

    if (mockImage.onload) {
      mockImage.onload();
    }

    await expect(compressionPromise).rejects.toThrow('Kon canvas context niet verkrijgen');
  });

  it('should reject on FileReader error', async () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const error = new Error('FileReader error');

    let fileReader: any;
    global.FileReader = function() {
      fileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        result: null,
      };
      return fileReader;
    } as any;

    const compressionPromise = compressImage(file);

    // Simulate FileReader error
    await new Promise(resolve => setTimeout(resolve, 0));

    if (fileReader.onerror) {
      fileReader.onerror(error);
    }

    await expect(compressionPromise).rejects.toThrow('FileReader error');
  });

  it('should reject on Image load error', async () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const error = new Error('Image load error');

    let fileReader: any;
    global.FileReader = function() {
      fileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        result: null,
      };
      return fileReader;
    } as any;

    const compressionPromise = compressImage(file);

    // Simulate FileReader loading
    await new Promise(resolve => setTimeout(resolve, 0));

    if (fileReader.onload) {
      fileReader.onload({ target: { result: 'data:image/jpeg;base64,originalimage' } });
    }

    await new Promise(resolve => setTimeout(resolve, 0));

    if (mockImage.onerror) {
      mockImage.onerror(error);
    }

    await expect(compressionPromise).rejects.toThrow('Image load error');
  });
});
