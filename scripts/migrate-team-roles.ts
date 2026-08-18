import { prisma } from '../lib/prisma'

async function main() {
  console.log('Migrating database TeamRole values to TEAM_LEAD and MEMBER...')

  try {
    await prisma.$executeRawUnsafe(`
      UPDATE profiles SET team_role = 'TEAM_LEAD' WHERE team_role::text = 'TEAM_LEAD';
    `)
    await prisma.$executeRawUnsafe(`
      UPDATE project_members SET role = 'TEAM_LEAD' WHERE role::text = 'TEAM_LEAD';
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "TeamRole" RENAME VALUE 'DEVELOPER' TO 'MEMBER';
    `)
    console.log('Renamed DEVELOPER enum value to MEMBER.')
  } catch (e: any) {
    console.log('Enum rename note:', e.message)
  }

  try {
    await prisma.$executeRawUnsafe(`
      UPDATE profiles SET team_role = 'MEMBER' WHERE team_role::text IN ('DEVELOPER', 'TESTER');
      UPDATE project_members SET role = 'MEMBER' WHERE role::text IN ('DEVELOPER', 'TESTER');
    `)
    console.log('Updated profile & project_members records to MEMBER.')
  } catch (e: any) {
    console.log('Update note:', e.message)
  }
}

main()
  .then(() => console.log('Migration step done.'))
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
