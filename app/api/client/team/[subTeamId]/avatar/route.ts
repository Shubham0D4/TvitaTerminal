import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { uploadToSupabaseStorage } from '@/infrastructure/supabase/storage'
import { NextRequest } from 'next/server'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { subTeamId } = await params

  try {
    const subTeam = await prisma.clientSubTeam.findUnique({
      where: { id: subTeamId },
      include: { client: true },
    })

    if (!subTeam) {
      return Errors.NOT_FOUND('Sub-Team')
    }

    const { base64Data, filename } = await request.json()
    if (!base64Data) {
      return Errors.VALIDATION('base64Data is required')
    }

    const matches = base64Data.match(/^data:(.+);base64,(.+)$/)
    const contentType = matches ? matches[1] : 'image/png'
    const rawData = matches ? matches[2] : base64Data
    const buffer = Buffer.from(rawData, 'base64')

    const ext = path.extname(filename || 'avatar.png') || '.png'
    const storagePath = `avatars/team-${subTeamId}${ext}`

    const avatarUrl = await uploadToSupabaseStorage({
      filePath: storagePath,
      fileBuffer: buffer,
      contentType,
      bucketName: 'avatars',
    })

    const existingPolicy = typeof subTeam.accessPolicy === 'object' && subTeam.accessPolicy !== null
      ? (subTeam.accessPolicy as Record<string, any>)
      : {}

    const updatedPolicy = {
      ...existingPolicy,
      avatarUrl,
    }

    const updatedSubTeam = await prisma.clientSubTeam.update({
      where: { id: subTeamId },
      data: { accessPolicy: updatedPolicy },
    })

    if (subTeam.profileId) {
      await prisma.profile.update({
        where: { id: subTeam.profileId },
        data: { avatarUrl },
      }).catch(() => {})
    }

    return apiSuccess({ avatarUrl, subTeam: updatedSubTeam })
  } catch (error) {
    console.error('Upload subteam avatar error:', error)
    return Errors.INTERNAL('Failed to upload team picture')
  }
}
