/**
 * FASE 3.1: Load Balancing & Auto-Scaling Service
 * Manages load distribution, health checks, and auto-scaling policies
 * Supports multiple backend instances with failover
 */

import logger from '../utils/logger.js';

/**
 * Load balancer configuration
 */
const LOAD_BALANCER_CONFIG = {
  algorithm: 'round-robin', // round-robin, least-connections, ip-hash
  healthCheckInterval: 10000, // 10 seconds
  healthCheckTimeout: 5000, // 5 seconds
  unhealthyThreshold: 3, // Mark unhealthy after 3 failed checks
  healthyThreshold: 2, // Mark healthy after 2 successful checks
  stickySessions: true, // Maintain session affinity
  sessionTimeout: 3600000, // 1 hour
};

/**
 * Backend servers pool
 */
let backendServers = [];
let serverHealthStatus = {};
let sessionAffinity = new Map();

/**
 * Initialize load balancer with backend servers
 */
export const initializeLoadBalancer = (servers = []) => {
  try {
    backendServers = servers.map((server) => ({
      id: server.id || `server-${Math.random().toString(36).substr(2, 9)}`,
      host: server.host,
      port: server.port || 3000,
      region: server.region || 'us-east-1',
      weight: server.weight || 1,
      maxConnections: server.maxConnections || 1000,
      currentConnections: 0,
      enabled: true,
    }));

    // Initialize health status
    backendServers.forEach((server) => {
      serverHealthStatus[server.id] = {
        healthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        responseTime: 0,
      };
    });

    logger.info('[LoadBalancer] Load balancer initialized', {
      serverCount: backendServers.length,
      algorithm: LOAD_BALANCER_CONFIG.algorithm,
    });

    // Start health check loop
    startHealthChecks();

    return { success: true, serverCount: backendServers.length };
  } catch (err) {
    logger.error('[LoadBalancer] Exception initializing load balancer', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Select next server based on algorithm
 */
export const selectServer = (clientId = null) => {
  try {
    // Filter healthy servers
    const healthyServers = backendServers.filter(
      (s) => s.enabled && serverHealthStatus[s.id].healthy
    );

    if (healthyServers.length === 0) {
      logger.warn('[LoadBalancer] No healthy servers available');
      return { success: false, error: 'No healthy servers available' };
    }

    let selectedServer;

    // Sticky sessions
    if (LOAD_BALANCER_CONFIG.stickySessions && clientId) {
      if (sessionAffinity.has(clientId)) {
        const serverId = sessionAffinity.get(clientId);
        selectedServer = healthyServers.find((s) => s.id === serverId);

        if (selectedServer) {
          logger.info('[LoadBalancer] Session affinity: routed to sticky server', {
            clientId,
            serverId: selectedServer.id,
          });
          return { success: true, server: selectedServer };
        }
      }
    }

    // Round-robin algorithm
    if (LOAD_BALANCER_CONFIG.algorithm === 'round-robin') {
      selectedServer = healthyServers[Math.floor(Math.random() * healthyServers.length)];
    }

    // Least-connections algorithm
    if (LOAD_BALANCER_CONFIG.algorithm === 'least-connections') {
      selectedServer = healthyServers.reduce((prev, current) =>
        prev.currentConnections < current.currentConnections ? prev : current
      );
    }

    // IP-hash algorithm (consistent hashing)
    if (LOAD_BALANCER_CONFIG.algorithm === 'ip-hash' && clientId) {
      const hash =
        clientId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        healthyServers.length;
      selectedServer = healthyServers[hash];
    }

    // Store session affinity
    if (LOAD_BALANCER_CONFIG.stickySessions && clientId) {
      sessionAffinity.set(clientId, selectedServer.id);
      setTimeout(() => sessionAffinity.delete(clientId), LOAD_BALANCER_CONFIG.sessionTimeout);
    }

    selectedServer.currentConnections++;

    logger.info('[LoadBalancer] Server selected', {
      serverId: selectedServer.id,
      algorithm: LOAD_BALANCER_CONFIG.algorithm,
      currentLoad: selectedServer.currentConnections,
    });

    return { success: true, server: selectedServer };
  } catch (err) {
    logger.error('[LoadBalancer] Exception selecting server', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Mark request as completed (decrement connection count)
 */
export const releaseServer = (serverId) => {
  try {
    const server = backendServers.find((s) => s.id === serverId);
    if (server && server.currentConnections > 0) {
      server.currentConnections--;
    }
  } catch (err) {
    logger.error('[LoadBalancer] Exception releasing server', {
      serverId,
      error: err.message,
    });
  }
};

/**
 * Perform health check on all servers
 */
const startHealthChecks = () => {
  setInterval(async () => {
    for (const server of backendServers) {
      await performHealthCheck(server);
    }
  }, LOAD_BALANCER_CONFIG.healthCheckInterval);
};

/**
 * Health check for single server
 */
const performHealthCheck = async (server) => {
  try {
    const startTime = Date.now();

    // Simulate health check (in production, make HTTP request)
    const isHealthy = Math.random() > 0.05; // 95% success rate for demo
    const responseTime = Math.random() * 100 + 10; // 10-110ms

    const status = serverHealthStatus[server.id];

    if (isHealthy) {
      status.consecutiveSuccesses++;
      status.consecutiveFailures = 0;
      status.responseTime = responseTime;

      if (status.consecutiveSuccesses >= LOAD_BALANCER_CONFIG.healthyThreshold && !status.healthy) {
        status.healthy = true;
        logger.info('[LoadBalancer] Server marked HEALTHY', {
          serverId: server.id,
          responseTime: `${responseTime.toFixed(2)}ms`,
        });
      }
    } else {
      status.consecutiveFailures++;
      status.consecutiveSuccesses = 0;

      if (
        status.consecutiveFailures >= LOAD_BALANCER_CONFIG.unhealthyThreshold &&
        status.healthy
      ) {
        status.healthy = false;
        logger.warn('[LoadBalancer] Server marked UNHEALTHY', {
          serverId: server.id,
          failureCount: status.consecutiveFailures,
        });
      }
    }

    status.lastCheck = new Date();
  } catch (err) {
    logger.error('[LoadBalancer] Exception during health check', {
      serverId: server.id,
      error: err.message,
    });
  }
};

/**
 * Get load balancer status
 */
export const getLoadBalancerStatus = () => {
  try {
    const healthyServers = backendServers.filter(
      (s) => serverHealthStatus[s.id].healthy
    ).length;
    const totalLoad = backendServers.reduce(
      (sum, s) => sum + s.currentConnections,
      0
    );
    const avgResponseTime =
      backendServers.reduce(
        (sum, s) => sum + (serverHealthStatus[s.id].responseTime || 0),
        0
      ) / backendServers.length;

    return {
      totalServers: backendServers.length,
      healthyServers,
      unhealthyServers: backendServers.length - healthyServers,
      totalConnections: totalLoad,
      avgResponseTime: avgResponseTime.toFixed(2),
      algorithm: LOAD_BALANCER_CONFIG.algorithm,
      servers: backendServers.map((s) => ({
        id: s.id,
        host: s.host,
        port: s.port,
        region: s.region,
        healthy: serverHealthStatus[s.id].healthy,
        currentConnections: s.currentConnections,
        responseTime: serverHealthStatus[s.id].responseTime.toFixed(2),
        weight: s.weight,
      })),
    };
  } catch (err) {
    logger.error('[LoadBalancer] Exception getting status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Auto-scaling policy
 */
export const evaluateAutoScaling = (cpuThreshold = 70, memoryThreshold = 80) => {
  try {
    const status = getLoadBalancerStatus();
    const healthyServers = status.healthyServers;
    const totalServers = status.totalServers;

    // Placeholder metrics (in production, get from monitoring service)
    const avgCPU = Math.random() * 100;
    const avgMemory = Math.random() * 100;

    const recommendations = {
      scaleUp: false,
      scaleDown: false,
      reason: '',
    };

    // Scale up if CPU or memory is high
    if (avgCPU > cpuThreshold || avgMemory > memoryThreshold) {
      recommendations.scaleUp = true;
      recommendations.reason = `CPU: ${avgCPU.toFixed(2)}%, Memory: ${avgMemory.toFixed(2)}%`;
      logger.warn('[LoadBalancer] Auto-scaling UP recommended', recommendations);
    }

    // Scale down if most servers are underutilized
    const utilizationRate = status.totalConnections / (totalServers * 1000);
    if (utilizationRate < 0.2 && healthyServers > 2) {
      recommendations.scaleDown = true;
      recommendations.reason = `Low utilization: ${(utilizationRate * 100).toFixed(2)}%`;
      logger.info('[LoadBalancer] Auto-scaling DOWN recommended', recommendations);
    }

    return {
      success: true,
      cpuUsage: avgCPU.toFixed(2),
      memoryUsage: avgMemory.toFixed(2),
      utilizationRate: (utilizationRate * 100).toFixed(2),
      ...recommendations,
    };
  } catch (err) {
    logger.error('[LoadBalancer] Exception evaluating auto-scaling', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Add server to pool
 */
export const addServer = (server) => {
  try {
    const newServer = {
      id: server.id || `server-${Math.random().toString(36).substr(2, 9)}`,
      host: server.host,
      port: server.port || 3000,
      region: server.region || 'us-east-1',
      weight: server.weight || 1,
      maxConnections: server.maxConnections || 1000,
      currentConnections: 0,
      enabled: true,
    };

    backendServers.push(newServer);
    serverHealthStatus[newServer.id] = {
      healthy: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      responseTime: 0,
    };

    logger.info('[LoadBalancer] Server added to pool', {
      serverId: newServer.id,
      host: newServer.host,
    });

    return { success: true, serverId: newServer.id };
  } catch (err) {
    logger.error('[LoadBalancer] Exception adding server', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Remove server from pool
 */
export const removeServer = (serverId) => {
  try {
    backendServers = backendServers.filter((s) => s.id !== serverId);
    delete serverHealthStatus[serverId];

    logger.info('[LoadBalancer] Server removed from pool', { serverId });

    return { success: true };
  } catch (err) {
    logger.error('[LoadBalancer] Exception removing server', {
      serverId,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeLoadBalancer,
  selectServer,
  releaseServer,
  getLoadBalancerStatus,
  evaluateAutoScaling,
  addServer,
  removeServer,
};
