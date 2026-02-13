

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djtw from "https://deno.land/x/djwt@v3.0.1/mod.ts"

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record || payload 
    const receiverId = record.receiver_id
    const messageBody = record.message_text || record.message || "New message"

    if (!receiverId) throw new Error("receiver_id missing")

    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Get User Token
    const { data: userData } = await supabase.from('user').select('fcm_token').eq('id', receiverId).single()
    if (!userData?.fcm_token) throw new Error("No FCM token found")

    // 2. Manual JWT Signing (Avoids the crypto.Sign error)
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }

    // Clean the private key for Deno
    const pem = serviceAccount.private_key.replace(/\\n/g, '\n')
    const keyData = await Uint8Array.from(atob(pem.split('\n').filter(l => !l.includes('---')).join('')), c => c.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8", 
      keyData, 
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, 
      false, 
      ["sign"]
    )
    
    const assertion = await djtw.create({ alg: "RS256", typ: "JWT" }, jwtPayload, cryptoKey)

    // 3. Get Google Access Token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    })
    const { access_token } = await tokenRes.json()

    // 4. Send FCM
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({
          message: {
            token: userData.fcm_token,
            notification: { title: "New Message", body: messageBody },
          },
        }),
      }
    )

    return new Response(JSON.stringify(await fcmResponse.json()), { status: 200 })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})