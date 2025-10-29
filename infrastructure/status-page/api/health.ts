/**
 * GhostSOL System Health API
 * 
 * Provides real-time health status for all system components
 * Used by the public status page at uptime.ghostsol.io
 */

import { Connection } from '@solana/web3.js';

// Type definitions
export interface ComponentStatus {
  id: string;
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: string;
  errorMessage?: string;
}

export interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  message: string;
  components: ComponentStatus[];
  uptime: {
    day1: number;
    day30: number;
    day90: number;
  };
  incidents: Incident[];
  lastUpdated: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  duration: string;
  status: 'ongoing' | 'resolved';
  affectedComponents: string[];
}

// Configuration
const RPC_ENDPOINTS = {
  PRIMARY: process.env.PHOTON_RPC_PRIMARY || 'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',
  BACKUP: process.env.PHOTON_RPC_BACKUP || 'https://api.devnet.solana.com',
};

const FORESTER_ENDPOINT = process.env.FORESTER_ENDPOINT || 'http://localhost:8080';
const SDK_ENDPOINT = process.env.SDK_ENDPOINT || 'http://localhost:3000';

const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

/**
 * Check Photon RPC (Primary) health
 */
export async function checkPhotonRpcPrimary(): Promise<ComponentStatus> {
  const startTime = Date.now();
  
  try {
    const connection = new Connection(RPC_ENDPOINTS.PRIMARY, 'confirmed');
    await Promise.race([
      connection.getSlot(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return {
      id: 'photon-rpc-primary',
      status: responseTime > 3000 ? 'degraded' : 'operational',
      responseTime,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: 'photon-rpc-primary',
      status: 'down',
      lastCheck: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Photon RPC (Backup) health
 */
export async function checkPhotonRpcBackup(): Promise<ComponentStatus> {
  const startTime = Date.now();
  
  try {
    const connection = new Connection(RPC_ENDPOINTS.BACKUP, 'confirmed');
    await Promise.race([
      connection.getSlot(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return {
      id: 'photon-rpc-backup',
      status: responseTime > 3000 ? 'degraded' : 'operational',
      responseTime,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: 'photon-rpc-backup',
      status: 'down',
      lastCheck: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Forester service health
 */
export async function checkForesterHealth(): Promise<ComponentStatus> {
  const startTime = Date.now();
  
  try {
    const response = await Promise.race([
      fetch(`${FORESTER_ENDPOINT}/health`),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        id: 'forester',
        status: responseTime > 5000 ? 'degraded' : 'operational',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } else {
      return {
        id: 'forester',
        status: 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        errorMessage: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      id: 'forester',
      status: 'down',
      lastCheck: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check SDK endpoint health
 */
export async function checkSdkEndpoint(): Promise<ComponentStatus> {
  const startTime = Date.now();
  
  try {
    const response = await Promise.race([
      fetch(`${SDK_ENDPOINT}/health`),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        id: 'sdk-endpoints',
        status: responseTime > 2000 ? 'degraded' : 'operational',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } else {
      return {
        id: 'sdk-endpoints',
        status: 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        errorMessage: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      id: 'sdk-endpoints',
      status: 'down',
      lastCheck: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate uptime percentage for a given time period
 */
export async function calculateUptime(days: number): Promise<number> {
  // TODO: Implement actual uptime tracking with database
  // For now, return mock data based on component health
  
  // In production, this should query a time-series database
  // that stores health check results over time
  
  // Mock implementation:
  // Assume 99.9% uptime as baseline
  const baselineUptime = 99.9;
  
  // Add some variance based on days
  const variance = Math.random() * 0.1;
  
  return Math.min(100, baselineUptime - variance);
}

/**
 * Get recent incidents
 */
export async function getRecentIncidents(limit: number = 10): Promise<Incident[]> {
  // TODO: Implement actual incident tracking with database
  // For now, return empty array or mock data
  
  // In production, this should query an incidents database
  // that stores historical incident data
  
  return [];
}

/**
 * Main function to get complete system status
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  // Run all health checks in parallel for speed
  const checks = await Promise.all([
    checkPhotonRpcPrimary(),
    checkPhotonRpcBackup(),
    checkForesterHealth(),
    checkSdkEndpoint(),
  ]);

  // Calculate uptime metrics in parallel
  const [uptime1d, uptime30d, uptime90d] = await Promise.all([
    calculateUptime(1),
    calculateUptime(30),
    calculateUptime(90),
  ]);

  // Get recent incidents
  const incidents = await getRecentIncidents(5);

  // Determine overall system status
  const downCount = checks.filter(c => c.status === 'down').length;
  const degradedCount = checks.filter(c => c.status === 'degraded').length;

  let overallStatus: 'operational' | 'degraded' | 'down';
  let message: string;

  if (downCount > 0) {
    overallStatus = 'down';
    message = `${downCount} component(s) are currently unavailable`;
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
    message = `${degradedCount} component(s) are experiencing degraded performance`;
  } else {
    overallStatus = 'operational';
    message = 'All systems operational';
  }

  return {
    status: overallStatus,
    message,
    components: checks,
    uptime: {
      day1: uptime1d,
      day30: uptime30d,
      day90: uptime90d,
    },
    incidents,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * API handler for serverless deployment (Vercel, Netlify, etc.)
 */
export async function handler(event: any) {
  try {
    const status = await getSystemStatus();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      },
      body: JSON.stringify(status),
    };
  } catch (error) {
    console.error('Error fetching system status:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch system status',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

// Export all functions
export default {
  getSystemStatus,
  checkPhotonRpcPrimary,
  checkPhotonRpcBackup,
  checkForesterHealth,
  checkSdkEndpoint,
  calculateUptime,
  getRecentIncidents,
  handler,
};
