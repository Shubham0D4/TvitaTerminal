import { GET as handleGet, POST as handlePost } from '../team/route'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return handleGet(request)
}

export async function POST(request: NextRequest) {
  return handlePost(request)
}
