import axios, { AxiosInstance } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: "http" | "https";
  username?: string;
  password?: string;
}

/**
 * Parse proxy configuration from environment variables
 * Supports format: PROXY_HOST:PORT or PROXY_URL
 */
export function getProxyConfig(): ProxyConfig | null {
  // Option 1: Individual components
  const proxyHost = process.env.PROXY_HOST;
  const proxyPort = process.env.PROXY_PORT;
  const proxyProtocol = (process.env.PROXY_PROTOCOL || "https") as "http" | "https";
  const proxyUsername = process.env.PROXY_USERNAME;
  const proxyPassword = process.env.PROXY_PASSWORD;

  // Option 2: Full URL format (http://host:port or https://host:port)
  const proxyUrl = process.env.PROXY_URL;

  if (proxyUrl) {
    try {
      const url = new URL(proxyUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || (url.protocol === "https:" ? 443 : 80),
        protocol: url.protocol === "https:" ? "https" : "http",
        username: url.username || undefined,
        password: url.password || undefined,
      };
    } catch (e) {
      console.error("Invalid PROXY_URL format:", proxyUrl);
      return null;
    }
  }

  if (proxyHost && proxyPort) {
    return {
      host: proxyHost,
      port: parseInt(proxyPort),
      protocol: proxyProtocol,
      username: proxyUsername,
      password: proxyPassword,
    };
  }

  return null;
}

/**
 * Create an axios instance configured with proxy
 */
export function createProxiedAxiosInstance(baseURL?: string): AxiosInstance {
  const proxyConfig = getProxyConfig();
  
  const axiosConfig: any = {
    timeout: 30000,
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  };

  if (baseURL) {
    axiosConfig.baseURL = baseURL;
  }

  if (proxyConfig) {
    console.log(`🔒 Using proxy: ${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`);
    
    // Build proxy URL
    let proxyUrl = `${proxyConfig.protocol}://`;
    if (proxyConfig.username && proxyConfig.password) {
      proxyUrl += `${proxyConfig.username}:${proxyConfig.password}@`;
    }
    proxyUrl += `${proxyConfig.host}:${proxyConfig.port}`;

    // Create proxy agents
    if (proxyConfig.protocol === "https") {
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
      axiosConfig.httpAgent = new HttpProxyAgent(proxyUrl);
    } else {
      axiosConfig.httpAgent = new HttpProxyAgent(proxyUrl);
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    // Also set proxy option for axios (fallback)
    axiosConfig.proxy = false; // Disable axios built-in proxy, use agent instead
  } else {
    console.log("ℹ️  No proxy configured. Using direct connection.");
  }

  return axios.create(axiosConfig);
}

/**
 * Get proxy agent for use with other HTTP clients
 */
export function getProxyAgent(): HttpsProxyAgent<string> | HttpProxyAgent<string> | null {
  const proxyConfig = getProxyConfig();
  
  if (!proxyConfig) {
    return null;
  }

  let proxyUrl = `${proxyConfig.protocol}://`;
  if (proxyConfig.username && proxyConfig.password) {
    proxyUrl += `${proxyConfig.username}:${proxyConfig.password}@`;
  }
  proxyUrl += `${proxyConfig.host}:${proxyConfig.port}`;

  if (proxyConfig.protocol === "https") {
    return new HttpsProxyAgent(proxyUrl);
  } else {
    return new HttpProxyAgent(proxyUrl);
  }
}

