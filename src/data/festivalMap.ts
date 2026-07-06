import type {
  FestivalMapConfig,
  MapPathsGeoJson,
  MapPoisGeoJson,
  MapZoneType,
  MapZonesGeoJson,
} from '../types/map';

/** Главная дорога (Ижевск ↔ Гольяны), въезд с запада */
export const ROAD_ENTRANCE = { lat: 56.606401, lng: 53.6192 };
/** Центр палаточного городка по схеме YLETAY 2026 */
export const FESTIVAL_CENTER = { lat: 56.606975, lng: 53.622461 };

export const defaultZoneStyles: Record<
  MapZoneType,
  { fillColor: string; fillOpacity: number; extrusionHeight: number }
> = {
  building: { fillColor: '#3a3a3c', fillOpacity: 0.88, extrusionHeight: 4 },
  camping: { fillColor: '#5DA849', fillOpacity: 0.5, extrusionHeight: 2 },
  parking: { fillColor: '#C4A86C', fillOpacity: 0.55, extrusionHeight: 0 },
  autocamp: { fillColor: '#F5D547', fillOpacity: 0.6, extrusionHeight: 1.5 },
  comfort: { fillColor: '#E8913A', fillOpacity: 0.55, extrusionHeight: 3 },
  trade: { fillColor: '#D4B896', fillOpacity: 0.6, extrusionHeight: 3 },
  stage_area: { fillColor: '#8E8E93', fillOpacity: 0.65, extrusionHeight: 10 },
  service: { fillColor: '#AEAEB2', fillOpacity: 0.45, extrusionHeight: 1 },
  toilet: { fillColor: '#5AC8FA', fillOpacity: 0.55, extrusionHeight: 2.5 },
  shower: { fillColor: '#64D2FF', fillOpacity: 0.55, extrusionHeight: 2.5 },
  water: { fillColor: '#007AFF', fillOpacity: 0.5, extrusionHeight: 1 },
  fence: { fillColor: '#FF3B30', fillOpacity: 0.12, extrusionHeight: 0 },
  custom: { fillColor: '#AEAEB2', fillOpacity: 0.4, extrusionHeight: 1 },
};

export const defaultFestivalMapConfig: FestivalMapConfig = {
  center: FESTIVAL_CENTER,
  defaultZoom: 14,
  enabled: true,
  territoryBounds: {
    sw: { lat: 56.60575, lng: 53.61875 },
    ne: { lat: 56.6084, lng: 53.62465 },
  },
  adminOverlay: {
    imageUrl: '/images/festival-map-2026.png',
    opacity: 0.5,
    center: FESTIVAL_CENTER,
    widthMeters: 580,
    aspectRatio: 0.72,
    rotation: 0,
  },
};

export const defaultMapZones: MapZonesGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'zone-territory',
        name: 'Территория фестиваля',
        zoneType: 'fence',
        ...defaultZoneStyles.fence,
        strokeColor: '#FF3B30',
        strokeWidth: 2,
        description: 'Контур по схеме (забор)',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.61985, 56.60588],
            [53.61955, 56.60655],
            [53.61975, 56.60715],
            [53.62005, 56.60755],
            [53.62085, 56.60805],
            [53.6225, 56.60825],
            [53.62435, 56.60815],
            [53.62455, 56.60755],
            [53.6245, 56.60695],
            [53.62445, 56.60635],
            [53.6240, 56.60595],
            [53.6228, 56.60582],
            [53.6210, 56.6058],
            [53.61985, 56.60588],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-parking-n',
        name: 'Парковка (север)',
        zoneType: 'parking',
        ...defaultZoneStyles.parking,
        strokeColor: '#9A8040',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.61905, 56.60775],
            [53.6224, 56.60775],
            [53.6224, 56.60835],
            [53.61905, 56.60835],
            [53.61905, 56.60775],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-parking-nw',
        name: 'Парковка (северо-запад)',
        zoneType: 'parking',
        ...defaultZoneStyles.parking,
        strokeColor: '#9A8040',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.61885, 56.60735],
            [53.61955, 56.60735],
            [53.61955, 56.60775],
            [53.61885, 56.60775],
            [53.61885, 56.60735],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-camping-main',
        name: 'Палаточный городок',
        zoneType: 'camping',
        ...defaultZoneStyles.camping,
        strokeColor: '#3D7A35',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.62005, 56.60655],
            [53.62385, 56.60655],
            [53.62385, 56.60755],
            [53.62005, 56.60755],
            [53.62005, 56.60655],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-autocamp',
        name: 'Автокемпинг',
        zoneType: 'autocamp',
        ...defaultZoneStyles.autocamp,
        strokeColor: '#C4A830',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.61905, 56.60605],
            [53.62075, 56.60605],
            [53.62075, 56.60672],
            [53.61905, 56.60672],
            [53.61905, 56.60605],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-autodoma',
        name: 'Автодома',
        zoneType: 'autocamp',
        ...defaultZoneStyles.autocamp,
        fillOpacity: 0.45,
        strokeColor: '#C4A830',
        strokeWidth: 1,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.61905, 56.60582],
            [53.61985, 56.60582],
            [53.61985, 56.60605],
            [53.61905, 56.60605],
            [53.61905, 56.60582],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-comfort',
        name: 'Лагерь комфорт',
        zoneType: 'comfort',
        ...defaultZoneStyles.comfort,
        strokeColor: '#C47020',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.62355, 56.60755],
            [53.62455, 56.60755],
            [53.62455, 56.6082],
            [53.62355, 56.6082],
            [53.62355, 56.60755],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-trade',
        name: 'Торговые ряды',
        zoneType: 'trade',
        ...defaultZoneStyles.trade,
        strokeColor: '#A89070',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.62085, 56.60682],
            [53.62365, 56.60682],
            [53.62365, 56.60708],
            [53.62085, 56.60708],
            [53.62085, 56.60682],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-stage-ren-tv',
        name: 'Сцена РЕН ТВ',
        zoneType: 'stage_area',
        ...defaultZoneStyles.stage_area,
        fillColor: '#FF5520',
        fillOpacity: 0.55,
        strokeColor: '#CC4418',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.62355, 56.60665],
            [53.62435, 56.60665],
            [53.62435, 56.60715],
            [53.62355, 56.60715],
            [53.62355, 56.60665],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-stage-west',
        name: 'Западная сцена',
        zoneType: 'stage_area',
        ...defaultZoneStyles.stage_area,
        fillColor: '#34C759',
        fillOpacity: 0.55,
        strokeColor: '#28A745',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.62025, 56.60688],
            [53.62085, 56.60688],
            [53.62085, 56.60718],
            [53.62025, 56.60718],
            [53.62025, 56.60688],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-stage-south',
        name: 'Южная сцена',
        zoneType: 'stage_area',
        ...defaultZoneStyles.stage_area,
        fillColor: '#F5C518',
        fillOpacity: 0.55,
        strokeColor: '#C4A012',
        strokeWidth: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.62165, 56.60622],
            [53.62245, 56.60622],
            [53.62245, 56.60652],
            [53.62165, 56.60652],
            [53.62165, 56.60622],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'zone-tent-hotel',
        name: 'Палаточная гостиница',
        zoneType: 'custom',
        fillColor: '#7B9E6B',
        fillOpacity: 0.45,
        extrusionHeight: 2,
        strokeColor: '#5A7A4E',
        strokeWidth: 1,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [53.62335, 56.60605],
            [53.62415, 56.60605],
            [53.62415, 56.60635],
            [53.62335, 56.60635],
            [53.62335, 56.60605],
          ],
        ],
      },
    },
  ],
};

/** Узлы для связности графа маршрутов (lng, lat) */
const N = {
  roadEnt: [53.6192, 56.606401] as [number, number],
  kpp: [53.61985, 56.60655] as [number, number],
  centralW: [53.62005, 56.60678] as [number, number],
  centralMid: [53.62185, 56.60678] as [number, number],
  centralE: [53.62355, 56.60678] as [number, number],
  centralEnd: [53.62415, 56.60678] as [number, number],
  westStage: [53.62055, 56.60703] as [number, number],
  southStage: [53.62205, 56.60637] as [number, number],
  mainStage: [53.62395, 56.6069] as [number, number],
  autocamp: [53.61955, 56.60628] as [number, number],
  parkingN: [53.62105, 56.60805] as [number, number],
  comfort: [53.62405, 56.60775] as [number, number],
  tradeMid: [53.62225, 56.60695] as [number, number],
};

export const defaultMapPaths: MapPathsGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'path-road-to-kpp', name: 'Автовъезд с дороги' },
      geometry: { type: 'LineString', coordinates: [N.roadEnt, N.kpp] },
    },
    {
      type: 'Feature',
      properties: { id: 'path-kpp-to-central', name: 'КПП → Центральная' },
      geometry: { type: 'LineString', coordinates: [N.kpp, N.centralW] },
    },
    {
      type: 'Feature',
      properties: { id: 'path-central-street', name: 'Улица Центральная' },
      geometry: {
        type: 'LineString',
        coordinates: [N.centralW, N.centralMid, N.centralE, N.centralEnd],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'path-to-west-stage', name: 'К западной сцене' },
      geometry: {
        type: 'LineString',
        coordinates: [N.centralW, [53.62055, 56.60678], N.westStage],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'path-to-south-stage', name: 'К южной сцене' },
      geometry: { type: 'LineString', coordinates: [N.centralMid, N.southStage] },
    },
    {
      type: 'Feature',
      properties: { id: 'path-to-main-stage', name: 'К сцене РЕН ТВ' },
      geometry: {
        type: 'LineString',
        coordinates: [N.centralE, [53.62395, 56.60678], N.mainStage],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'path-trade-alley', name: 'Торговая аллея' },
      geometry: { type: 'LineString', coordinates: [N.centralMid, N.tradeMid, N.centralE] },
    },
    {
      type: 'Feature',
      properties: { id: 'path-to-autocamp', name: 'К автокемпингу' },
      geometry: {
        type: 'LineString',
        coordinates: [N.centralW, [53.61985, 56.60645], N.autocamp],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'path-to-parking', name: 'К парковке' },
      geometry: {
        type: 'LineString',
        coordinates: [N.kpp, [53.61965, 56.60745], [53.6205, 56.60775], N.parkingN],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'path-to-comfort', name: 'К лагерю комфорт' },
      geometry: {
        type: 'LineString',
        coordinates: [N.centralE, [53.6239, 56.60725], N.comfort],
      },
    },
  ],
};

export const defaultMapPois: MapPoisGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'poi-entrance-kpp',
        name: 'Автовъезд / КПП',
        category: 'entrance',
        description: 'Главный въезд с дороги Ижевск — Гольяны',
      },
      geometry: { type: 'Point', coordinates: N.kpp },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-exit-turnstile',
        name: 'Турникет выхода',
        category: 'entrance',
        description: 'Выход на дорогу',
      },
      geometry: { type: 'Point', coordinates: [53.6197, 56.60712] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-parking-n',
        name: 'Парковка (север)',
        category: 'parking',
        description: 'Основная парковка у въезда',
      },
      geometry: { type: 'Point', coordinates: N.parkingN },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-stage-ren-tv',
        name: 'Сцена РЕН ТВ',
        category: 'stage',
        link: { type: 'stage', id: 'ren-tv' },
        description: 'Главная сцена фестиваля',
      },
      geometry: { type: 'Point', coordinates: N.mainStage },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-stage-west',
        name: 'Западная сцена',
        category: 'stage',
        link: { type: 'stage', id: 'west' },
        description: 'Западная сцена фестиваля',
      },
      geometry: { type: 'Point', coordinates: N.westStage },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-stage-south',
        name: 'Южная сцена',
        category: 'stage',
        link: { type: 'stage', id: 'south' },
        description: 'Южная сцена фестиваля',
      },
      geometry: { type: 'Point', coordinates: N.southStage },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-foodcourt',
        name: 'Фуд-корт',
        category: 'foodcourt',
        link: { type: 'foodcourt', id: 'fc-5' },
        description: 'Улица Центральная',
      },
      geometry: { type: 'Point', coordinates: [53.62235, 56.60672] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-medical',
        name: 'Медпункт',
        category: 'medical',
      },
      geometry: { type: 'Point', coordinates: [53.62155, 56.60702] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-info',
        name: 'Инфоцентр',
        category: 'info',
      },
      geometry: { type: 'Point', coordinates: [53.62205, 56.60698] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-autocamp',
        name: 'Автокемпинг',
        category: 'parking',
        description: 'Места для автомобилей',
      },
      geometry: { type: 'Point', coordinates: N.autocamp },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-comfort',
        name: 'Лагерь комфорт',
        category: 'custom',
        description: 'Комфорт-размещение',
      },
      geometry: { type: 'Point', coordinates: N.comfort },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-toilet-n',
        name: 'Туалеты (север)',
        category: 'toilet',
      },
      geometry: { type: 'Point', coordinates: [53.62115, 56.60718] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-toilet-e',
        name: 'Туалеты (восток)',
        category: 'toilet',
      },
      geometry: { type: 'Point', coordinates: [53.62365, 56.60662] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-shower-comfort',
        name: 'Душ (комфорт)',
        category: 'shower',
      },
      geometry: { type: 'Point', coordinates: [53.62405, 56.60755] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-shower-east',
        name: 'Душ (восток)',
        category: 'shower',
      },
      geometry: { type: 'Point', coordinates: [53.6241, 56.60658] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'poi-water',
        name: 'Питьевая вода',
        category: 'water',
      },
      geometry: { type: 'Point', coordinates: [53.62255, 56.60662] },
    },
  ],
};

export const defaultStageMapPois: MapPoisGeoJson = {
  type: 'FeatureCollection',
  features: defaultMapPois.features.filter((f) => f.properties.category === 'stage'),
};

export function getDefaultMapData() {
  return {
    festivalMap: defaultFestivalMapConfig,
    mapZones: defaultMapZones,
    mapPaths: defaultMapPaths,
    mapPois: defaultMapPois,
  };
}
