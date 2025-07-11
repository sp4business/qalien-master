// Clerk configuration and utilities
import { env } from './config'

// Clerk configuration
export const clerkConfig = {
  publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  appearance: {
    baseTheme: undefined,
    variables: {
      colorPrimary: '#37B34A', // QAlien green
      colorText: '#1f2937',
      colorTextSecondary: '#6b7280',
      colorBackground: '#ffffff',
      colorInputBackground: '#f9fafb',
      colorInputText: '#1f2937',
      borderRadius: '0.375rem',
    },
    elements: {
      card: 'shadow-lg',
      headerTitle: 'text-2xl font-bold',
      footerAction: 'text-sm'
    }
  },
  // Organization features
  organizationList: {
    afterCreateOrganizationUrl: '/',
    afterSelectOrganizationUrl: '/'
  },
  organizationProfile: {
    afterLeaveOrganizationUrl: '/'
  },
  // User profile
  userProfile: {
    afterSignOutUrl: '/login'
  }
}

// Helper function to check organization permissions
export function checkOrgPermission(
  orgRole: string | undefined,
  requiredRole: 'admin' | 'member' = 'member'
): boolean {
  if (!orgRole) return false
  
  if (requiredRole === 'admin') {
    return orgRole === 'admin'
  }
  
  return ['admin', 'member'].includes(orgRole)
}

// Helper function to check brand permissions
export function checkBrandPermission(
  brandRole: string | undefined,
  requiredRole: 'admin' | 'editor' | 'viewer' = 'viewer'
): boolean {
  if (!brandRole) return false
  
  const roleHierarchy = {
    admin: 3,
    editor: 2,
    viewer: 1
  }
  
  const userLevel = roleHierarchy[brandRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole] || 0
  
  return userLevel >= requiredLevel
}

export default clerkConfig