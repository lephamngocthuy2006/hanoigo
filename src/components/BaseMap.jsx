import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

// Bản đồ vector của OpenFreeMap (dữ liệu OpenStreetMap): nét trên mọi màn hình,
// miễn phí, không cần API key. Vẽ bằng MapLibre bên dưới các marker của Leaflet.
// MapLibre khá nặng nên chỉ tải khi có bản đồ trên màn hình.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const VI_NAME = ['coalesce', ['get', 'name:vi'], ['get', 'name']]

const loadMapLibre = () =>
  Promise.all([import('maplibre-gl/dist/maplibre-gl.css'), import('@maplibre/maplibre-gl-leaflet')])

// Style gốc ưu tiên tên tiếng Anh → đổi các nhãn tên sang tiếng Việt
function applyVietnameseLabels(gl) {
  gl.getStyle().layers.forEach((layer) => {
    const field = layer.layout?.['text-field']
    if (field && JSON.stringify(field).includes('name')) {
      gl.setLayoutProperty(layer.id, 'text-field', VI_NAME)
    }
  })
  // Nhãn "Hà Nội" to đè lên Hồ Gươm khi zoom gần → chỉ hiện khi nhìn xa
  ;['label_city', 'label_city_capital'].forEach((id) => gl.getLayer(id) && gl.setLayerZoomRange(id, 3, 13))
}

export default function BaseMap() {
  const map = useMap()
  useEffect(() => {
    let layer = null
    let cancelled = false
    loadMapLibre().then(() => {
      if (cancelled) return
      layer = L.maplibreGL({ style: STYLE_URL, attributionControl: false }).addTo(map)
      const gl = layer.getMaplibreMap()
      // Một vài POI trong style OpenFreeMap thiếu icon sprite → nạp ảnh rỗng 1x1 để tránh warning console
      gl.on('styleimagemissing', ({ id }) => {
        if (!gl.hasImage(id)) gl.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) })
      })
      gl.once('style.load', () => applyVietnameseLabels(gl))
    })
    const attribution =
      '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    map.attributionControl.addAttribution(attribution)
    return () => {
      cancelled = true
      if (layer) map.removeLayer(layer)
      map.attributionControl.removeAttribution(attribution)
    }
  }, [map])
  return null
}
