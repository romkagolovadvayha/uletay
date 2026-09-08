import { colors } from '../../theme/colors';
import { mapColors } from '../../theme/map';
import { motion } from '../../theme/motion';
import { shadows } from '../../theme/shadows';
import { clusterMapPlaces, createMapPlaceElement, mapPlaceMarkerCss } from '../../utils/map/placeMarkers';

/** Inline HTML for native WebView — same Yandex JS API 3.0 as web. */
export function buildNativeYandexMapHtml(
  apiKey: string,
  center: { lat: number; lng: number },
  defaultZoom: number,
): string {
  const key = apiKey.replace(/[^a-zA-Z0-9_-]/g, '');
  const initLat = Number.isFinite(center.lat) ? center.lat : 56.606975;
  const initLng = Number.isFinite(center.lng) ? center.lng : 53.622461;
  const initZoom = Number.isFinite(defaultZoom) ? defaultZoom : 14;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    ${mapPlaceMarkerCss}
    html, body, #map { margin: 0; width: 100%; height: 100%; background: ${colors.background}; overflow: hidden; }
    .fest-scheme-overlay {
      opacity: var(--fest-scheme-opacity, 0.85);
      transform: rotate(var(--fest-scheme-rotation, 0deg));
      transform-origin: center center;
      pointer-events: none;
    }
    .fest-zone-fill-image {
      opacity: var(--fest-zone-fill-opacity, 0.92);
      transform: rotate(var(--fest-zone-fill-rotation, 0deg));
      transform-origin: center center;
      pointer-events: none;
    }
    .fest-user-marker {
      width: 16px; height: 16px; border-radius: 50%;
      background: ${mapColors.userDot}; border: 2px solid ${colors.text};
      box-sizing: border-box; transform: translate(-50%, -50%);
    }
    .fest-poi-marker {
      min-width: 36px; height: 36px; padding: 0 7px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 18px; background: ${mapColors.fabBg}; color: ${colors.primary};
      border: 2px solid ${mapColors.markerBorder}; box-sizing: border-box;
      transform: translate(-50%, -50%);
      transition: ${motion.selectionTransitionCss};
      font: 800 11px/1 system-ui, sans-serif; letter-spacing: .1px;
      box-shadow: ${shadows.mapMarker};
    }
    .fest-poi-marker--selected {
      background: ${colors.primary}; color: ${colors.primaryText}; border-color: ${colors.text};
      transform: translate(-50%, -50%) scale(1.12);
    }
    .fest-zone-label {
      display: flex; align-items: center; justify-content: center;
      color: ${colors.text}; font: 700 12px/1.15 system-ui, sans-serif;
      text-align: center; text-shadow: ${shadows.mapZoneLabel};
      pointer-events: none; box-sizing: border-box;
      transform: translate(-50%, -50%);
    }
    @media (prefers-reduced-motion: reduce) {
      .fest-poi-marker { transition-property: background-color, color, border-color; }
    }
  </style>
  <script src="https://api-maps.yandex.ru/v3/?apikey=${key}&lang=ru_RU"></script>
</head>
<body>
  <div id="map"></div>
  <script>
(function () {
  var groupPlaces = ${clusterMapPlaces.toString()};
  function cameraDuration() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : ${motion.mapCameraDurationMs};
  }

  function post(msg) {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch (e) {}
  }

  function hexWithAlpha(hex, alpha) {
    var n = String(hex || '').replace('#', '');
    if (n.length !== 6) return hex;
    var r = parseInt(n.slice(0, 2), 16);
    var g = parseInt(n.slice(2, 4), 16);
    var b = parseInt(n.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function strokeLine(width, color, dash) {
    return dash ? { width: width, color: color, dash: dash } : { width: width, color: color };
  }

  function zoneStyle(props, selected) {
    var dash = props.zoneType === 'fence' ? [4, 4] : undefined;
    var strokeWidth = selected ? Math.max(props.strokeWidth || 1, 3) : (props.strokeWidth || 1);
    var strokeColor = selected ? '${colors.primary}' : (props.strokeColor || '${colors.text}');
    var fillOpacity = selected ? Math.min((props.fillOpacity || 0.4) + 0.15, 0.95) : (props.fillOpacity || 0.4);
    return {
      fill: hexWithAlpha(props.fillColor || '${mapColors.zoneFallback}', fillOpacity),
      stroke: [strokeLine(strokeWidth, strokeColor, dash)],
      simplificationRate: 0
    };
  }

  function pathStyle(props) {
    var kind = (props && props.pathKind) || 'road';
    if (props && props.closed) {
      return { stroke: [strokeLine(4, '${colors.competition}', [2, 2])], simplificationRate: 0 };
    }
    var styles = {
      road: { color: '${mapColors.pathRoad}', width: 6 },
      walkway: { color: '${mapColors.routeExternal}', width: 3, dash: [2, 3] },
      fence: { color: '${colors.live}', width: 2, dash: [4, 4] }
    };
    var s = styles[kind] || styles.road;
    return { stroke: [strokeLine(s.width, s.color, s.dash)], simplificationRate: 0 };
  }

  function poiGlyph(category) {
    var glyphs = {
      stage: '♪', foodcourt: 'ЕДА', toilet: 'WC', shower: 'ДУШ',
      water: 'H₂O', medical: '+', security: 'ЩИТ', info: 'i', entrance: 'ВХОД',
      parking: 'P', custom: '•'
    };
    return glyphs[category] || '•';
  }

  var LAYER_Z = { paths: 1400, overlay: 2000, zoneImages: 3500, routes: 3400, zones: 3600, zoneLabels: 3700, markers: 3800 };
  var FEST_PATH = 'fest-paths';
  var FEST_ROUTE = 'fest-routes';
  var FEST_ZONE = 'fest-zones';
  var FEST_MARKER = 'fest-markers';

  var map = null;
  var ymaps3 = null;
  var YMapImageOverlay = null;
  var ready = false;
  var pendingState = null;
  var currentState = null;
  var cameraTarget = null;
  var markerPointerUntil = 0;
  var pendingCmds = [];
  var zoneItems = [];
  var zoneImages = [];
  var zoneLabels = [];
  var pathItems = [];
  var routeItems = [];
  var poiMarkers = [];
  var savedMarkers = [];
  var schemeOverlay = null;
  var userMarker = null;
  var selectedZoneId = null;
  var selectedPoiId = null;
  var mapZoom = ${initZoom};
  var locationSynced = false;
  var INIT_CENTER = { lat: ${initLat}, lng: ${initLng} };
  var INIT_ZOOM = ${initZoom};

  function removeAll(items) {
    if (!map) return;
    for (var i = 0; i < items.length; i++) {
      try { map.removeChild(items[i]); } catch (e) {}
    }
    items.length = 0;
  }

  function drawPlaceMarkers(state) {
    removeAll(poiMarkers);
    groupPlaces(state.placeMarkers || [], mapZoom).forEach(function (group) {
      var place = group.places[0];
      var clustered = group.places.length > 1;
      var el = (${createMapPlaceElement.toString()})(group, mapZoom);
      el.addEventListener('pointerdown', function () { markerPointerUntil = Date.now() + 1000; });
      el.addEventListener('pointerup', function () { markerPointerUntil = Date.now() + 500; });
      el.addEventListener('pointercancel', function () { markerPointerUntil = 0; });
      el.addEventListener('click', function (event) {
        markerPointerUntil = Date.now() + 500;
        event.stopPropagation();
        if (clustered) post({ type: 'placesPress', places: group.places });
        else if (place.kind === 'zone') post({ type: 'zonePress', zoneId: place.id });
        else post({ type: 'poiPress', poiId: place.id });
      });
      var marker = new ymaps3.YMapMarker({ id: 'place-' + place.kind + '-' + place.id,
        source: FEST_MARKER, coordinates: group.coordinates, zIndex: LAYER_Z.markers + (place.selected ? 20 : 0) }, el);
      map.addChild(marker);
      poiMarkers.push(marker);
    });
  }

  function metersPerDegLng(lat) {
    return 111320 * Math.cos((lat * Math.PI) / 180);
  }

  function layoutBounds(center, widthMeters, heightMeters) {
    var halfW = widthMeters / 2;
    var halfH = heightMeters / 2;
    var lngScale = metersPerDegLng(center.lat);
    return [
      [center.lng - halfW / lngScale, center.lat - halfH / 111320],
      [center.lng + halfW / lngScale, center.lat + halfH / 111320]
    ];
  }

  function zoneLayout(feature) {
    var props = feature.properties || {};
    if (props.layout) {
      return {
        center: props.layout.center,
        widthMeters: props.layout.widthMeters,
        heightMeters: props.layout.heightMeters,
        rotation: props.layout.rotation || 0
      };
    }
    var ring = (feature.geometry.coordinates[0] || []).slice();
    if (ring.length > 1) {
      var a = ring[0], b = ring[ring.length - 1];
      if (a[0] === b[0] && a[1] === b[1]) ring = ring.slice(0, -1);
    }
    var lng = 0, lat = 0;
    for (var i = 0; i < ring.length; i++) { lng += ring[i][0]; lat += ring[i][1]; }
    lng /= Math.max(1, ring.length);
    lat /= Math.max(1, ring.length);
    var lngs = ring.map(function (p) { return p[0]; });
    var lats = ring.map(function (p) { return p[1]; });
    var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    return {
      center: { lat: lat, lng: lng },
      widthMeters: Math.max(2, (maxLng - minLng) * metersPerDegLng(lat)),
      heightMeters: Math.max(2, (maxLat - minLat) * 111320),
      rotation: 0
    };
  }

  function applyState(state) {
    currentState = state;
    if (!ready || !map || !ymaps3) {
      pendingState = state;
      return;
    }
    selectedZoneId = state.selectedZoneId || null;
    selectedPoiId = state.selectedPoiId || null;
    var container = document.getElementById('map');

    removeAll(pathItems);
    var paths = (state.paths && state.paths.features) || [];
    for (var pi = 0; pi < paths.length; pi++) {
      var pf = paths[pi];
      if (!pf.geometry || pf.geometry.type !== 'LineString') continue;
      if (pf.properties && pf.properties.routingOnly) continue;
      var pItem = new ymaps3.YMapFeature({
        id: 'path-' + pi,
        source: FEST_PATH,
        geometry: pf.geometry,
        style: pathStyle(pf.properties || {})
      });
      map.addChild(pItem);
      pathItems.push(pItem);
    }

    if (schemeOverlay) {
      try { map.removeChild(schemeOverlay); } catch (e) {}
      schemeOverlay = null;
    }
    if (state.overlay && state.overlay.url && YMapImageOverlay) {
      container.style.setProperty('--fest-scheme-opacity', String(state.overlay.opacity != null ? state.overlay.opacity : 0.85));
      container.style.setProperty('--fest-scheme-rotation', (state.overlay.rotation || 0) + 'deg');
      schemeOverlay = new YMapImageOverlay({
        bounds: state.overlay.bounds,
        imageUrl: state.overlay.url,
        className: 'fest-scheme-overlay',
        zIndex: LAYER_Z.overlay
      });
      map.addChild(schemeOverlay);
    }

    removeAll(zoneImages);
    removeAll(zoneLabels);
    removeAll(zoneItems);
    var dynStyle = document.getElementById('fest-dyn');
    if (!dynStyle) {
      dynStyle = document.createElement('style');
      dynStyle.id = 'fest-dyn';
      document.head.appendChild(dynStyle);
    }
    dynStyle.textContent = '';
    var zones = state.zones || [];
    for (var zi = 0; zi < zones.length; zi++) {
      var zf = zones[zi];
      if (!zf.geometry || zf.geometry.type !== 'Polygon') continue;
      var zp = zf.properties || {};
      var selected = zp.id === selectedZoneId;
      var zItem = new ymaps3.YMapFeature({
        id: 'zone-' + (zp.id || zi),
        source: FEST_ZONE,
        geometry: zp.geometryParts && zp.geometryParts.length ? { type: 'MultiPolygon', coordinates: [zf.geometry.coordinates].concat(zp.geometryParts.map(function (p) { return p.coordinates; })) } : zf.geometry,
        style: zoneStyle(zp, selected),
        properties: { zoneId: zp.id }
      });
      map.addChild(zItem);
      zoneItems.push(zItem);

      var layout = zoneLayout(zf);
      if (zp.fillImageUrl && YMapImageOverlay) {
        var imgRot = zp.fillImageRotation != null ? zp.fillImageRotation : layout.rotation;
        var classSuffix = String(zp.id || zi).replace(/[^a-zA-Z0-9_-]/g, '_');
        dynStyle.textContent +=
          '.fest-zone-fill-image--' + classSuffix + '{opacity:' + (zp.fillImageOpacity != null ? zp.fillImageOpacity : 0.92) +
          ';transform:rotate(' + imgRot + 'deg);}';
        var img = new YMapImageOverlay({
          bounds: layoutBounds(layout.center, layout.widthMeters, layout.heightMeters),
          imageUrl: zp.fillImageUrl,
          className: 'fest-zone-fill-image fest-zone-fill-image--' + classSuffix,
          zIndex: LAYER_Z.zoneImages
        });
        map.addChild(img);
        zoneImages.push(img);
      }

    }

    removeAll(routeItems);
    var routes = state.routeSegments || [];
    for (var ri = 0; ri < routes.length; ri++) {
      var seg = routes[ri];
      if (!seg.coordinates || !seg.coordinates.length) continue;
      var rItem = new ymaps3.YMapFeature({
        id: 'route-' + ri,
        source: FEST_ROUTE,
        geometry: { type: 'LineString', coordinates: seg.coordinates },
        style: {
          stroke: [strokeLine(
            seg.kind === 'external' ? 4 : 6,
            seg.kind === 'external' ? '${mapColors.routeExternal}' : '${mapColors.routeInternal}',
            seg.kind === 'external' ? [2, 2] : undefined
          )],
          simplificationRate: 0
        }
      });
      map.addChild(rItem);
      routeItems.push(rItem);
    }

    drawPlaceMarkers(state);

    removeAll(savedMarkers);
    var saved = state.userMarkers || [];
    for (var si = 0; si < saved.length; si++) {
      var savedItem = saved[si];
      if (!savedItem.coordinate) continue;
      var savedEl = document.createElement('div');
      savedEl.className = 'fest-poi-marker fest-poi-marker--selected';
      savedEl.textContent = savedItem.kind === 'car' ? '🚗' : '⛺';
      var savedMarker = new ymaps3.YMapMarker({
        id: 'saved-' + savedItem.kind,
        source: FEST_MARKER,
        coordinates: [savedItem.coordinate.lng, savedItem.coordinate.lat],
        zIndex: LAYER_Z.markers + 30
      }, savedEl);
      map.addChild(savedMarker);
      savedMarkers.push(savedMarker);
    }

    if (userMarker) {
      try { map.removeChild(userMarker); } catch (e) {}
      userMarker = null;
    }
    if (state.userLocation) {
      var el = document.createElement('div');
      el.className = 'fest-user-marker';
      userMarker = new ymaps3.YMapMarker({
        source: FEST_MARKER,
        coordinates: [state.userLocation.lng, state.userLocation.lat],
        zIndex: LAYER_Z.markers
      }, el);
      map.addChild(userMarker);
    }

    if (state.followUser && state.userLocation) {
      locationSynced = true;
      map.update({
        location: {
          center: [state.userLocation.lng, state.userLocation.lat],
          zoom: Math.max(state.defaultZoom || INIT_ZOOM, 16),
          duration: cameraDuration()
        }
      });
    } else if (!locationSynced && state.center) {
      // First bridge push: lock camera to festival (HTML may have raced before props arrived).
      locationSynced = true;
      mapZoom = state.defaultZoom || INIT_ZOOM;
      map.update({
        location: {
          center: [state.center.lng, state.center.lat],
          zoom: mapZoom,
          duration: 0
        }
      });
    }
  }

  function runCmd(cmd) {
    if (!ready || !map) {
      pendingCmds.push(cmd);
      return;
    }
    if (cmd.type === 'zoomBy') {
      var active = cameraTarget && cameraTarget.until > Date.now() ? cameraTarget : null;
      var nextZoom = Math.max(12, Math.min(21, (active ? active.zoom : mapZoom) + cmd.delta));
      var target = { zoom: nextZoom, duration: cameraDuration() };
      if (active && active.center) target.center = active.center;
      cameraTarget = { center: active && active.center, zoom: nextZoom, until: Date.now() + cameraDuration() + 80 };
      map.update({ location: target });
    } else if (cmd.type === 'flyTo') {
      locationSynced = true;
      cameraTarget = { center: [cmd.lng, cmd.lat], zoom: cmd.zoom != null ? cmd.zoom : 16, until: Date.now() + cameraDuration() + 80 };
      map.update({
        location: {
          center: [cmd.lng, cmd.lat],
          zoom: cmd.zoom != null ? cmd.zoom : 16,
          duration: cameraDuration()
        }
      });
    } else if (cmd.type === 'fitRoute' && cmd.coordinates && cmd.coordinates.length) {
      cameraTarget = null;
      var minLng = cmd.coordinates[0][0], maxLng = cmd.coordinates[0][0];
      var minLat = cmd.coordinates[0][1], maxLat = cmd.coordinates[0][1];
      for (var i = 0; i < cmd.coordinates.length; i++) {
        var c = cmd.coordinates[i];
        minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0]);
        minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
      }
      map.update({
        location: {
          bounds: [[minLng, minLat], [maxLng, maxLat]]
        }
      });
    }
  }

  window.__festApply = function (state) { applyState(state); };
  window.__festCmd = function (cmd) { runCmd(cmd); };

  async function boot() {
    try {
      if (!window.ymaps3) throw new Error('Yandex Maps API не загрузился');
      ymaps3 = window.ymaps3;
      ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', [
        '@yandex/ymaps3-default-ui-theme@0.0'
      ]);
      await ymaps3.ready;
      var theme = await ymaps3.import('@yandex/ymaps3-default-ui-theme');
      YMapImageOverlay = theme.YMapImageOverlay;

      var center = (pendingState && pendingState.center) || INIT_CENTER;
      var zoom = (pendingState && pendingState.defaultZoom) || INIT_ZOOM;
      mapZoom = zoom;
      if (pendingState && pendingState.center) locationSynced = true;

      map = new ymaps3.YMap(document.getElementById('map'), {
        location: { center: [center.lng, center.lat], zoom: zoom },
        showScaleInCopyrights: true,
        behaviors: ['drag', 'pinchZoom', 'dblClick']
      }, [
        new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' }),
        new ymaps3.YMapDefaultFeaturesLayer({})
      ]);

      var stacks = [
        { id: FEST_PATH, z: LAYER_Z.paths, type: 'features' },
        { id: FEST_ROUTE, z: LAYER_Z.routes, type: 'features' },
        { id: FEST_ZONE, z: LAYER_Z.zones, type: 'features' },
        { id: FEST_MARKER, z: LAYER_Z.markers, type: 'markers' }
      ];
      for (var si = 0; si < stacks.length; si++) {
        map.addChild(new ymaps3.YMapFeatureDataSource({ id: stacks[si].id }));
        map.addChild(new ymaps3.YMapLayer({
          source: stacks[si].id,
          type: stacks[si].type,
          zIndex: stacks[si].z
        }));
      }

      map.addChild(new ymaps3.YMapListener({
        layer: 'any',
        onUpdate: function (event) {
          if (event && event.location && typeof event.location.zoom === 'number') {
            var previousZoom = Math.round(mapZoom * 4);
            mapZoom = event.location.zoom;
            if (ready && currentState && previousZoom !== Math.round(mapZoom * 4)) drawPlaceMarkers(currentState);
          }
        },
        onClick: function (object, event) {
          if (Date.now() < markerPointerUntil) return;
          var poiId = object && object.entity && object.entity.properties && object.entity.properties.poiId;
          if (!poiId && object && object.entity && object.entity.id && String(object.entity.id).indexOf('poi-') === 0) {
            poiId = String(object.entity.id).slice(4);
          }
          if (poiId) {
            post({ type: 'poiPress', poiId: poiId });
            return;
          }
          var zoneId = object && object.entity && object.entity.properties && object.entity.properties.zoneId;
          if (!zoneId && object && object.entity && object.entity.id && String(object.entity.id).indexOf('zone-') === 0) {
            zoneId = String(object.entity.id).slice(5);
          }
          if (zoneId) {
            post({ type: 'zonePress', zoneId: zoneId });
            return;
          }
          var coordinates = event && event.coordinates;
          post({
            type: 'mapPress',
            coordinate: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : undefined
          });
        }
      }));

      ready = true;
      post({ type: 'loaded' });
      if (pendingState) applyState(pendingState);
      pendingState = null;
      while (pendingCmds.length) runCmd(pendingCmds.shift());
    } catch (err) {
      post({ type: 'error', message: (err && err.message) || String(err) });
    }
  }

  if (window.ymaps3) {
    boot();
  } else {
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (window.ymaps3) {
        clearInterval(timer);
        boot();
      } else if (tries > 50) {
        clearInterval(timer);
        post({ type: 'error', message: 'Не удалось загрузить Yandex Maps API. Проверьте ключ и HTTP Referer (uletayapp.ru).' });
      }
    }, 200);
  }
})();
  </script>
</body>
</html>`;
}
