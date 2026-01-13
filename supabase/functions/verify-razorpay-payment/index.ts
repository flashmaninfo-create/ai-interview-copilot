import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  paymentLinkId: string
  paymentId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request body
    const { paymentLinkId, paymentId }: RequestBody = await req.json()

    if (!paymentLinkId || !paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing payment details' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Get Razorpay config
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: configData, error: configError } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'payment_config_v2')
      .single()

    if (configError || !configData?.value?.razorpay?.keyId || !configData?.value?.razorpay?.keySecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const razorpayKeyId = configData.value.razorpay.keyId
    const razorpayKeySecret = configData.value.razorpay.keySecret
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

    // 4. Fetch payment link details from Razorpay to verify and get notes
    const paymentLinkResponse = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
      },
    })

    const paymentLinkData = await paymentLinkResponse.json()

    if (!paymentLinkResponse.ok) {
      console.error('Razorpay fetch error:', paymentLinkData)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Verify payment status
    if (paymentLinkData.status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Extract plan details from notes
    const notes = paymentLinkData.notes || {}
    const planId = notes.plan_id
    const credits = parseInt(notes.credits) || 0
    const amount = parseFloat(notes.amount) || 0

    if (!planId || credits <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payment link data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Verify user matches
    if (notes.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment user mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Check for duplicate fulfillment
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('provider', 'razorpay')
      .or(`reference_id.eq.${paymentLinkId},reference_id.eq.${paymentId}`)
      .single()

    if (existingPayment) {
      return new Response(
        JSON.stringify({ success: true, credits, message: 'Payment already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Fulfill credits using the purchase_credits RPC
    const { data: purchaseResult, error: purchaseError } = await supabaseAdmin.rpc('purchase_credits', {
      p_plan_id: planId,
      p_amount: amount,
      p_credits: credits,
    })

    if (purchaseError) {
      console.error('Purchase error:', purchaseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to add credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 10. Update the payment record with Razorpay reference
    await supabaseAdmin
      .from('payments')
      .update({
        provider: 'razorpay',
        reference_id: paymentId,
      })
      .eq('id', purchaseResult.payment_id)

    return new Response(
      JSON.stringify({
        success: true,
        credits,
        newBalance: purchaseResult.new_balance,
        message: `Successfully added ${credits} credits`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Verification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
