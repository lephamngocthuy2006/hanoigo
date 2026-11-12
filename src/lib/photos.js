import { useEffect } from 'react'
import { supabase } from './supabase'
import { tr } from './i18n'

// Thu nhỏ ảnh (tối đa 1600px, JPEG) trước khi tải lên cho nhẹ
export async function compressImage(file, maxSize = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file).catch(() => null)
  let width, height, source
  if (bitmap) {
    ;({ width, height } = bitmap)
    source = bitmap
  } else {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error(tr('Không đọc được ảnh')))
      i.src = URL.createObjectURL(file)
    })
    width = img.naturalWidth
    height = img.naturalHeight
    source = img
  }
  const scale = Math.min(1, maxSize / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

export async function uploadPhoto(userId, file) {
  const blob = await compressImage(file)
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

// Ảnh bill chuyển khoản (gói Premium): tên bắt đầu bằng bill- để quản trị viên tối cao xem được khi đối soát
export async function uploadBill(userId, file) {
  const blob = await compressImage(file, 2000, 0.85)
  const path = `${userId}/bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

// Ảnh để private → cần signed URL (hết hạn sau 1 giờ). Cache trong phiên nhưng chỉ dùng lại
// link còn hạn ít nhất 10 phút — để tab mở lâu không bị ảnh vỡ (link cũ đã hết hạn).
const TTL = 3600
const REUSE_MS = (TTL - 600) * 1000
const cache = new Map() // path -> { url, at }

export async function signedUrls(paths) {
  const now = Date.now()
  const fresh = (p) => cache.has(p) && now - cache.get(p).at < REUSE_MS
  const need = [...new Set(paths.filter((p) => p && !fresh(p)))]
  if (need.length) {
    const { data, error } = await supabase.storage.from('photos').createSignedUrls(need, TTL)
    if (!error) data.forEach((d) => d.signedUrl && cache.set(d.path, { url: d.signedUrl, at: now }))
  }
  return Object.fromEntries(paths.filter(Boolean).map((p) => [p, cache.get(p)?.url]))
}

// Trang mở lâu (hoặc quay lại tab sau một lúc): xin link ảnh mới trước khi link cũ hết hạn
export function usePhotoUrlRefresh(paths, setUrls) {
  const key = paths.filter(Boolean).join('|')
  useEffect(() => {
    if (!key) return
    const list = key.split('|')
    const refresh = () => document.visibilityState === 'visible' && signedUrls(list).then(setUrls)
    const timer = setInterval(refresh, 20 * 60 * 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [key, setUrls])
}

export async function deletePhoto(path) {
  if (!path) return
  cache.delete(path)
  await supabase.storage.from('photos').remove([path])
}
