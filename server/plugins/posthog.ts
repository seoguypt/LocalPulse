import { PostHog } from 'posthog-node'

export default defineNitroPlugin((nitro) => {
  const config = useRuntimeConfig()

  const client = new PostHog(
    config.public.posthogPublicKey,
    { enableExceptionAutocapture: true }
  )

  // Capture server-side errors
  nitro.hooks.hook('error', (error, { event }) => {
    client.captureException(error, undefined, event ?{
      path: event.path,
      method: event.method,
      query: getQuery(event),
      headers: getHeaders(event),
      body: readRawBody(event),
    } : undefined)
  })

  nitro.hooks.hook('close', async () => {
    await client.shutdown()
  })
})