import { useLayoutEffect, useRef, useState } from 'react'

// taille (px) d'un élément, mise à jour quand il change de dimensions
export default function useElementSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}
