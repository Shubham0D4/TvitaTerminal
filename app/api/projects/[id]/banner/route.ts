import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import fs from 'fs/promises'
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

    if (!isAdmin && !isProjectLead) {
      return Errors.UNAUTHORIZED()
    }

    const { base64Data, filename } = await request.json()
    if (!base64Data) {
      return Errors.VALIDATION('base64Data is required')
    }

    const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64')

    const dir = path.join(process.cwd(), 'public', 'banners')
    await fs.mkdir(dir, { recursive: true })

    const ext = path.extname(filename || 'banner.png') || '.png'
    const bannerPath = `/banners/${id}${ext}`
    const fullPath = path.join(process.cwd(), 'public', bannerPath)

    await fs.writeFile(fullPath, buffer)

    const updated = await prisma.project.update({
      where: { id },
      data: { banner: bannerPath },
    })

    return apiSuccess({ bannerUrl: bannerPath, project: updated })
  } catch (error) {
    console.error('Upload project banner error:', error)
    return Errors.INTERNAL('Failed to upload project banner')
  }
}
