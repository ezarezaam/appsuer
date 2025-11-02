import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Regular client for user operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for admin users
export interface AdminUser {
  id: string
  name: string
  email: string
  password: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_login?: string
}

// Types for wallet approval
export interface WalletRequest {
  id: string
  user_id: string
  wallet_address: string
  wallet_type: 'paypal' | 'bank' | 'crypto'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  user_email?: string
  user_name?: string
  notes?: string
}

// Admin authentication functions
export const adminAuth = {
  // Login admin user
  async login(email: string, password: string): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Compare password with hashed password
      const isPasswordValid = await bcrypt.compare(password, data.password)
      
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Update last login using simple UPDATE query
      try {
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('email', email)
      } catch (updateError) {
        // Don't fail login if this fails
        console.warn('Failed to update last login:', updateError);
      }

      return { success: true, admin: data }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Login failed' }
    }
  },

  // Get admin by email
  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return data
    } catch (err) {
      return null
    }
  },

  // Get all admin users
  async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error || !data) {
        return []
      }

      return data
    } catch (err) {
      return []
    }
  }
}