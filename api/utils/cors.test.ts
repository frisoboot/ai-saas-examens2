import { describe, it, expect, vi } from 'vitest';
import { setCorsHeaders } from './cors';

describe('setCorsHeaders', () => {
  it('should set CORS headers for allowed production origin', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'https://ai-examentrainer.nl');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://ai-examentrainer.nl');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST,OPTIONS');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  });

  it('should set CORS headers for allowed www production origin', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'https://www.ai-examentrainer.nl');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://www.ai-examentrainer.nl');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  });

  it('should set CORS headers for Vercel preview deployments', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'https://my-app-abc123.vercel.app');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://my-app-abc123.vercel.app');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  });

  it('should set CORS headers for localhost', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'http://localhost:3000');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  });

  it('should set CORS headers for 127.0.0.1', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'http://127.0.0.1:5173');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  });

  it('should set CORS headers for IPv6 localhost', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'http://[::1]:3000');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://[::1]:3000');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  });

  it('should NOT set Access-Control-Allow-Origin for disallowed origins', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'https://malicious-site.com');

    // Should not set Access-Control-Allow-Origin for disallowed origin
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');

    // But should still set other CORS headers
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST,OPTIONS');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  });

  it('should NOT set Access-Control-Allow-Origin when origin is undefined', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, undefined);

    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  });

  it('should accept custom methods parameter', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'https://ai-examentrainer.nl', 'GET,POST,PUT,DELETE');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  });

  it('should block HTTP production domains (non-HTTPS)', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'http://ai-examentrainer.nl');

    // Should not allow HTTP version of production domain
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://ai-examentrainer.nl');
  });

  it('should block non-vercel.app domains that look similar', () => {
    const mockRes: any = {
      setHeader: vi.fn(),
    };

    setCorsHeaders(mockRes, 'https://my-app.vercel.app.malicious.com');

    // Should not allow domains that end with vercel.app but have additional subdomains
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
  });
});
