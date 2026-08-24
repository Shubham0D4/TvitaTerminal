import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { uploadToSupabaseStorage } from '@/lib/supabase/storage'
import { NextRequest } from 'next/server'
import path from 'path'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const { base64Data, filename } = await request.json()
    if (!base64Data) {
      return Errors.VALIDATION('base64Data is required')
    }

    const matches = base64Data.match(/^data:(.+);base64,(.+)$/)
    const contentType = matches ? matches[1] : 'image/png'
    const rawData = matches ? matches[2] : base64Data
    const buffer = Buffer.from(rawData, 'base64')

    const ext = path.extname(filename || 'avatar.png') || '.png'
    const storagePath = `avatars/user-${user.id}${ext}`

    const avatarUrl = await uploadToSupabaseStorage({
      filePath: storagePath,
      fileBuffer: buffer,
      contentType,
      bucketName: 'avatars',
    })

    const updated = await prisma.profile.update({
      where: { id: user.id },
      data: { avatarUrl },
    })

    return apiSuccess({ avatarUrl, profile: updated })
  } catch (error) {
    console.error('Upload avatar error:', error)
    return Errors.INTERNAL('Failed to upload profile picture')
  }
}
