// Progress-Bar am oberen Rand bei Seitenwechseln (Router Events)

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function TopLoadingBar() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let timer
    const start = () => {
      setLoading(true)
      setProgress(0)
      // Schnell auf 30%, dann langsamer — erzeugt Illusion von Fortschritt
      setTimeout(() => setProgress(30), 50)
      timer = setTimeout(() => setProgress(60), 300)
    }
    const done = () => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }

    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', done)
    router.events.on('routeChangeError', done)

    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', done)
      router.events.off('routeChangeError', done)
      clearTimeout(timer)
    }
  }, [router])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5">
      <div
        className="h-full bg-blue-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  )
}
