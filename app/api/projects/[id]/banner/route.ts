import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { uploadToSupabaseStorage } from '@/lib/supabase/storage'
import { NextRequest } from 'next/server'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return Errors.NOT_FOUND('Project')
    }

    const isProjectLead = project.leadId === user.id
    const isAdmin = user.role === 'ADMIN'
    const isClient = user.role === 'CLIENT'

    if (!isAdmin && !isProjectLead && !isClient) {
      return Errors.UNAUTHORIZED()
    }

    const { base64Data, filename } = await request.json()
    if (!base64Data) {
      return Errors.VALIDATION('base64Data is required')
    }

    const matches = base64Data.match(/^data:(.+);base64,(.+)$/)
    const contentType = matches ? matches[1] : 'image/png'
    const rawData = matches ? matches[2] : base64Data
    const buffer = Buffer.from(rawData, 'base64')

    const ext = path.extname(filename || 'banner.png') || '.png'
    const storagePath = `banners/${id}${ext}`

    const bannerUrl = await uploadToSupabaseStorage({
      filePath: storagePath,
      fileBuffer: buffer,
      contentType,
      bucketName: 'banners',
    })

    const updated = await prisma.project.update({
      where: { id },
      data: { banner: bannerUrl },
    })

    return apiSuccess({ bannerUrl, project: updated })
  } catch (error) {
    console.error('Upload project banner error:', error)
    return Errors.INTERNAL('Failed to upload project banner')
  }
}
