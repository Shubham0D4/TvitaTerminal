import { z } from 'zod'

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ─────────────────────────────────────────────
// CLIENT
// ─────────────────────────────────────────────

export const CreateClientSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  // Optional: create user account for the client
  createUserAccount: z.boolean().optional(),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
})

export const UpdateClientSchema = CreateClientSchema.partial()

// ─────────────────────────────────────────────
// PROJECT
// ─────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().optional(),
  status: z
    .enum(['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional(),
  progress: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leadId: z.string().uuid().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
})

export const UpdateProjectSchema = CreateProjectSchema.partial()

// ─────────────────────────────────────────────
// MILESTONE
// ─────────────────────────────────────────────

export const CreateMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
  progress: z.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  clientVisible: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export const UpdateMilestoneSchema = CreateMilestoneSchema.partial()

// ─────────────────────────────────────────────
// TASK
// ─────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
  title: z.string().min(1, 'Task title is required').max(500),
  description: z.string().optional(),
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  clientVisible: z.boolean().optional(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial()

export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
})

// ─────────────────────────────────────────────
// PLAN
// ─────────────────────────────────────────────

export const CreatePlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().default('INR'),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']),
  isActive: z.boolean().optional(),
  features: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        value: z.string().optional(),
      })
    )
    .optional(),
})

export const UpdatePlanSchema = CreatePlanSchema.partial()

// ─────────────────────────────────────────────
// SUBSCRIPTION
// ─────────────────────────────────────────────

export const CreateSubscriptionSchema = z.object({
  clientId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z
    .enum(['ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PENDING'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  renewalDate: z.string().optional(),
  notes: z.string().optional(),
})

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial()

// ─────────────────────────────────────────────
// INVOICE
// ─────────────────────────────────────────────

export const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1),
  rate: z.number().min(0),
  amount: z.number().min(0),
})

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
  taxRate: z.number().min(0).max(100).optional(),
  isIgst: z.boolean().optional(), // true = IGST, false = CGST+SGST
  currency: z.string().default('INR'),
  issuedDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial()

// ─────────────────────────────────────────────
// TEAM MEMBER
// ─────────────────────────────────────────────

export const CreateTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'TEAM_MEMBER']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const UpdateTeamMemberSchema = CreateTeamMemberSchema.omit({ password: true }).partial()

// ─────────────────────────────────────────────
// APP SETTINGS
// ─────────────────────────────────────────────

export const AppSettingsSchema = z.object({
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyEmail: z.string().email().optional().or(z.literal('')),
  companyPhone: z.string().optional(),
  companyGstin: z.string().optional(),
  companyPan: z.string().optional(),
  companyState: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankBranch: z.string().optional(),
  invoicePrefix: z.string().optional(),
  invoiceFooter: z.string().optional(),
  currency: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
})

// ─────────────────────────────────────────────
// AUTH FIELD HELPERS
// Field-level wrappers over the schemas above, so the auth screens can show
// inline errors without each page restating the rules.
// Each returns an error message, or null when the value is acceptable.
// ─────────────────────────────────────────────

/** Format check only — never reveals whether an account exists. */
export function validateEmailField(value: string): string | null {
  if (!value.trim()) return 'Email address is required'
  const result = ForgotPasswordSchema.shape.email.safeParse(value.trim())
  return result.success ? null : (result.error.issues[0]?.message ?? 'Invalid email address')
}

/**
 * Sign-in only checks for presence. Enforcing a length rule here would both
 * lock out accounts created under an older policy and advertise the policy
 * to anyone probing the form.
 */
export function validateCurrentPasswordField(value: string): string | null {
  return value.length > 0 ? null : 'Password is required'
}

/** Applies the real policy — used when a password is being created or reset. */
export function validateNewPasswordField(value: string): string | null {
  if (!value) return 'Password is required'
  const result = ResetPasswordSchema.shape.password.safeParse(value)
  return result.success ? null : (result.error.issues[0]?.message ?? 'Password is too short')
}

export function validatePasswordConfirmField(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password'
  return password === confirm ? null : 'Passwords do not match'
}
