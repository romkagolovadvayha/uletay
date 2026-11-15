import React, { useMemo, useState } from 'react';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { APP_DOWNLOAD_CSS, APP_DOWNLOAD_SUBTITLE, APP_DOWNLOAD_TITLE, APP_STORES, APP_STORE_UNAVAILABLE } from '../constants/appDownload';
import { CountdownTimer } from '../components/CountdownTimer';
import { useAppData } from '../context/DataContext';
import { parseDateTime } from '../utils/scheduleHelpers';
import { LiquidDialog } from '../components/LiquidDialog';
import { lazyScreen } from '../navigation/lazyScreen';
import type { RootTabParamList } from '../navigation/types';

// Enabled only when building a local preview of the app's mobile home screen.
const AppHomePreview = process.env.EXPO_PUBLIC_PREVIEW_APP_HOME === '1'
  ? lazyScreen(() => import('./FestivalHomeContent').then((module) => module.FestivalHomeMobile))
  : null;

export function FestivalHomeScreen(props: { navigation: BottomTabNavigationProp<RootTabParamList, 'HomeTab'> }) {
  if (AppHomePreview) return <AppHomePreview {...props} showWebGuide={false} />;
  return <AppDownloadHome />;
}

function AppDownloadHome() {
  const { data } = useAppData();
  const [storeNotice, setStoreNotice] = useState(false);
  const festivalStart = useMemo(() => parseDateTime(data.festival.startDate, '12:00'), [data.festival.startDate]);
  return (
    <section className="app-download" aria-labelledby="app-download-title">
      <style>{APP_DOWNLOAD_CSS}</style>
      <div className="app-download__content">
        <h1 id="app-download-title">{APP_DOWNLOAD_TITLE}</h1>
        <div className="app-download__countdown">
          <CountdownTimer targetDate={festivalStart} festivalStartDate={data.festival.startDate}
            festivalEndDate={data.festival.endDate} performances={data.schedule} compact />
        </div>
        <p className="app-download__subtitle">{APP_DOWNLOAD_SUBTITLE}</p>
        <div className="app-download__stores">
          {APP_STORES.map((store) => {
            const content = <>
              <img className="app-download__logo" src={store.image} alt="" width={32} height={32} draggable={false} />
              <span className="app-download__store-name">{store.name}</span>
              <span className="app-download__chevron" aria-hidden="true" />
            </>;
            return store.href ? (
              <a className="app-download__store" key={store.name} href={store.href} target="_self"
                aria-label={`Скачать Улетай в ${store.name}`}>{content}</a>
            ) : (
              <button className="app-download__store" key={store.name} type="button" aria-haspopup="dialog"
                aria-controls="app-store-availability" onClick={() => setStoreNotice(true)}>{content}</button>
            );
          })}
        </div>
      </div>
      <LiquidDialog open={storeNotice} onClose={() => setStoreNotice(false)} id="app-store-availability"
        title="Скоро в App Store" description={APP_STORE_UNAVAILABLE}
        actions={[{ label: 'Понятно', tone: 'primary', onPress: () => setStoreNotice(false) }]} />
    </section>
  );
}
