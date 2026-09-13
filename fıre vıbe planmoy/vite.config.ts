// The plugin stack, their order, the Workers deploy adapter, and the
// sandbox dev-server contract all live in @firevibe/vite-tanstack-config so
// they can be fixed fleet-wide by publishing a version. Do NOT re-add those
// plugins here: duplicates break the build.
//
// Project-specific Vite options go through the `vite` option:
//   export default defineConfig({ vite: { /* ... */ } })
import { defineConfig } from '@firevibe/vite-tanstack-config'

export default defineConfig({
  vite: {
    optimizeDeps: {
      // react-icons/fa6 is the platform's brand-icon set (lucide v1 has
      // no brand icons). Pre-bundling it at image warm-bake spares every
      // sandbox the "new dependency optimized → page reload" stutter the
      // first time an agent imports a brand icon mid-turn.
      include: ['react-icons/fa6'],
    },
  },
})
