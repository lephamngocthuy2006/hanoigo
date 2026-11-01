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

// Ảnh để private → cần signed URL (hết hạn sau 1 giờ), có cache trong phiên
const cache = new Map()

export async function signedUrls(paths) {
  const need = [...new Set(paths.filter((p) => p && !cache.has(p)))]
  if (need.length) {
    const { data, error } = await supabase.storage.from('photos').createSignedUrls(need, 3600)
    if (!error) data.forEach((d) => d.signedUrl && cache.set(d.path, d.signedUrl))
  }
  return Object.fromEntries(paths.filter(Boolean).map((p) => [p, cache.get(p)]))
}

export async function deletePhoto(path) {
  if (!path) return
  cache.delete(path)
  await supabase.storage.from('photos').remove([path])
}
