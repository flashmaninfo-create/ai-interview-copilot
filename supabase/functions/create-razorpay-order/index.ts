import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  planId: string
  planName: string
  amount: number
  credits: number
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Edge Function: create-razorpay-order called')
    
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    console.log('Auth result:', { userId: user?.id, error: authError?.message })

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    console.log('Request body:', body)
    
    const { planId, planName, amount, credits }: RequestBody = body

    if (!planId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: planId and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Get Razorpay config from app_config (using service role for this read)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: configData, error: configError } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'payment_config_v2')
      .single()

    console.log('Config fetch result:', { hasData: !!configData, error: configError?.message })

    if (configError || !configData?.value?.razorpay?.keyId || !configData?.value?.razorpay?.keySecret) {
      console.error('Config error:', configError)
      return new Response(
        JSON.stringify({ error: 'Payment configuration not found', details: configError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const razorpayKeyId = configData.value.razorpay.keyId
    const razorpayKeySecret = configData.value.razorpay.keySecret

    // 4. Create Razorpay Payment Link (hosted checkout)
    const origin = req.headers.get('origin') || 'http://localhost:5173'
    const callbackUrl = `${origin}/payment/callback`
    console.log('Callback URL:', callbackUrl)
    
    const paymentLinkPayload = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      accept_partial: false,
      description: `Purchase ${planName} - ${credits} Credits`,
      customer: {
        email: user.email,
      },
      notify: {
        email: true,
      },
      reminder_enable: false,
      notes: {
        user_id: user.id,
        plan_id: planId,
        credits: credits.toString(),
        amount: amount.toString(),
      },
      callback_url: callbackUrl,
      callback_method: 'get',
    }

    console.log('Creating Razorpay payment link...')
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentLinkPayload),
    })

    const razorpayData = await razorpayResponse.json()
    console.log('Razorpay response:', { status: razorpayResponse.status, data: razorpayData })

    if (!razorpayResponse.ok) {
      console.error('Razorpay error:', razorpayData)
      return new Response(
        JSON.stringify({ error: razorpayData.error?.description || 'Failed to create payment link', details: razorpayData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Return the payment link URL
    return new Response(
      JSON.stringify({
        success: true,
        paymentLinkId: razorpayData.id,
        paymentLinkUrl: razorpayData.short_url,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
