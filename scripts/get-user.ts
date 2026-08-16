import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
        console.error('Error listing users:', error)
        return
    }
    console.log('--- SUPABASE AUTH USERS ---')
    data.users.forEach(u => {
        console.log(`Email: ${u.email} | ID: ${u.id} | Metadata:`, u.user_metadata)
    })
}

main()

