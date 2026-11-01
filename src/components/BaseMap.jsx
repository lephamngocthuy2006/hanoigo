import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@maplibre/maplibre-gl-leaflet'

// Bản đồ vector của OpenFreeMap (dữ liệu OpenStreetMap): nét trên mọi màn hình,
// miễn phí, không cần API key. Vẽ bằng MapLibre bên dưới các marker của Leaflet.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const VI_NAME = ['coalesce', ['get', 'name:vi'], ['get', 'name']]

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
    const layer = L.maplibreGL({ style: STYLE_URL, attributionControl: false })
    layer.addTo(map)
    const gl = layer.getMaplibreMap()
    gl.once('style.load', () => applyVietnameseLabels(gl))
    map.attributionControl.addAttribution(
      '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    )
    return () => map.removeLayer(layer)
  }, [map])
  return null
}
