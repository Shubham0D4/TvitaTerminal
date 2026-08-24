import Stripe from 'stripe'
import { env } from '@/lib/config/env'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_build', {
  apiVersion: '2026-01-28' as any,
  appInfo: {
    name: 'Tvita Agency Management Platform',
    version: '1.0.0',
  },
})

