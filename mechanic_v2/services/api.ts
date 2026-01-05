import AsyncStorage from '@react-native-async-storage/async-storage';

const API_IP_CACHE_KEY = '@api_server_ip';
const API_PORT = 3000;

/**
 * Generate common IP addresses to try for server discovery
 * Tries common network ranges and specific IPs
 */
function generateCommonIPs(): string[] {
  const ips: string[] = [];
  
  // Android emulator
  ips.push('10.0.2.2');
  
  // iOS simulator / local dev
  ips.push('localhost');
  ips.push('127.0.0.1');
  
  // Common home network ranges (192.168.x.100-150)
  for (let subnet = 0; subnet <= 1; subnet++) {
    for (let host = 100; host <= 150; host += 10) {
      ips.push(`192.168.${subnet}.${host}`);
    }
  }
  
  // Common corporate/enterprise ranges (172.16.x.x)
  for (let subnet2 = 0; subnet2 <= 3; subnet2++) {
    for (let host = 100; host <= 200; host += 20) {
      ips.push(`172.16.${subnet2}.${host}`);
    }
  }
  
  // Remove duplicates and return
  return [...new Set(ips)];
}

/**
 * Try to discover the server IP by attempting connections
 */
async function discoverServerIP(): Promise<string | null> {
  // First, try cached IP
  try {
    const cachedIP = await AsyncStorage.getItem(API_IP_CACHE_KEY);
    if (cachedIP) {
      const testUrl = `http://${cachedIP}:${API_PORT}/api/health/ip`;
      try {
        const response = await fetch(testUrl, { 
          method: 'GET',
          timeout: 2000, // 2 second timeout
        } as any);
        if (response.ok) {
          console.log(`✅ Using cached IP: ${cachedIP}`);
          return cachedIP;
        }
      } catch (e) {
        // Cached IP failed, continue discovery
        console.log(`⚠️ Cached IP ${cachedIP} failed, discovering new IP...`);
      }
    }
  } catch (e) {
    // Ignore cache errors
  }

  // Try common IPs
  console.log('🔍 Discovering server IP...');
  const commonIPs = generateCommonIPs();
  for (const ip of commonIPs) {
    try {
      const testUrl = `http://${ip}:${API_PORT}/api/health/ip`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      } as any);
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.ip) {
          // Cache the working IP
          await AsyncStorage.setItem(API_IP_CACHE_KEY, data.ip);
          console.log(`✅ Discovered server IP: ${data.ip}`);
          return data.ip;
        }
      }
    } catch (error) {
      // Try next IP
      continue;
    }
  }

  // Fallback: try to get IP from health endpoint on common IPs
  for (const ip of commonIPs) {
    try {
      const testUrl = `http://${ip}:${API_PORT}/api/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      } as any);
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Server found, use this IP
        await AsyncStorage.setItem(API_IP_CACHE_KEY, ip);
        console.log(`✅ Server found at IP: ${ip}`);
        return ip;
      }
    } catch (error) {
      // Try next IP
      continue;
    }
  }

  console.log('⚠️ Could not discover server IP, using fallback');
  return null;
}

/**
 * Get API base URL dynamically
 */
async function getApiBaseUrl(): Promise<string> {
  if (__DEV__) {
    const discoveredIP = await discoverServerIP();
    if (discoveredIP) {
      return `http://${discoveredIP}:${API_PORT}/api`;
    }
    
    // Fallback to localhost for simulator/emulator
    return 'http://localhost:3000/api';
  }
  
  // Production URL
  return 'https://your-production-api.com/api';
}

// Initialize base URL (will be set dynamically on first API call)
let API_BASE_URL: string | null = null;

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: number;
      username: string;
    };
  };
  errors?: Array<{ msg: string; param: string }>;
}

export interface LoginRequest {
  username: string;
  password: string;
}

class ApiService {
  private baseUrl: string | null = null;
  private baseUrlPromise: Promise<string> | null = null;

  constructor() {
    // Initialize base URL asynchronously
    this.initializeBaseUrl();
  }

  /**
   * Initialize the base URL (discover server IP)
   */
  private async initializeBaseUrl(): Promise<void> {
    if (!this.baseUrlPromise) {
      this.baseUrlPromise = getApiBaseUrl();
      this.baseUrl = await this.baseUrlPromise;
      console.log(`🌐 API Base URL: ${this.baseUrl}`);
    }
  }

  /**
   * Get the base URL, ensuring it's initialized
   */
  private async getBaseUrl(): Promise<string> {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    return this.baseUrl || 'http://localhost:3000/api';
  }

  /**
   * Refresh the server IP discovery (useful when network changes)
   */
  async refreshServerIP(): Promise<void> {
    // Clear cache
    try {
      await AsyncStorage.removeItem(API_IP_CACHE_KEY);
    } catch (e) {
      // Ignore errors
    }
    
    // Reset and reinitialize
    this.baseUrl = null;
    this.baseUrlPromise = null;
    await this.initializeBaseUrl();
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Login failed',
          errors: data.errors,
        };
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
      };
    }
  }

  async verifyToken(token: string): Promise<LoginResponse> {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        message: 'Token verification failed',
      };
    }
  }

  async searchContract(contractNo: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/contracts/search?contractNo=${encodeURIComponent(contractNo)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Contract search failed',
        };
      }

      return data;
    } catch (error: any) {
      console.error('Contract search error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  async submitMaintenanceService(
    maintId: number,
    serviceData: {
      engineOil?: { enabled: boolean; amount: string };
      chainSprocket?: { enabled: boolean; amount: string };
      chainTightening?: { enabled: boolean; amount: string };
      serviceFee?: { enabled: boolean; amount: string };
      mileage: string;
      totalAmount: string;
      imageUri: string | null;
    }
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const formData = new FormData();

      // Append service data as JSON strings
      if (serviceData.engineOil) {
        formData.append('engineOil', JSON.stringify(serviceData.engineOil));
      }
      if (serviceData.chainSprocket) {
        formData.append('chainSprocket', JSON.stringify(serviceData.chainSprocket));
      }
      if (serviceData.chainTightening) {
        formData.append('chainTightening', JSON.stringify(serviceData.chainTightening));
      }
      if (serviceData.serviceFee) {
        formData.append('serviceFee', JSON.stringify(serviceData.serviceFee));
      }

      formData.append('mileage', serviceData.mileage);
      formData.append('totalAmount', serviceData.totalAmount);

      // Append image file if available
      if (serviceData.imageUri) {
        const filename = serviceData.imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('image', {
          uri: serviceData.imageUri,
          name: filename,
          type: type,
        } as any);
      }

      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/contracts/${maintId}/submit-service`, {
        method: 'POST',
        headers: {
          // Don't set Content-Type header - let FormData set it with boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Failed to submit maintenance service',
        };
      }

      return data;
    } catch (error: any) {
      console.error('Submit maintenance service error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Get authentication token from AsyncStorage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('@auth_token');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current week summary
   */
  async getWeeklySummary(): Promise<{
    success: boolean;
    message?: string;
    data?: {
      weekStart: string;
      weekEnd: string;
      totalAmount: number;
      serviceCount: number;
      paymentStatus: 'pending' | 'paid';
      daysUntilPayment: number;
    };
  }> {
    try {
      const baseUrl = await this.getBaseUrl();
      const token = await this.getAuthToken();
      
      const response = await fetch(`${baseUrl}/history/weekly-summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Failed to fetch weekly summary',
        };
      }

      return data;
    } catch (error: any) {
      console.error('Get weekly summary error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Get all payment periods
   */
  async getPaymentPeriods(): Promise<{
    success: boolean;
    message?: string;
    data?: Array<{
      paymentId: number;
      weekStartDate: string;
      weekEndDate: string;
      monthName: string;
      dateRange: string;
      totalAmount: number;
      serviceCount: number;
      paymentStatus: 'pending' | 'paid';
      paidDate: string | null;
      isCurrent: boolean;
    }>;
  }> {
    try {
      const baseUrl = await this.getBaseUrl();
      const token = await this.getAuthToken();
      
      const response = await fetch(`${baseUrl}/history/payment-periods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Failed to fetch payment periods',
        };
      }

      return data;
    } catch (error: any) {
      console.error('Get payment periods error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Get services for a specific payment period
   */
  async getPeriodServices(weekStartDate: string): Promise<{
    success: boolean;
    message?: string;
    data?: Array<{
      maintId: number;
      serviceId: string;
      date: string;
      dateFormatted: string;
      serviceTypes: string;
      amount: number;
      contractNo: string;
      customerName: string;
      mechanicName: string;
      imagePath: string | null;
    }>;
  }> {
    try {
      const baseUrl = await this.getBaseUrl();
      const token = await this.getAuthToken();
      
      const response = await fetch(`${baseUrl}/history/period/${weekStartDate}/services`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Failed to fetch period services',
        };
      }

      return data;
    } catch (error: any) {
      console.error('Get period services error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }
}

export const apiService = new ApiService();

