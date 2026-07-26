import { createServer } from 'node:http'

const port = Number.parseInt(process.argv[2] ?? '3123', 10)
const messages = []
let mode = 'success'
let messageId = 1000

async function readJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function respond(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)

  if (request.method === 'GET' && url.pathname === '/__messages') {
    respond(response, 200, { mode, messages })
    return
  }

  if (request.method === 'POST' && url.pathname === '/__mode') {
    const body = await readJson(request)
    mode = typeof body.mode === 'string' ? body.mode : 'success'
    respond(response, 200, { mode })
    return
  }

  if (url.pathname.endsWith('/getMe')) {
    respond(response, 200, {
      ok: true,
      result: {
        id: 123456789,
        is_bot: true,
        username: 'capacity_planner_test_bot',
      },
    })
    return
  }

  if (url.pathname.endsWith('/sendMessage')) {
    if (mode === 'rate_limit') {
      respond(response, 429, {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests',
        parameters: { retry_after: 1 },
      })
      return
    }

    if (mode === 'invalid_token') {
      respond(response, 401, {
        ok: false,
        error_code: 401,
        description: 'Unauthorized',
      })
      return
    }

    const body = await readJson(request)
    messageId += 1
    messages.push({
      messageId,
      chatId: body.chat_id,
      text: body.text,
      receivedAt: new Date().toISOString(),
    })
    respond(response, 200, {
      ok: true,
      result: {
        message_id: messageId,
        date: Math.floor(Date.now() / 1000),
        chat: { id: body.chat_id, type: 'private' },
        text: body.text,
      },
    })
    return
  }

  respond(response, 404, {
    ok: false,
    error_code: 404,
    description: 'Not Found',
  })
}).listen(port, '127.0.0.1', () => {
  console.log(`Telegram mock listening on http://127.0.0.1:${port}`)
})
