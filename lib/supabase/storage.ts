import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/config/env'
import fs from 'fs/promises'
import path from 'path'

const DEFAULT_BUCKET = env.SUPABASE_STORAGE_BUCKET || 'tvita-documents'

/**
 * Ensures the target bucket exists in Supabase Storage.
 */
async function ensureBucketExists(bucketName: string = DEFAULT_BUCKET) {
  try {
    const supabase = createSupabaseAdminClient()
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some((b) => b.name === bucketName)
    if (!exists) {
      await supabase.storage.createBucket(bucketName, { public: true })
    }
  } catch (err) {
    console.warn(`[Supabase Storage] Could not verify/create bucket ${bucketName}:`, err)
  }
}

/**
 * Uploads a file buffer to Supabase Storage and returns its public URL.
 * If Supabase upload fails or is unconfigured, falls back to writing to local /public directory.
 */
export async function uploadToSupabaseStorage({
  filePath,
  fileBuffer,
  contentType,
  bucketName = DEFAULT_BUCKET,
}: {
  filePath: string // e.g. "avatars/user-123.jpg" or "invoices/inv-456.pdf"
  fileBuffer: Buffer
  contentType?: string
  bucketName?: string
}): Promise<string> {
  const supabaseUrl = env.SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  const isSupabaseConfigured =
    supabaseUrl &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('example.com') &&
    serviceKey &&
    !serviceKey.includes('placeholder')

  if (isSupabaseConfigured) {
    try {
      const supabase = createSupabaseAdminClient()
      await ensureBucketExists(bucketName)

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: contentType || 'application/octet-stream',
          upsert: true,
        })

      if (!error) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        if (publicUrlData?.publicUrl) {
          console.log(`[Supabase Storage] ✓ Uploaded file: ${filePath} -> ${publicUrlData.publicUrl}`)
          return publicUrlData.publicUrl
        }
      } else {
        console.warn(`[Supabase Storage] Storage API error, falling back to disk:`, error.message)
      }
    } catch (supabaseErr) {
      console.warn(`[Supabase Storage] Storage upload failed, falling back to disk:`, supabaseErr)
    }
  }

  // Fallback: local public filesystem storage
  try {
    const localDir = path.join(process.cwd(), 'public', path.dirname(filePath))
    await fs.mkdir(localDir, { recursive: true })
    const fullLocalPath = path.join(process.cwd(), 'public', filePath)
    await fs.writeFile(fullLocalPath, fileBuffer)
    console.log(`[Supabase Storage] Fallback: Wrote file to disk: /${filePath}`)
    return `/${filePath}`
  } catch (localErr) {
    console.error(`[Supabase Storage] Local disk fallback failed for ${filePath}:`, localErr)
    return `/${filePath}`
  }
}

/**
 * Deletes a file from Supabase Storage (and local fallback disk).
 */
export async function deleteFromSupabaseStorage(
  filePath: string,
  bucketName: string = DEFAULT_BUCKET
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient()
    await supabase.storage.from(bucketName).remove([filePath])
  } catch {
    // ignore
  }

  try {
    const localPath = path.join(process.cwd(), 'public', filePath)
    await fs.unlink(localPath)
  } catch {
    // ignore
  }

  return true
}
