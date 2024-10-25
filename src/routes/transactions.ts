import type { FastifyInstance} from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-existis'


// Unitários: unidade da sua aplicação
// Integração: comunicação entre duas ou mais unidades
// e2e - ponta a ponta: simulam um usuário operando na nossa aplicação

// Pirâmide de testes: E2E (não dependem de nenhuma tecnologia, não dependem de arquitetura)
// 


export async function transactionsRoutes(app: FastifyInstance) {
  // app.addHook('preHandler', async (request, reply) => {
  //   console.log(`[${request.method}] ${ request.url}`)
  // })

  app.get('/', {
    preHandler: [checkSessionIdExists],
  }, async (request) => {
    const { sessionId } = request.cookies
    
    const transactions = await knex('transactions')
    .where('session_id', sessionId)
    .select()
    return { transactions }
  })
  app.get('/:id', {
    preHandler: [checkSessionIdExists],
  }, async (request) => {
    const getTransactionsParamsSchema = z.object({
      id: z.string().uuid(),
    })
    const { id } = getTransactionsParamsSchema.parse(request.params)

    const { sessionId } = request.cookies

    const transaction = await knex('transactions')
    .where({
      session_id: sessionId,
      id,
    })
    .first()

    return {
      transaction,
    }
  })
  app.get('/summary', {
    preHandler: [checkSessionIdExists],
  }, async (request) => {
    const { sessionId } = request.cookies

    const summary = await knex('transactions')
      .where('session_id', sessionId)
      .sum('amount', { as: 'amount' })
      .first()
    return { summary }
  })
  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })
    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
 }