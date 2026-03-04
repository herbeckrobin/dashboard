// Next.js ScrollReveal Komponente

export default {
  tsx: `'use client'
import { useEffect, useRef, useState } from 'react'
import './styles.scss'

export default function ScrollReveal({ children, className = '', delay = 0, direction = 'up' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const dirClass = direction === 'left' ? 'scroll-reveal--left'
    : direction === 'right' ? 'scroll-reveal--right'
    : direction === 'scale' ? 'scroll-reveal--scale'
    : 'scroll-reveal--up'

  return (
    <div
      ref={ref}
      className={\`scroll-reveal \${dirClass} \${visible ? 'scroll-reveal--visible' : ''} \${className}\`}
      style={{ transitionDelay: \`\${delay}ms\` }}
    >
      {children}
    </div>
  )
}
`,
  scss: `@use '../../styles/variables' as *;

.scroll-reveal {
  transition: opacity $transition-reveal, transform $transition-reveal;
  will-change: opacity, transform;

  &--up {
    opacity: 0;
    transform: translateY(2rem);
  }
  &--left {
    opacity: 0;
    transform: translateX(-2rem);
  }
  &--right {
    opacity: 0;
    transform: translateX(2rem);
  }
  &--scale {
    opacity: 0;
    transform: scale(0.92);
  }
  &--visible {
    opacity: 1 !important;
    transform: translate(0) scale(1) !important;
  }
}
`,
}
