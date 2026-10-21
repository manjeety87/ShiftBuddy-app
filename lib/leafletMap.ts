// Shared shell for the Leaflet maps we render inside a WebView (no API key).
// Change the tile provider or Leaflet version here — every map picks it up.

const LEAFLET_VERSION = '1.9.4';
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

/**
 * A full HTML page with a `map` (L.Map) and the base tile layer ready;
 * `script` runs after that. Keep `script` free of user-typed text — values
 * should go in through JSON.stringify.
 */
export const leafletDocument = ({ script, css = '', showAttribution = true }: { script: string; css?: string; showAttribution?: boolean }) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" />
  <style>
    body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
    ${css}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: ${showAttribution} });
    L.tileLayer('${TILE_URL}', { attribution: '${TILE_ATTRIBUTION}', maxZoom: 19 }).addTo(map);

    // Framing the map (fitBounds, setView) depends on the map's size, and a WebView
    // can run this script before it has been laid out — most often the second time,
    // when Leaflet comes from cache and loads faster than the layout. A fit worked out
    // at zero size lands zoomed all the way in on one corner. So frame through this:
    // it runs now, and again whenever the map learns its real size.
    const frameMap = (frame) => {
      frame();
      map.on('resize', frame);
      window.addEventListener('load', function () { map.invalidateSize(); frame(); });
    };
    ${script}
  </script>
</body>
</html>
`;
