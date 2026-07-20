<script setup lang="ts">
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

let lenis: Lenis | null = null
let desktopMediaQuery: MediaQueryList | null = null
let reducedMotionMediaQuery: MediaQueryList | null = null

function destroyLenis() {
  lenis?.destroy()
  lenis = null
}

function syncLenis() {
  const shouldEnable = desktopMediaQuery?.matches && !reducedMotionMediaQuery?.matches

  if (!shouldEnable) {
    destroyLenis()
    return
  }

  if (lenis) return

  lenis = new Lenis({
    allowNestedScroll: true,
    anchors: true,
    autoRaf: true,
    autoToggle: true,
    lerp: 0.1,
    smoothWheel: true,
    stopInertiaOnNavigate: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
  })
}

onMounted(() => {
  desktopMediaQuery = window.matchMedia('(min-width: 1024px)')
  reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  desktopMediaQuery.addEventListener('change', syncLenis)
  reducedMotionMediaQuery.addEventListener('change', syncLenis)
  syncLenis()
})

onBeforeUnmount(() => {
  desktopMediaQuery?.removeEventListener('change', syncLenis)
  reducedMotionMediaQuery?.removeEventListener('change', syncLenis)
  destroyLenis()
})
</script>

<template>
  <slot />
</template>
