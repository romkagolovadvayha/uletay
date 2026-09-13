import { arrangeMapLandscape } from './map-landscape-layout.mjs';
import { registerFestivalMap } from './map-site-registration.mjs';

/**
 * Inventory traced from the supplied 2026 plan, in its 1280 × 1920 pixel space.
 * Affine fit to seven existing CMS landmarks; residuals below 8 m.
 * This is a schematic registration, not a surveyed GPS plan.
 * Original geometry is retained in schematicGeometry when adapting footprints to roads.
 */
export function planCoordinate(x, y) {
  return [53.61656824047423 + 0.000011830524687 * x + 0.000000530807574 * y,
    56.615434790442094 + 0.00000025801283 * x - 0.000006677045228 * y];
}
function latLng(xy) {
  const [lng, lat] = planCoordinate(...xy);
  return { lat, lng };
}
const styles = {
  parking: ['#C4A86C', 0.27], camping: ['#5DA849', 0.22], autocamp: ['#F5D547', 0.28],
  comfort: ['#E8913A', 0.28], trade: ['#D4B896', 0.65], building: ['#6C6C70', 0.8],
  service: ['#E8ECEF', 0.8], water: ['#007AFF', 0.7], toilet: ['#5AC8FA', 0.65],
  custom: ['#8E8E93', 0.4],
};
function polygon(id, name, zoneType, points, description, access) {
  const [fillColor, fillOpacity] = styles[zoneType];
  return { type: 'Feature', properties: {
    id: `plan-2026-${id}`, name, zoneType, fillColor, fillOpacity,
    strokeColor: fillColor, strokeWidth: 1, showLabel: true,
    description, ...(access ? { accessPoint: latLng(access) } : {}),
  }, geometry: { type: 'Polygon', coordinates: [[...points, points[0]].map(p => planCoordinate(...p))] } };
}
function box(id, name, kind, x, y, w, h, angle = 0, description, access) {
  const a = angle * Math.PI / 180;
  const corners = [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]]
    .map(([dx,dy]) => [x + dx*Math.cos(a)-dy*Math.sin(a), y + dx*Math.sin(a)+dy*Math.cos(a)]);
  const feature = polygon(id, name, kind, corners, description, access);
  feature.properties.labelRotation = angle;
  return feature;
}
export const planZones = [
  polygon('parking-north','Парковка — север','parking',[[151,524],[1049,82],[1156,82],[1107,157],[383,519]],'Парковка вдоль северной границы площадки.'),
  polygon('parking-west','Парковка — у въездов','parking',[[152,531],[376,529],[376,941],[180,1010]],'Парковка со стороны въездов №1 и №3.',[240,1020]),
  polygon('parking-road','Парковка — за дорогой','parking',[[38,781],[121,781],[203,1695],[177,1717],[56,1715],[37,1700]],'Парковка на противоположной стороне дороги Ижевск — Гольяны.'),
  polygon('camping-north','Палаточный городок — север','camping',[[392,529],[993,232],[993,610],[819,652],[674,711],[539,807],[452,837],[392,774]],'Северная часть палаточного городка, вдоль парковки и лагеря «Комфорт».',[706,680]),
  polygon('camping-west','Палаточный городок — запад','camping',[[449,916],[510,842],[561,787],[698,708],[640,927],[477,927]],'Между Западной сценой и торговыми рядами.',[522,840]),
  polygon('camping-east','Палаточный городок — восток','camping',[[710,702],[829,657],[976,633],[976,810],[816,837],[811,929],[651,929]],'Между лагерем «Комфорт» и сценой РЕН ТВ.',[843,650]),
  polygon('camping-south','Палаточный городок — юг','camping',[[430,1050],[502,1014],[733,1014],[680,1094],[613,1139],[551,1224],[437,1253]],'Палатки к югу от улицы Центральной.',[519,1010]),
  polygon('camping-south-edge','Палаточный городок — у Южной сцены','camping',[[438,1262],[549,1233],[616,1242],[645,1281],[627,1350],[552,1410],[437,1356]],'Южная часть палаточного городка рядом с Южной сценой.',[578,1380]),
  polygon('autocamp','Автокемпинг','autocamp',[[224,1155],[381,1155],[383,1374],[519,1436],[489,1500],[379,1586],[252,1650]],'Места для автомобилей и палаток. Заезд со стороны въезда №2.'),
  polygon('motorhomes','Автодома','autocamp',[[255,1658],[387,1582],[467,1540],[458,1590],[376,1654],[272,1680]],'Места для автодомов в южной части автокемпинга.'),
  polygon('comfort','Лагерь «Комфорт»','comfort',[[1010,224],[1100,171],[1100,541],[1061,623],[1022,645],[1010,621]],'Отдельная зона проживания. Вход через КПП «Комфорт».',[993,630]),
  box('hotel','Палаточная гостиница','comfort',796,1112,118,49,-43,'Палаточная гостиница у восточной границы. Вход со стороны торговых рядов.',[812,1060]),
  box('hotel-admin','Администрация гостиницы','service',878,1085,68,25,-43,'Администрация палаточной гостиницы.',[849,1050]),
  box('children','Детская площадка','custom',775,1023,48,27,0,'Детская площадка рядом с улицей Центральной.',[774,1008]),
  box('dance-west','Танцпол — Западная сцена','custom',467,872,78,51,-46,'Зрительская площадка перед Западной сценой.',[506,874]),
  box('dance-ren','Танцпол — РЕН ТВ','custom',865,889,78,70,0,'Зрительская площадка перед сценой РЕН ТВ.',[820,930]),
  polygon('dance-south','Танцпол — Южная сцена','custom',[[594,1139],[625,1158],[604,1229],[560,1219]],'Зрительская площадка перед Южной сценой.',[651,1120]),
  box('trade-central','Торговые ряды — Центральная','trade',650,974,333,9,0,'Торговые палатки вдоль улицы Центральной.',[650,1008]),
  box('trade-north','Кафе и сувениры','trade',652,934,325,9,0,'Кафе, сувениры и торговые палатки.',[647,958]),
  box('trade-ren-west','Торговые ряды — у танцпола РЕН ТВ','trade',820,891,9,83,0,'Торговые палатки вдоль танцпола.',[795,931]),
  box('trade-ren-north','Торговые ряды — север РЕН ТВ','trade',858,847,78,8,0,'Торговые палатки к северу от танцпола РЕН ТВ.'),
  box('trade-south','Торговые ряды — юг','trade',752,1065,75,9,-34,'Торговые палатки по дороге к палаточной гостинице.',[748,1050]),
  box('bar-comfort','Бар «Комфорт»','trade',977,630,36,33,0,'Бар у входа в лагерь «Комфорт».',[949,632]),
  box('bar-north','Бар — северный городок','trade',707,676,23,22,-25,'Бар у дороги в северном палаточном городке.',[718,686]),
  box('bar-west','Бар — Западная сцена','trade',566,819,25,24,34,'Бар у дороги рядом с Западной сценой.',[545,818]),
  box('bar-central-west','Бар — запад торговых рядов','trade',536,961,31,24,0,'Бар в центральных торговых рядах.',[532,981]),
  box('bar-central-east','Бар — восток торговых рядов','trade',730,955,34,33,0,'Бар у восточной части торговых рядов.',[731,977]),
  box('bar-south','Бар — южные торговые ряды','trade',681,1120,31,18,-35,'Бар на пути к Южной сцене.',[669,1102]),
  box('souvenirs-south','Кафе и сувениры — юг','trade',708,1102,22,19,-35,'Кафе и сувениры в южных торговых рядах.',[696,1087]),
  box('merch-central','Мерч — восток торговых рядов','building',696,950,21,22,0,'Фестивальный мерч у центральных торговых рядов.',[694,978]),
  box('merch-bands','Мерч групп','building',680,1127,23,15,-35,'Мерч музыкальных групп; место отмечено выноской на схеме.',[667,1108]),
  box('medical-ren','Пункт первой помощи — РЕН ТВ','service',923,836,45,28,0,'Пункт первой помощи к северу от танцпола РЕН ТВ.',[923,850]),
  box('medical-central','Пункт первой помощи — Центральная','service',767,988,40,29,0,'Медпункт у улицы Центральной.',[767,1008]),
  box('medical-hotel','Пункт первой помощи — гостиница','service',825,1051,42,27,-43,'Медпункт рядом с палаточной гостиницей.',[800,1044]),
  box('medical-south','Пункт первой помощи — Южная сцена','service',631,1127,45,29,-35,'Медпункт перед Южной сценой.',[660,1104]),
  box('emergency','МЧС','service',438,944,18,28,0,'Пункт МЧС у главного входа.',[421,947]),
  box('cashier','Касса','service',380,1031,16,32,0,'Касса рядом с главным КПП.',[397,1042]),
  box('wc-west','Туалеты — въезд №3 (4 шт.)','toilet',202,938,15,55,-6,'Туалетный блок со стороны въезда №3. На схеме: 4 кабины.'),
  box('water-ren','Вода бесплатно — РЕН ТВ','water',984,829,13,13,0,'Бесплатная вода к северу от сцены РЕН ТВ.'),
  box('water-south','Вода бесплатно — юг','water',741,1174,13,13,0,'Бесплатная вода у южного прохода.'),
  box('autograph-west','Шатёр автограф-сессий — Западная сцена','service',407,862,11,11,0,'Шатёр у Западной сцены. Время встреч — в разделе «Автографы».'),
  box('autograph-ren','Шатёр автограф-сессий — РЕН ТВ','service',948,957,11,11,40,'Шатёр у сцены РЕН ТВ. Время встреч — в разделе «Автографы».'),
  box('autograph-south','Шатёр автограф-сессий — Южная сцена','service',695,1177,11,11,0,'Шатёр у Южной сцены. Время встреч — в разделе «Автографы».'),
  box('wc-ren-autograph','Туалеты — шатёр РЕН ТВ (9 шт.)','toilet',977,944,29,13,-56,'На исходной схеме WC, 9 кабин.'),
  box('urinal','Писсуар — у Комфорта','toilet',978,749,16,54,-29,'Писсуар у западной границы лагеря «Комфорт».'),
  box('wc-children','WC — детская площадка','toilet',758,1015,11,10,0,'WC отмечен в углу детской площадки.',[758,1008]),
  box('wc-hotel','WC — палаточная гостиница','toilet',842,1074,15,10,-43,'WC рядом с палаточной гостиницей.',[823,1050]),
  box('wc-south','WC — Южная сцена','toilet',691,1215,14,10,-43,'WC у южной границы, рядом с местом выдачи мерча групп.'),
  box('zags','ЗАГС','service',660,1175,15,16,0,'ЗАГС отмечен у Южной сцены.'),
];
// Numbered motorhome pitches are legible on the source: A1–A12.
for (let i = 0; i < 12; i++) {
  const pitch = box(`motorhome-a${i+1}`,`Место для автодома A${i+1}`,'autocamp',290+i*8.5,1659-i*6.4,7.8,17,-12,
    `Место A${i+1} в зоне автодомов на схеме 2026 года. Данные о занятости не указаны.`);
  pitch.properties.parentZoneId = 'plan-2026-motorhomes';
  planZones.push(pitch);
}
// The 2027 ticket selector provides the official numbering that was unreadable on
// the overview plan: 12 straight blocks (1–240) and three angled blocks
// (241–246, 247–266 and 267–296). The thin strip at y=1158 on the overview plan
// is not a numbered pitch block, so it is deliberately excluded.
const autocampBlocks = [1188,1220,1252,1284,1316,1348,1380,1412,1444,1476,1508,1540]
  .map((y,i) => ({
    ring:box(`layout-${i}`,'','autocamp',337,y,60,17).geometry.coordinates[0],
    first:i*20+1,
    columns:10,
  }));
for (const [x,y,w,first,columns] of [[398,1416,16,241,3],[429,1441,59,247,10],[456,1466,88,267,15]])
  autocampBlocks.push({ring:box('layout-angled','','autocamp',x,y,w,16,-23).geometry.coordinates[0],first,columns});
const autocampLayoutRings = autocampBlocks.map(block=>block.ring);
planZones.find(f=>f.properties.id==='plan-2026-autocamp').properties.layoutRings = autocampLayoutRings;
autocampBlocks.forEach(({ring,first,columns}) => {
  const at = (u,v) => [ring[0][0]+(ring[1][0]-ring[0][0])*u+(ring[3][0]-ring[0][0])*v,
    ring[0][1]+(ring[1][1]-ring[0][1])*u+(ring[3][1]-ring[0][1])*v];
  for(let side=0;side<2;side++) for(let col=0;col<columns;col++) {
    // On the ticket map the first side descends (230…221) while the opposite
    // side ascends (231…240). The same pairing is used in every block.
    const place = side === 0 ? first+columns-1-col : first+columns+col;
    const points=[at((col+.04)/columns,(side+.03)/2),at((col+.96)/columns,(side+.03)/2),
      at((col+.96)/columns,(side+.97)/2),at((col+.04)/columns,(side+.97)/2)];
    planZones.push({type:'Feature',properties:{
      id:`ticket-2027-autocamp-place-${String(place).padStart(3,'0')}`,
      name:`Место автокемпинга №${place}`,zoneType:'autocamp',parentZoneId:'plan-2026-autocamp',
      bookingNumber:place,bookingGroup:`${first}–${first+columns*2-1}`,
      markerLabel:String(place),fillColor:'#FF981F',fillOpacity:.72,strokeColor:'#FFF1DC',strokeWidth:.7,showLabel:true,
      description:`Место №${place} по схеме выбора билетов на фестиваль 2027 года. Цвет на карте не показывает актуальную занятость.`,
    },geometry:{type:'Polygon',coordinates:[[...points,points[0]]]}});
  }
});
function poi(id,name,category,x,y,description,access) {
  return {type:'Feature',geometry:{type:'Point',coordinates:planCoordinate(x,y)},properties:{
    id:`plan-2026-${id}`,name,category,description,status:'unknown',link:{type:'none'},
    ...(access ? {accessPoint:latLng(access)} : {}),
  }};
}
export const planPois = [
  poi('main-gate','Главный вход — КПП','entrance',385,1000,'Пешеходный вход через КПП рядом с кассой. Начало маршрутов без геолокации.'),
  poi('comfort-gate','Вход в лагерь «Комфорт» — КПП','entrance',1019,640,'Вход в лагерь «Комфорт». Маршрут проходит через разрыв в ограждении.',[1004,663]),
  // The overview drawing puts these labels around a schematic road that is
  // 55–80 px east of the real road. Preserve each label's side/offset while
  // aligning the whole entrance group to the traced Yandex landscape road.
  poi('entry-1','Въезд №1','entrance',139,1044,'Основной въезд с дороги Ижевск — Гольяны, у начала Центральной улицы.'),
  poi('entry-2','Въезд №2','entrance',175,1115,'Въезд с дороги со стороны автокемпинга.'),
  poi('entry-3','Въезд №3','entrance',166,891,'Въезд с дороги к западной парковке.'),
  poi('entry-4','Въезд №4','entrance',56,891,'Въезд на парковку с противоположной стороны дороги.'),
  poi('exit-july12','Выезд — открытие 12 июля','info',134,775,'На схеме указано: выезд откроется 12 июля. Не является обычным входом.'),
  poi('turnstile','Турникет выхода','info',382,960,'Выход через турникет у главного КПП.'),
  poi('car-entry','Автовъезд','entrance',399,1051,'Автомобильный въезд на территорию.'),
];
function routePath(id,name,pathKind,points,routingOnly=false) {
  return {type:'Feature',properties:{id:`plan-2026-${id}`,name,pathKind,...(routingOnly?{routingOnly:true}:{})},geometry:{
    type:'LineString',coordinates:points.map(point=>planCoordinate(...point)),
  }};
}
export const planPaths = [
  routePath('hotel-admin-approach','Проход к административному лагерю','walkway',[[881,1004],[892,1028],[907,1050],[901,1074]]),
  routePath('trade-north-passage','Проход между торговыми павильонами','walkway',[[710,950.2764857881],[710,906]]),
  // The public road is registered to the current underlay. These anchors keep
  // all four roadside entrances connected to the internal path beginning at №1.
  routePath('public-road-route','Дорога Ижевск — Гольяны','road',[[109,859],[120,925],[128,980],[136,1046],[159,1280]],true),
  routePath('entry-1-link','Проход от въезда №1','walkway',[[136,1046],[139,1047]],true),
  routePath('entry-2-link','Проход от въезда №2','walkway',[[145,1115],[175,1115]],true),
  routePath('entry-3-4-crossing','Переход между въездами №3 и №4','walkway',[[56,891],[110,891],[166,891]],true),
  // The Comfort gate is in the documented fence opening at y=653–674.
  routePath('comfort-gate-link','Проход к КПП «Комфорт»','walkway',[[950,629],[976,644],[996,659],[1004,663]]),
  // Approach the REN TV medical point from the east side of the dance floor,
  // staying west of both fence segments that border the service area.
  routePath('medical-ren-link','Проход к медпункту РЕН ТВ','walkway',[[850,951],[910,940],[922,900],[923,850]]),
  // The ticket plan shows regular access lanes between the numbered autocamp
  // blocks. Keep their routing graph available without covering 296 labels.
  routePath('autocamp-spine','Проезд автокемпинга','walkway',[[387,1155],[387,1580]],true),
  ...Array.from({length:13},(_,index)=>{
    const y=1172+index*32;
    return routePath(`autocamp-aisle-${index+1}`,`Проход автокемпинга ${index+1}`,'walkway',[[245,y],[387,y]],true);
  }),
  routePath('autocamp-angled-247-266','Проход автокемпинга 247–266','walkway',[[387,1460],[401,1454],[457,1429]],true),
  routePath('autocamp-angled-267-296','Проход автокемпинга 267–296','walkway',[[387,1495],[415,1483],[497,1449]],true),
  routePath('motorhome-aisle','Проход к местам автодомов','walkway',[[387,1580],[330,1645],[280,1680]],true),
  routePath('autocamp-services','Проход к воде и туалетам автокемпинга','walkway',[[387,1548],[431,1551],[471,1514]],true),
  routePath('south-boundary-services','Проход к южному туалетному блоку','walkway',[[387,1332],[500,1332],[601,1344]],true),
  routePath('north-camp-spine','Северный проход палаточного городка','walkway',[[950,629],[900,500],[840,311]],true),
  routePath('north-camp-services','Проход к северным туалетным блокам','walkway',[[840,311],[639,416],[434,529]],true),
  routePath('comfort-services','Проход по лагерю «Комфорт»','walkway',[[1004,663],[1030,663],[1055,654],[1080,600],[1080,497],[1080,450],[1080,323],[1080,275]],true),
  routePath('ren-east-services','Проход к восточным сервисам РЕН ТВ','walkway',[[923,850],[950,838],[984,829],[990,800],[970,760]],true),
  routePath('ren-north-trade','Проход к северным торговым рядам РЕН ТВ','walkway',[[782,666],[800,760],[820,820],[858,847]],true),
  routePath('entry-3-toilets','Проход к туалетам у въезда №3','walkway',[[166,891],[190,920],[202,938]],true),
  routePath('ren-autograph-services','Проход к шатру РЕН ТВ','walkway',[[910,940],[948,957],[977,944]],true),
  routePath('south-stage-services','Проход к сервисам Южной сцены','walkway',[[627,1148],[660,1175],[695,1177],[741,1174]],true),
  // Walk around the western end of the internal fence beside the stage.
  routePath('south-stage-wc','Проход к WC Южной сцены','walkway',[[660,1175],[642,1174],[636,1182],[646,1197],[680,1210]],true),
];
// More specific names make repeated sanitary blocks distinguishable in search.
export const existingUpdates = {
  'plan-2026-parking-north': { accessPoint:latLng([166,891]), description:'Северная парковка. Маршрут ведёт к въезду №3 со стороны дороги Ижевск — Гольяны.' },
  'plan-2026-parking-road': { accessPoint:latLng([56,891]), description:'Парковка на противоположной стороне дороги. Маршрут ведёт к въезду №4.' },
  'zone-mr8m54xa': { accessPoint:latLng([499,886]), description:'Западная сцена. Маршрут ведёт к подходу к танцполу с северной дороги.' },
  'zone-mr8m4008': { accessPoint:latLng([820,930]), description:'Сцена РЕН ТВ. Маршрут ведёт к входу на танцпол со стороны торговых рядов.' },
  'zone-mr8m5vsc': { accessPoint:latLng([651,1120]), description:'Южная сцена. Маршрут ведёт к подходу к танцполу со стороны южной дороги.' },
  'zone-mr7vl9pn': { name:'Туалеты — северная дорога (20 шт.)' },
  'zone-mr7vqmls': { name:'Туалеты — автодома (5 шт.)' },
  'zone-mr7vsiqs': { name:'Туалеты — южная граница (20 шт.)' },
  'zone-mr7vtdz1': { name:'Туалеты — северо-запад (10 шт.)' },
  'zone-mr8mnog5': { name:'Туалеты — север (10 шт.)' },
  'zone-mr8mo5zz': { name:'Туалеты — северо-восток (10 шт.)' },
  'zone-mr8morr8': { name:'Туалеты — Комфорт, север (7 шт.)' },
  'zone-mr8mpjow': { name:'Душ — Комфорт, север', zoneType:'shower' },
  'zone-mr8mpzcb': { name:'Душ — Комфорт, юг' },
  'zone-mr8mqjei': { name:'Туалеты — Комфорт, юг (7 шт.)' },
  'zone-mr8mrlox': { name:'Туалеты — у КПП Комфорт (12 шт.)' },
  'zone-mr8ms5ag': { name:'Душ — у КПП Комфорт' },
  'zone-mr8msosm': { name:'Туалеты — запад КПП Комфорт (10 шт.)' },
  'zone-mr8n4ie4': { name:'Туалеты — восточные торговые палатки (24 шт.)' },
  'zone-mr8n5b5j': { name:'Душ — РЕН ТВ' },
  'zone-mr8n63nn': { name:'Туалеты — Центральная (60 шт.)' },
  'zone-mr8n8ece': { name:'Туалеты — главный вход (10 шт.)' },
  'zone-mr7vurj4': { name:'Вода бесплатно — автокемпинг' },
  'zone-mr8mz3g9': { name:'Мерч — запад торговых рядов' },
  'plan-2026-bar-north': { name:'Бар «Слэм»' },
  'plan-2026-bar-west': { name:'Бар «Улей»' },
  'plan-2026-bar-central-west': { name:'Бар «Футбол»' },
  'plan-2026-bar-central-east': { name:'Бар «До Фонаря»' },
  'plan-2026-bar-south': { name:'Мерч — южные торговые ряды', zoneType:'building', description:'Фестивальный мерч рядом с мерчем групп в южных торговых рядах.' },
  'plan-2026-souvenirs-south': { name:'Бар — южные торговые ряды', description:'Бар в южных торговых рядах, рядом с мерчем.' },
  'plan-2026-hotel-admin': { name:'Административный лагерь', description:'Административный лагерь рядом с палаточной гостиницей.' },
  'plan-2026-autocamp': { layoutRings: autocampLayoutRings, description:'Автокемпинг со стороны въезда №2. На карте отмечены официальные номера мест 1–296 по схеме выбора билетов на фестиваль 2027 года.' },
};
const routeAccessUpdates = {
  'zone-mr7vqmls': { accessPoint:latLng([431,1551]) },
  'zone-mr7vsiqs': { accessPoint:latLng([601,1344]) },
  'zone-mr7vtdz1': { accessPoint:latLng([434,529]) },
  'zone-mr7vurj4': { accessPoint:latLng([471,1514]) },
  'zone-mr8mnog5': { accessPoint:latLng([639,416]) },
  'zone-mr8mo5zz': { accessPoint:latLng([840,311]) },
  'zone-mr8morr8': { accessPoint:latLng([1080,275]) },
  'zone-mr8mpjow': { accessPoint:latLng([1080,323]) },
  'zone-mr8mpzcb': { accessPoint:latLng([1080,450]) },
  'zone-mr8mqjei': { accessPoint:latLng([1080,497]) },
  'zone-mr8mrlox': { accessPoint:latLng([1055,654]) },
  'zone-mr8msosm': { accessPoint:latLng([996,665]) },
  'zone-mr8n4ie4': { accessPoint:latLng([990,800]) },
  'zone-mr8n5b5j': { accessPoint:latLng([984,829]) },
  'plan-2026-trade-ren-north': { accessPoint:latLng([858,847]) },
  'plan-2026-wc-west': { accessPoint:latLng([202,938]) },
  'plan-2026-water-ren': { accessPoint:latLng([984,829]) },
  'plan-2026-water-south': { accessPoint:latLng([741,1174]) },
  'plan-2026-autograph-ren': { accessPoint:latLng([948,957]) },
  'plan-2026-wc-ren-autograph': { accessPoint:latLng([977,944]) },
  'plan-2026-urinal': { accessPoint:latLng([970,760]) },
  // WC is immediately behind the diagonal fence; route to its accessible side.
  'plan-2026-wc-south': { accessPoint:latLng([680,1210]), description:'WC у Южной сцены. Подход со стороны сцены, вокруг западного конца внутреннего ограждения.' },
  'plan-2026-zags': { accessPoint:latLng([660,1175]) },
};
export function supplementFestivalMap(data) {
  const merge = (existing, additions) => {
    const ids = new Set((existing?.features ?? []).map(f=>f.properties.id));
    return {type:'FeatureCollection',features:[...(existing?.features ?? []),...additions.filter(f=>!ids.has(f.properties.id))]};
  };
  const mapZones = merge(data.mapZones,planZones);
  // Retire mistaken features and the provisional row/place autocamp labels that
  // preceded the official 2027 ticket numbering.
  mapZones.features = mapZones.features.filter(f=>
    !['plan-2026-police','plan-2026-groceries'].includes(f.properties.id) &&
    !/^plan-2026-autocamp-r\d{2}-p\d{2}$/.test(f.properties.id));
  mapZones.features = mapZones.features.map(f=>({...f,properties:{
    ...f.properties,...existingUpdates[f.properties.id],...routeAccessUpdates[f.properties.id],
  }}));
  // Draw broad areas before small buildings so their labels and hit targets survive.
  const background = new Set(['parking','camping','autocamp','comfort']);
  mapZones.features.sort((a,b)=>Number(!background.has(a.properties.zoneType))-Number(!background.has(b.properties.zoneType)));
  const mergedPois = merge(data.mapPois,planPois);
  const currentPlanPois = new Map(planPois.map(feature=>[feature.properties.id,feature]));
  const mapPois = {...mergedPois,features:mergedPois.features.map(feature=>currentPlanPois.get(feature.properties.id) ?? feature)};
  const mergedPaths = merge(data.mapPaths,planPaths);
  const currentPlanPaths = new Map(planPaths.map(feature=>[feature.properties.id,feature]));
  const mapPaths = {...mergedPaths,features:mergedPaths.features.map(feature=>currentPlanPaths.get(feature.properties.id) ?? feature)};
  const fitted = arrangeMapLandscape(registerFestivalMap({...data,mapZones,mapPois,mapPaths})).data;
  const coords = fitted.mapZones.features.flatMap(f=>[f.geometry,...(f.properties.geometryParts??[])].flatMap(g=>g.coordinates[0]));
  return {...fitted,festivalMap:{...fitted.festivalMap,
    territoryBounds:{sw:{lng:Math.min(...coords.map(p=>p[0]))-0.0001,lat:Math.min(...coords.map(p=>p[1]))-0.0001},
      ne:{lng:Math.max(...coords.map(p=>p[0]))+0.0001,lat:Math.max(...coords.map(p=>p[1]))+0.0001}},
  }};
}
