import Fastify from 'fastify'

const gateway = Fastify({
  logger: true
})

gateway.get('/health', async () => ({ status: 'ok' }))

gateway.listen({ port: 3002 }, function (err, address) {
  if (err) {
    gateway.log.error(err)
    process.exit(1)
  }

  gateway.log.info(`Attendance gateway listening at ${address}`)
})
