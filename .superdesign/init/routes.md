# Route map

Routing uses React Navigation 7 with URL linking from `src/navigation/linking.ts`.

| Public path | Navigation route | Screen |
| --- | --- | --- |
| `/` | `HomeTab` | `src/screens/FestivalHomeScreen.tsx` |
| `/map/:poiId?` | `MapTab` | `src/screens/FestivalMapScreen.tsx` |
| `/schedule` | `ScheduleTab/ScheduleMain` | `src/screens/ScheduleMainScreen.tsx` |
| `/schedule/live/:performanceId` | `ScheduleTab/LiveDetail` | `src/screens/LiveDetailScreen.tsx` |
| `/schedule/full/:stageId?` | `ScheduleTab/FullSchedule` | `src/screens/FullScheduleScreen.tsx` |
| `/autographs` | `Autographs/AutographsMain` | `src/screens/AutographsScreen.tsx` |
| `/autographs/:sessionId` | `Autographs/AutographDetail` | `src/screens/AutographDetailScreen.tsx` |
| `/favorites` | `FavoritesTab` | `src/screens/MyScheduleScreen.tsx` |
| `/playlist` | `PlaylistTab` | `src/screens/PlaylistScreen.tsx` |
| `/headliners` | active headliner stack | `src/screens/HeadlinersScreen.tsx` |
| `/headliners/:headlinerId` | active headliner stack/detail | `src/screens/HeadlinerDetailScreen.tsx` |
| `/foodcourt` | `MoreTab/FoodCourtMain` | `src/screens/FoodCourtScreen.tsx` |
| `/foodcourt/:vendorId` | `MoreTab/FoodCourtDetail` | `src/screens/FoodCourtDetailScreen.tsx` |
| `/about` | `MoreTab/FestivalAbout` | `src/screens/FestivalAboutScreen.tsx` |
| `/rules` | `MoreTab/FestivalRules` | `src/screens/FestivalRulesScreen.tsx` |
| `/settings` | `MoreTab/Settings` | `src/screens/SettingsScreen.tsx` |
| `/legal` | `MoreTab/Legal` | `src/screens/LegalScreen.tsx` |

Known current defect: `src/navigation/linking.ts` registers the same
`headliners/:headlinerId` pattern under both `HeadlinersTab` and `MoreTab`.
React Navigation rejects the configuration and the web app renders a blank page.
