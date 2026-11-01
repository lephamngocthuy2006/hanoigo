import L from 'leaflet'

export function pinIcon(emoji, variant = '') {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${variant}"><span>${emoji}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36],
  })
}

