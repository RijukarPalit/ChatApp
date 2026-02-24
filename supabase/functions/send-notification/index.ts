import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djtw from "https://deno.land/x/djwt@v3.0.1/mod.ts"

serve(async (req) => {
  try {
    const payload = await req.json()
    // Supabase Webhook INSERTs always put the data in .record
    const record = payload.record 
    
    const receiverId = record.receiver_id
    const senderId = record.sender_id // You need this for navigation
    const messageBody = record.message_text || record.message || "New message"

    if (!receiverId) throw new Error("receiver_id missing")

    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Get Receiver Token AND Sender Name
    const [receiverRes, senderRes] = await Promise.all([
      supabase.from('user').select('fcm_token').eq('id', receiverId).single(),
      supabase.from('user').select('firstName, lastName').eq('id', senderId).single()
    ])

    if (!receiverRes.data?.fcm_token) throw new Error("No FCM token found")
    
    const senderName = `${senderRes.data?.firstName || 'Someone'} ${senderRes.data?.lastName || ''}`.trim()

    // 2. JWT Signing (Your stable logic)
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }

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

    // 4. Send FCM with both Notification (for UI) and Data (for Navigation)
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({
          message: {
            token: receiverRes.data.fcm_token,
            notification: { 
              title: senderName, 
              body: messageBody 
            },
            data: {
              // These keys must match your navigation logic in NotificationService.ts
              userId: String(senderId),
              userName: senderName,
              body: messageBody,
              title: senderName
            },
            android: {
              priority: "high",
              notification: {
                channelId: "chat_messages", // Must match your app's channel ID
                clickAction: "TOP_STORY_ACTIVITY"
              }
            }
          },
        }),
      }
    )

    const result = await fcmResponse.json()
    console.log("FCM Result:", result)
    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error: any) {
    console.error("Function Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})