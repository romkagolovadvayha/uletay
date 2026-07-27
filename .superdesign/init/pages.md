# Page dependency trees

## `/map` — Festival map

Entry: `src/screens/FestivalMapScreen.tsx`

- `src/components/map/FestivalMapView.web.tsx`
  - `src/utils/map/yandexMapsLoader.ts`
  - `src/utils/map/featureStyles.ts`
  - `src/utils/map/layerStyles.ts`
  - `src/utils/map/zoneDisplay.ts`
  - `src/utils/map/zoneLabelCss.ts`
- `src/components/map/FestivalMapView.native.tsx`
  - `src/components/map/nativeYandexMapHtml.ts`
- `src/components/map/MapFilterChips.tsx`
- `src/components/map/MapLocationBanner.tsx`
- `src/components/map/MapFabGroup.tsx`
- `src/components/map/MapPoiPopup.tsx`
- `src/components/map/MapZoneCard.tsx`
  - `src/components/PrimaryButton.tsx`
  - `src/components/ExternalLink.tsx`
- `src/components/map/MapRoutePanel.tsx`
- `src/components/map/MapMotionConfig.tsx`
- `src/hooks/useUserLocation.ts`
- `src/utils/map/combinedRoute.ts`
  - `src/utils/map/externalRouting.ts`
  - `src/utils/map/fenceRouting.ts`
  - `src/utils/map/pathfinding.ts`
  - `src/utils/map/geo.ts`

## `/playlist` — Festival radio

Entry: `src/screens/PlaylistScreen.tsx`

- `src/components/ScreenTitle.tsx`
- `src/context/RadioPlayerContext.tsx`
  - `src/context/RadioAudioEngine.tsx`
  - `src/api/radioNowPlayingApi.ts`
  - `src/utils/matchRadioArtist.ts`
- `src/utils/festArtistImages.ts`
- `src/utils/headlinerHelpers.ts`
- `src/seo/syncWebSeo.ts`

## `/` — Festival home

Entry: `src/screens/FestivalHomeScreen.tsx`

- `src/components/FestivalLogoImage.tsx`
- `src/components/HeroBackgroundVideo.tsx`
- `src/components/CountdownTimer.tsx`
- `src/components/HomeHeadlinersWidget.tsx`
- `src/components/LiveArtistCard.tsx`
- `src/components/PrimaryButton.tsx`
- `src/components/SectionHeader.tsx`

## `/schedule`

Entry: `src/screens/ScheduleMainScreen.tsx`

- `src/components/ScheduleLiveView.tsx`
- `src/components/ScheduleDayView.tsx`
- `src/components/DateTabBar.tsx`
- `src/components/StageTabBar.tsx`
- `src/components/EventScheduleRow.tsx`
- `src/components/CurrentTimeLine.tsx`

## `/headliners`

Entry: `src/screens/HeadlinersScreen.tsx`

- `src/components/HeadlinerFilterBar.tsx`
- `src/components/HeadlinerCard.tsx`
- `src/components/CenteredHorizontalScroll.tsx`
- `src/components/ScreenTitle.tsx`
