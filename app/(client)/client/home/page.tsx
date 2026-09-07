import Link from 'next/link'
import Image from 'next/image'

import ProjectStack from '@/app/components/client/ProjectStack'
import BlogCarousel from '@/app/components/client/BlogCarousel'
import SpotlightSearch from '@/app/components/client/SpotlightSearch'
import QuickActions from '@/app/components/client/QuickActions'

import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import { clientProjectWhere, getClientActor, hasClientPolicy } from '@/lib/auth/access'
import { currentPhaseName, progressFromMilestones } from '@/lib/process/stages'

export const metadata = {
  title: 'Home — Tvita Client Portal',
}

const PROJECT_LIMIT = 4

/**
 * Quick actions above the project stack. These all point at Projects for now —
 * meetings, notes, tickets and quotes live inside a project, not on their own
 * client routes.
 */
/** Static posts — there's no blog model yet, so swap these for real data later. */
const BLOG_POSTS = [
  {
    id: 'discovery',
    title: 'Discovery & research',
    excerpt: 'How we scope a project before anything gets built',
    // The '&' in the filename must stay percent-encoded in a URL.
    image: '/images/discovery%26research.webp',
    href: '/client/projects',
  },
  {
    id: 'design',
    title: 'Design decisions',
    excerpt: 'Choices that shape how the product actually feels',
    image: '/images/bg-img.webp',
    href: '/client/projects',
  },
  {
    id: 'launch',
    title: 'Build & launch',
    excerpt: 'What shipping looks like from your side of the desk',
    image: '/images/launch.webp',
    href: '/client/projects',
  },
  {
    id: 'quote',
    title: 'Scope & quotes',
    excerpt: 'How work gets priced before a line of code is written',
    image: '/images/quote.webp',
    href: '/client/projects',
  },
]

const SERVICES = [
  {
    key: 'apps',
    title: 'We build apps people actually want',
    cta: 'View',
    image: '/service/man.png',
    href: '/client/projects',
  },
  {
    key: 'web',
    title: 'Websites that load fast and look sharp',
    cta: 'Explore',
    image: '/service/web.png',
    href: '/client/projects',
  },
  {
    key: 'script',
    title: 'Scripts that hold attention to the last line',
    cta: 'Read',
    image: '/service/script.png',
    href: '/client/projects',
  },
  {
    key: 'cloud',
    title: 'Cloud setups that scale without drama',
    cta: 'Learn',
    image: '/service/cloud.png',
    href: '/client/projects',
  },
]

const QUICK_ACTIONS = [
  { label: 'Meet', icon: '/calendar.png', href: '/client/projects' },
  { label: 'Notes', icon: '/notes.png', href: '/client/notes' },
  { label: 'Ticket', icon: '/ticket.png', href: '/client/tickets' },
  { label: 'Quote', icon: '/quote.png', href: '/client/projects' },
]

/** Static showcase card. Swap the image for your own file in /public. */
const SHOWCASE = {
  image: '/menu%20img.webp',
  /** Rendered one line per entry. */
  titleLines: ["Let's start your", 'next project together'],
  href: '/client/projects',
}

const SHOWCASE_TITLE = SHOWCASE.titleLines.join(' ')

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function ShowcaseArrow({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

export default async function ClientHomePage() {
  const user = await getServerUser()
  if (!user) return null

  cleanupExpiredInvitations().catch((err) => console.error('[Cleanup Error]', err))

  const actor = await getClientActor(user)
  if (!actor) {
    return (
      <div className="card text-center py-12">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
          No Client Account Found
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          Please contact support or your account administrator to link your account profile.
        </p>
      </div>
    )
  }

  const { client, subTeam } = actor
  const projectFilter = clientProjectWhere(client.id, subTeam)

  const searchableProjects = await prisma.project.findMany({
    where: projectFilter,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      milestones: {
        where: { clientVisible: true, status: { in: ['IN_PROGRESS', 'PLANNED'] } },
        orderBy: { dueDate: 'asc' },
        take: 1,
        select: { name: true },
      },
    },
  })

  const projects = await prisma.project.findMany({
    // Completed work belongs on the Projects page, not this panel.
    where: { ...projectFilter, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    orderBy: { updatedAt: 'desc' },
    take: PROJECT_LIMIT,
    select: {
      id: true,
      name: true,
      banner: true,
      status: true,
      progress: true,
      milestones: {
        select: { status: true, stage: true, name: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  return (
    <section className="chome-hero">
      <div className="chome-hero__inner">
        {/* Spans both columns so the card and the side column start level. */}
        <div className="chome-hero__head">
          <h1 className="chome-hero__greeting">
            {getGreeting()}, {client.name}!
          </h1>
          <p className="chome-hero__lede">Here&apos;s where your projects stand today</p>
        </div>

        <div className="chome-hero__main">
          {/* The wrapper carries the blurred copy of the artwork that glows
              beneath the card; the card itself clips its own contents. */}
          <div
            className="cshowcase-wrap"
            style={{ '--showcase-image': `url(${SHOWCASE.image})` } as React.CSSProperties}
          >
          <article
            className="cshowcase"
            style={{ backgroundImage: `url(${SHOWCASE.image})` }}
            role="img"
            aria-label={`${SHOWCASE_TITLE} preview`}
          >
            <div className="cshowcase__body">
              <div className="cshowcase__copy">
                <h3 className="cshowcase__title">
                  {SHOWCASE.titleLines.map((line) => (
                    <span key={line} className="cshowcase__title-line">
                      {line}
                    </span>
                  ))}
                </h3>
              </div>

              <Link
                href={SHOWCASE.href}
                className="cshowcase__cta"
                aria-label={`Open ${SHOWCASE_TITLE}`}
              >
                <ShowcaseArrow />
              </Link>
            </div>
          </article>
          </div>

        </div>

        <div className="chome-hero__side">
          <SpotlightSearch
            projects={searchableProjects.map((project) => ({
              id: project.id,
              name: project.name,
              status: project.status,
              phase: project.milestones[0]?.name,
            }))}
          />

          <QuickActions
            actions={QUICK_ACTIONS.filter((action) => {
              if (action.label === 'Quote') return !subTeam
              if (action.label === 'Notes') return hasClientPolicy(subTeam, 'notes')
              if (action.label === 'Ticket') return hasClientPolicy(subTeam, 'issues')
              return true
            })}
            projects={searchableProjects.map((project) => ({
              id: project.id,
              name: project.name,
            }))}
          />

          <ProjectStack
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
              banner: project.banner,
              status: project.status,
              progress: progressFromMilestones(project.milestones),
              phase: currentPhaseName(project.milestones, project.status),
            }))}
            fallbackImage={SHOWCASE.image}
          />
        </div>
      </div>

      <section className="services" aria-labelledby="services-heading">
        <div className="services__inner">
          <h2 className="services__heading" id="services-heading">
            Services
          </h2>

          <div className="services__row">
            {SERVICES.map((service) => (
              <article key={service.key} className={`svc svc--${service.key}`}>
                <div className="svc__copy">
                  <h3 className="svc__title">{service.title}</h3>
                  <Link href={service.href} className="svc__cta">
                    {service.cta}
                  </Link>
                </div>

                <div className="svc__art">
                  <Image
                    src={service.image}
                    alt=""
                    width={420}
                    height={420}
                    className="svc__img"
                  />
                </div>
              </article>
            ))}
          </div>

          <BlogCarousel posts={BLOG_POSTS} />
        </div>
      </section>
    </section>
  )
}
