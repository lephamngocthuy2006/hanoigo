// HANOI GO! — Edge Function "send-push": nhận thông báo từ database (trigger notify_push)
// rồi gửi Web Push tới từng thiết bị của người nhận.
// Secrets cần đặt: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SECRET (cùng giá trị với Vault "hanoigo_push_secret").
// Deploy với --no-verify-jwt: chỉ chấp nhận request có header x-push-secret đúng.
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(
  'mailto:hanoigo@users.noreply.github.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (req.headers.get('x-push-secret') !== Deno.env.get('PUSH_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { subscriptions = [], title, body, url, tag } = await req.json()
  const payload = JSON.stringify({ title, body, url, tag })

  const results = await Promise.allSettled(
    (subscriptions as Sub[]).map((s) => webpush.sendNotification(s, payload, { TTL: 60 * 60 * 24 })),
  )
  const sent = results.filter((r) => r.status === 'fulfilled').length
  // 404/410: thiết bị đã tắt thông báo hoặc gỡ app — web tự đăng ký lại khi người dùng bật lại
  const gone = results.filter((r) => r.status === 'rejected' && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)).length

  return Response.json({ sent, gone, failed: results.length - sent - gone })
})
