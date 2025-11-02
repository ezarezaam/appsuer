// Frontend uses server API endpoints; no direct Supabase client here

// Get JWT token from localStorage for authentication
const getAuthToken = () => {
  return localStorage.getItem('admin_token');
};

export interface TopupRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_proof_url?: string;
  payment_details?: any;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string;
    email?: string;
  };
}

export interface WalletStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  pendingAmount: number;
}

// Get all topup requests from API
export const getAllTopupRequests = async (status?: string): Promise<{ success: boolean; requests?: TopupRequest[]; error?: any }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = `/api/admin?action=topup-requests${status ? `&status=${status}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch requests');
    }

    return { success: true, requests: result.requests || [] };
    
  } catch (error: any) {
    console.error('Error in getAllTopupRequests:', error);
    return { success: false, error: error.message };
  }
};

// Approve topup request
export const approveTopupRequest = async (
  requestId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/admin?action=update-status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: requestId,
        status: 'approved',
        admin_notes: adminNotes
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to approve request');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error approving topup request:', error);
    return { success: false, error: error.message };
  }
};

// Reject topup request
export const rejectTopupRequest = async (
  requestId: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/admin?action=update-status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: requestId,
        status: 'rejected',
        admin_notes: rejectionReason
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to reject request');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting topup request:', error);
    return { success: false, error: error.message };
  }
};

// Get wallet stats
export const getWalletStats = async (): Promise<{ success: boolean; stats?: WalletStats; error?: any }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/admin?action=stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch stats');
    }

    return { success: true, stats: result.stats };
  } catch (error: any) {
    console.error('Error in getWalletStats:', error);
    return { success: false, error: error.message };
  }
};

// Test connection to database
export const testConnection = async (): Promise<{ success: boolean; error?: any }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/admin?action=test-connection', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Connection test failed');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in testConnection:', error);
    return { success: false, error: error.message };
  }
};