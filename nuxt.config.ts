// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: [
    '@fontsource-variable/geist/index.css',
    '@fontsource/ibm-plex-mono/400.css',
    '@fontsource/ibm-plex-mono/500.css',
    '@fontsource/ibm-plex-mono/600.css',
    '@fontsource/ibm-plex-mono/700.css',
    '~/assets/css/main.css',
  ],
  components: [
    {
      path: '~/components',
      extensions: ['vue'],
    },
  ],
  runtimeConfig: {
    databaseUrl: '',
    supabaseServiceRoleKey: '',
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },
  typescript: {
    strict: true,
  },
  hooks: {
    'pages:extend'(pages) {
      function removeRouteComponents(routes: typeof pages) {
        for (let index = routes.length - 1; index >= 0; index -= 1) {
          const route = routes[index]

          if (!route) {
            continue
          }

          const filePath = route.file?.replaceAll('\\', '/')

          if (filePath?.includes('/pages/index/components/')) {
            routes.splice(index, 1)
            continue
          }

          if (route.children) {
            removeRouteComponents(route.children)
          }
        }
      }

      removeRouteComponents(pages)
    },
  },
})
