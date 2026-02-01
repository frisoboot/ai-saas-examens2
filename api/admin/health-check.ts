/**
 * Vercel Serverless Function - System Health Check
 * Controleert de status van alle backend services
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors.js';

// Check of email een admin is
const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

async function checkSupabaseDatabase(supabaseAdmin: any): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Probeer een simpele query uit te voeren
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select('id')
      .limit(1);

    const responseTime = Date.now() - start;

    if (error) {
      return {
        name: 'Supabase Database',
        status: 'unhealthy',
        responseTime,
        message: `Database query failed: ${error.message}`,
      };
    }

    if (responseTime > 2000) {
      return {
        name: 'Supabase Database',
        status: 'degraded',
        responseTime,
        message: 'Database responding slowly',
      };
    }

    return {
      name: 'Supabase Database',
      status: 'healthy',
      responseTime,
      message: 'Database connection successful',
    };
  } catch (error: any) {
    return {
      name: 'Supabase Database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: `Database error: ${error.message}`,
    };
  }
}

async function checkSupabaseAuth(supabaseAdmin: any): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Probeer de auth admin API te bereiken
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    const responseTime = Date.now() - start;

    if (error) {
      return {
        name: 'Supabase Auth',
        status: 'unhealthy',
        responseTime,
        message: `Auth service failed: ${error.message}`,
      };
    }

    if (responseTime > 2000) {
      return {
        name: 'Supabase Auth',
        status: 'degraded',
        responseTime,
        message: 'Auth service responding slowly',
      };
    }

    return {
      name: 'Supabase Auth',
      status: 'healthy',
      responseTime,
      message: 'Auth service operational',
      details: { userCount: data?.users?.length || 0 },
    };
  } catch (error: any) {
    return {
      name: 'Supabase Auth',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: `Auth error: ${error.message}`,
    };
  }
}

async function checkSupabaseStorage(supabaseAdmin: any): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Probeer de storage buckets te listen
    const { data, error } = await supabaseAdmin.storage.listBuckets();

    const responseTime = Date.now() - start;

    if (error) {
      return {
        name: 'Supabase Storage',
        status: 'unhealthy',
        responseTime,
        message: `Storage service failed: ${error.message}`,
      };
    }

    const bucketNames = data?.map((b: any) => b.name) || [];

    return {
      name: 'Supabase Storage',
      status: 'healthy',
      responseTime,
      message: 'Storage service operational',
      details: { buckets: bucketNames },
    };
  } catch (error: any) {
    return {
      name: 'Supabase Storage',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: `Storage error: ${error.message}`,
    };
  }
}

async function checkAIGateway(): Promise<ServiceHealth> {
  const start = Date.now();
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return {
      name: 'Vercel AI Gateway',
      status: 'unhealthy',
      message: 'AI_GATEWAY_API_KEY not configured',
    };
  }

  try {
    // Test de AI Gateway met een models request
    const response = await fetch('https://ai-gateway.vercel.sh/v1/models', {
      method: 'GET',
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name: 'Vercel AI Gateway',
        status: 'unhealthy',
        responseTime,
        message: `API returned ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }

    const data = await response.json();

    if (responseTime > 3000) {
      return {
        name: 'Vercel AI Gateway',
        status: 'degraded',
        responseTime,
        message: 'API responding slowly',
        details: { modelsAvailable: data?.data?.length || 0 },
      };
    }

    return {
      name: 'Vercel AI Gateway',
      status: 'healthy',
      responseTime,
      message: 'AI Gateway operational',
      details: { modelsAvailable: data?.data?.length || 0 },
    };
  } catch (error: any) {
    return {
      name: 'Vercel AI Gateway',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: `API error: ${error.message}`,
    };
  }
}

async function checkXAIAPI(): Promise<ServiceHealth> {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return {
      name: 'xAI Grok API',
      status: 'unknown',
      message: 'XAI_API_KEY not configured (optional)',
    };
  }

  const start = Date.now();

  try {
    // Test de API met een models request
    const response = await fetch('https://api.x.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      return {
        name: 'xAI Grok API',
        status: 'unhealthy',
        responseTime,
        message: `API returned ${response.status}`,
      };
    }

    return {
      name: 'xAI Grok API',
      status: 'healthy',
      responseTime,
      message: 'API key valid',
    };
  } catch (error: any) {
    return {
      name: 'xAI Grok API',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: `API error: ${error.message}`,
    };
  }
}

async function checkMollieAPI(): Promise<ServiceHealth> {
  const apiKey = process.env.MOLLIE_API_KEY;

  if (!apiKey) {
    return {
      name: 'Mollie Payments',
      status: 'unknown',
      message: 'MOLLIE_API_KEY not configured (optional)',
    };
  }

  const start = Date.now();

  try {
    // Test de Mollie API met een methods check (werkt met API keys, unlike /v2/permissions)
    const response = await fetch('https://api.mollie.com/v2/methods', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        name: 'Mollie Payments',
        status: 'unhealthy',
        responseTime,
        message: `API returned ${response.status}: ${errorData?.detail || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    const methodCount = data?._embedded?.methods?.length || 0;

    return {
      name: 'Mollie Payments',
      status: 'healthy',
      responseTime,
      message: 'Payment gateway operational',
      details: { availableMethods: methodCount },
    };
  } catch (error: any) {
    return {
      name: 'Mollie Payments',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: `API error: ${error.message}`,
    };
  }
}

function checkEnvironmentVariables(): ServiceHealth {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_ADMIN_EMAILS',
  ];

  const optionalVars = [
    'AI_GATEWAY_API_KEY',
    'XAI_API_KEY',
    'MOLLIE_API_KEY',
  ];

  const missingRequired = requiredVars.filter(v => !process.env[v]);
  const missingOptional = optionalVars.filter(v => !process.env[v]);
  const configuredOptional = optionalVars.filter(v => process.env[v]);

  if (missingRequired.length > 0) {
    return {
      name: 'Environment Config',
      status: 'unhealthy',
      message: `Missing required: ${missingRequired.join(', ')}`,
      details: { missingRequired, missingOptional, configuredOptional },
    };
  }

  if (missingOptional.length > 0) {
    return {
      name: 'Environment Config',
      status: 'degraded',
      message: `All required vars set. Optional missing: ${missingOptional.join(', ')}`,
      details: { missingOptional, configuredOptional },
    };
  }

  return {
    name: 'Environment Config',
    status: 'healthy',
    message: 'All environment variables configured',
    details: { configuredOptional },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers via gedeelde whitelist utility
  setCorsHeaders(res, req.headers.origin, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verifieer admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    // Run alle health checks parallel
    const [
      dbHealth,
      authHealth,
      storageHealth,
      aiGatewayHealth,
      xaiHealth,
      mollieHealth,
    ] = await Promise.all([
      checkSupabaseDatabase(supabaseAdmin),
      checkSupabaseAuth(supabaseAdmin),
      checkSupabaseStorage(supabaseAdmin),
      checkAIGateway(),
      checkXAIAPI(),
      checkMollieAPI(),
    ]);

    // Environment check is synchronous
    const envHealth = checkEnvironmentVariables();

    const services: ServiceHealth[] = [
      envHealth,
      dbHealth,
      authHealth,
      storageHealth,
      aiGatewayHealth,
      xaiHealth,
      mollieHealth,
    ];

    // Calculate summary
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      // Check if critical services are unhealthy
      const criticalUnhealthy = services.filter(
        s => s.status === 'unhealthy' &&
        ['Supabase Database', 'Supabase Auth', 'Environment Config'].includes(s.name)
      );
      overallStatus = criticalUnhealthy.length > 0 ? 'unhealthy' : 'degraded';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      summary,
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('[Health Check] Error:', error);
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
}
