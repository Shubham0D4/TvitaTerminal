'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type BlogPost = {
  id: string
  title: string
  excerpt: string
  image: string
  href: string
}

interface BlogCarouselProps {
  posts: BlogPost[]
}

/** How far one arrow press scrolls, in card widths. */
const SCROLL_STEP = 1

export default function BlogCarousel({ posts }: BlogCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    // Measure a real card so the step matches whatever the layout resolved to.
    const card = track.querySelector<HTMLElement>('.blogc__card')
    const step = card ? card.offsetWidth + 20 : track.clientWidth
    track.scrollBy({ left: direction * step * SCROLL_STEP, behavior: 'smooth' })
  }

  if (posts.length === 0) return null

  return (
    <div className="blogc">
      <div className="blogc__head">
        <h2 className="blogc__heading">Blog</h2>

        <div className="blogc__nav">
          <button
            type="button"
            className="blogc__arrow"
            onClick={() => scroll(-1)}
            aria-label="Previous posts"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="blogc__arrow"
            onClick={() => scroll(1)}
            aria-label="Next posts"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="blogc__track" ref={trackRef}>
        {posts.map((post) => (
          <article key={post.id} className="blogc__card">
            <Link href={post.href} className="blogc__link">
              <span className="blogc__media">
                <Image
                  src={post.image}
                  alt=""
                  width={880}
                  height={560}
                  className="blogc__img"
                />
              </span>

              <span className="blogc__body">
                <span className="blogc__title">{post.title}</span>
                <span className="blogc__excerpt">{post.excerpt}</span>
              </span>
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
