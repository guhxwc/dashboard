# Guia de Integração: Supabase + Stripe

Este documento explica como configurar o backend no Supabase para alimentar o dashboard.

## 1. Estrutura do Banco de Dados (Supabase)

Crie as seguintes tabelas no seu projeto Supabase.

### Tabela: `subscriptions`
Armazena os dados dos assinantes e transações.

```sql
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  customer_email text, -- Adicionado para identificar o usuário
  customer_name text,  -- Adicionado para identificar o usuário
  status text, -- 'active', 'canceled', 'past_due'
  plan_amount numeric,
  affiliate_id text, -- 'victor_hugo', 'allan_stachuk', etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Tabela: `transactions`
Armazena cada pagamento realizado (para cálculo de financeiro).

```sql
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  stripe_payment_intent_id text,
  amount numeric, -- Valor em centavos ou reais (padronizar)
  status text, -- 'succeeded', 'failed'
  customer_id text,
  customer_email text, -- Opcional, para facilitar joins
  affiliate_id text,
  type text, -- 'subscription', 'upsell_vip'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## 2. Stripe Webhooks (Supabase Edge Functions)

Para que o dashboard funcione em tempo real, você precisa criar uma Edge Function no Supabase que escute os eventos do Stripe.

1. Instale o Supabase CLI.
2. Crie uma função: `supabase functions new stripe-webhook`
3. Adicione o código abaixo em `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()
  
  let event
  try {
    event = stripe.webhooks.constructEvent(
      body, 
      signature!, 
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    )
  } catch (err) {
    return new Response(err.message, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      const affiliateId = session.metadata?.affiliate_id || null
      
      // Salvar Transação
      await supabase.from('transactions').insert({
        stripe_payment_intent_id: session.payment_intent,
        amount: session.amount_total / 100,
        status: 'succeeded',
        customer_id: session.customer,
        customer_email: session.customer_details?.email,
        affiliate_id: affiliateId,
        type: session.mode === 'subscription' ? 'subscription' : 'upsell_vip'
      })

      // Se for assinatura, salvar/atualizar na tabela subscriptions
      if (session.mode === 'subscription') {
         await supabase.from('subscriptions').upsert({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            customer_email: session.customer_details?.email,
            customer_name: session.customer_details?.name,
            status: 'active',
            plan_amount: session.amount_total / 100,
            affiliate_id: affiliateId,
            updated_at: new Date().toISOString()
         }, { onConflict: 'stripe_customer_id' })
      }
      break;
      
    case 'customer.subscription.deleted':
      const subscription = event.data.object
      await supabase.from('subscriptions').update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id)
      break;

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

4. Faça o deploy: `supabase functions deploy stripe-webhook`
5. Configure as variáveis de ambiente no painel do Supabase (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc).
6. Adicione a URL da função no painel de Webhooks do Stripe.

## 3. Conectando o Frontend

No arquivo `.env` do projeto React, adicione:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

## 4. Função para Criar Cupons (Supabase Edge Functions)

Para permitir que a criação de afiliados gere automaticamente cupons no Stripe, você precisa implantar a função `create-stripe-coupon`.

1. A função já foi criada em `supabase/functions/create-stripe-coupon/index.ts`.
2. Faça o deploy da função:
   ```bash
   supabase functions deploy create-stripe-coupon
   ```
3. Configure a variável de ambiente `STRIPE_SECRET_KEY` no painel do Supabase (Edge Functions > Secrets) ou via CLI:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   ```
   *Nota: Use a chave secreta do Stripe (começa com `sk_`).*

4. A função será chamada automaticamente pelo frontend quando você criar um novo afiliado.
