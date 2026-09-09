import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TICKET_VENDOR_URL } from '../constants/legal';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import {
  usePrimaryAutographSessions,
  useStagePrimaryPerformances,
} from '../hooks/useCurrentLivePerformance';
import { useDeferredHeroVideo } from '../hooks/useDeferredHeroVideo';
import { useNow } from '../hooks/useNow';
import {
  openHeadlinerDetail,
  openHeadlinersMain,
  openScheduleTabMain,
} from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { appFont, typography } from '../theme/typography';
import type { Headliner } from '../types';
import { filterHeadlinersByYear, getLatestHeadlinerYear } from '../utils/headlinerHelpers';
import { HERO_POSTER_SOURCE } from '../utils/heroPosterSource';
import {
  formatSoonCountdown,
  getStageName,
  isFestivalFinished,
  isFestivalStarted,
  isStartingSoon,
  parseDateTime,
} from '../utils/scheduleHelpers';
import { ArtistImage } from './ArtistImage';
import { AutographSessionRow } from './AutographSessionRow';
import { DeferredIonicons } from './DeferredIonicons';
import { ExternalLink } from './ExternalLink';
import { HeroBackgroundVideo } from './HeroBackgroundVideo';
import { LiveArtistCard } from './LiveArtistCard';
import { MotionPressable } from './MotionPressable';
import { SemanticHeading } from './SemanticHeading';
import { WebFestivalGuide } from './WebFestivalGuide';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'HomeTab'>;

type Props = {
  navigation: Navigation;
};

type QuickLinkProps = {
  eyebrow: string;
  icon: React.ComponentProps<typeof DeferredIonicons>['name'];
  title: string;
  description: string;
  onPress: () => void;
};

const springConfig = { damping: 18, stiffness: 150, mass: 0.7 };

function QuickLink({ eyebrow, icon, title, description, onPress }: QuickLinkProps) {
  const hover = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const motionStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, -8]) },
      { rotateX: `${reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, -3.5])}deg` },
      { scale: interpolate(hover.value, [0, 1], [1, 1.012]) },
    ],
  }));

  const setHover = (active: boolean) => {
    // Reanimated shared values are intentionally mutable animation handles.
    // eslint-disable-next-line react-hooks/immutability
    hover.value = withSpring(active ? 1 : 0, springConfig);
  };

  return (
    <Animated.View style={[styles.quickLinkMotion, motionStyle]}>
      <MotionPressable
        accessibilityRole="button"
        onPress={onPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={styles.quickLink}
      >
        <View style={styles.quickLinkTop}>
          <Text style={styles.quickEyebrow}>{eyebrow}</Text>
          <View style={styles.quickIcon}>
            <DeferredIonicons name={icon} size={19} color={colors.primary} />
          </View>
        </View>
        <View>
          <Text style={styles.quickTitle}>{title}</Text>
          <Text style={styles.quickDescription}>{description}</Text>
        </View>
      </MotionPressable>
    </Animated.View>
  );
}

type ArtistPosterProps = {
  headliner: Headliner;
  year: number;
  onPress: () => void;
};

function ArtistPoster({ headliner, year, onPress }: ArtistPosterProps) {
  const hover = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { translateY: reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, -12]) },
      { rotateX: `${reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, -2.4])}deg` },
      { rotateY: `${reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, 1.6])}deg` },
    ],
  }));
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : interpolate(hover.value, [0, 1], [1, 1.07]) }],
  }));

  const setHover = (active: boolean) => {
    // Reanimated shared values are intentionally mutable animation handles.
    // eslint-disable-next-line react-hooks/immutability
    hover.value = withTiming(active ? 1 : 0, {
      duration: active ? 420 : 260,
      easing: Easing.out(Easing.cubic),
    });
  };

  const genre = headliner.lastfm?.tags?.[0]?.name || headliner.description || 'Рок-сцена';

  return (
    <Animated.View style={[styles.artistCardMotion, cardStyle]}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть артиста ${headliner.name}`}
        onPress={onPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={styles.artistCard}
      >
        <View style={styles.artistImageCrop}>
          <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
            <ArtistImage
              imageUrl={headliner.imageUrl}
              artist={headliner.name}
              alt=""
              variant="hero"
              style={styles.artistImage}
            />
          </Animated.View>
          <LinearGradient
            colors={['rgba(9,11,9,0.03)', 'rgba(9,11,9,0.15)', 'rgba(9,11,9,0.94)']}
            locations={[0, 0.54, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.artistYearPill}>
            <Text style={styles.artistYearText}>АРХИВ {year}</Text>
          </View>
          <View style={styles.artistCopy}>
            <Text style={styles.artistName} numberOfLines={2}>{headliner.name}</Text>
            <Text style={styles.artistGenre} numberOfLines={1}>{genre}</Text>
          </View>
        </View>
      </MotionPressable>
    </Animated.View>
  );
}

type FestivalPassProps = {
  year: number;
  location: string;
  startDay: string;
  endDay: string;
  compact: boolean;
  pointerX: SharedValue<number>;
  pointerY: SharedValue<number>;
};

function FestivalPass({
  year,
  location,
  startDay,
  endDay,
  compact,
  pointerX,
  pointerY,
}: FestivalPassProps) {
  const float = useSharedValue(0);
  const orbit = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    float.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    orbit.value = withRepeat(
      withTiming(1, { duration: 16000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(float);
      cancelAnimation(orbit);
    };
  }, [float, orbit, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      { translateY: reduceMotion ? 0 : interpolate(float.value, [0, 1], [4, -9]) },
      { rotateX: `${reduceMotion ? 0 : pointerY.value * -8}deg` },
      { rotateY: `${reduceMotion ? 0 : pointerX.value * 11}deg` },
      { rotateZ: '-3deg' },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: reduceMotion ? 0 : pointerX.value * -18 },
      { translateY: reduceMotion ? 0 : pointerY.value * -12 },
      { rotateZ: '5deg' },
    ],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${reduceMotion ? 0 : orbit.value * 360}deg` }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pointerX.value * 68 },
      { translateY: pointerY.value * 48 },
      { rotateZ: '-28deg' },
    ],
  }));

  return (
    <View style={[styles.passScene, compact && styles.passSceneCompact]} pointerEvents="none">
      <Animated.View style={[styles.passOrbit, compact && styles.passOrbitCompact, orbitStyle]}>
        <View style={styles.orbitDot} />
      </Animated.View>
      <Animated.View style={[styles.passShadowCard, compact && styles.passCardCompact, shadowStyle]} />
      <Animated.View style={[styles.passCard, compact && styles.passCardCompact, cardStyle]}>
        <View style={styles.passTexture} />
        <Animated.View style={[styles.passShine, shineStyle]} />
        <View style={styles.passHeader}>
          <Text style={styles.passSerial}>FIELD PASS / 001</Text>
          <View style={styles.passLiveDot} />
        </View>
        <Image
          source={require('../../assets/images/festival-logo-2027.png')}
          style={[styles.passLogo, compact && styles.passLogoCompact]}
          contentFit="contain"
          priority="high"
          loading="eager"
          cachePolicy="memory-disk"
          transition={0}
          accessibilityLabel="Логотип фестиваля УЛЕТАЙ"
          alt="Логотип фестиваля УЛЕТАЙ"
        />
        <View style={styles.passDateRow}>
          <Text style={[styles.passDate, compact && styles.passDateCompact]}>{startDay}—{endDay}</Text>
          <View style={styles.passDateMeta}>
            <Text style={styles.passMonth}>ИЮЛЯ</Text>
            <Text style={styles.passYear}>{year}</Text>
          </View>
        </View>
        <View style={styles.passRule} />
        <Text style={styles.passLocation} numberOfLines={2}>{location}</Text>
        <View style={styles.passFooter}>
          <View style={styles.barcode}>
            {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2].map((width, index) => (
              <View key={index} style={[styles.barcodeLine, { width }]} />
            ))}
          </View>
          <Text style={styles.passAccess}>ALL DAYS</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function getDateParts(dateString: string) {
  const [, month = '07', day = '07'] = dateString.split('-');
  return { day: String(Number(day) || 7), month };
}

export function DesktopFestivalHome({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 1340;
  const { data, dataSource, error, isInitialLoading, lastFetchedAt } = useAppData();
  const now = useNow(1000);
  const allowHeroVideo = useDeferredHeroVideo();
  const stagePrimaries = useStagePrimaryPerformances();
  const autographPrimaries = usePrimaryAutographSessions(3);
  const { isAutographFavorite, toggleAutographFavorite } = useFavorites();
  const [videoReady, setVideoReady] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const heroSize = useRef({ width: 1, height: 1 });
  const pointerX = useSharedValue(0);
  const pointerY = useSharedValue(0);

  const festivalStarted = isFestivalStarted(data.festival.startDate, now);
  const festivalPhase = !festivalStarted
    ? 'before'
    : isFestivalFinished(data.festival.startDate, data.festival.endDate, data.schedule, now)
      ? 'after'
      : 'during';
  const latestHeadlinerYear = useMemo(
    () => getLatestHeadlinerYear(data.headliners),
    [data.headliners],
  );
  const featuredHeadliners = useMemo(
    () => latestHeadlinerYear == null
      ? []
      : filterHeadlinersByYear(data.headliners, latestHeadlinerYear).slice(0, 4),
    [data.headliners, latestHeadlinerYear],
  );
  const startDate = getDateParts(data.festival.startDate);
  const endDate = getDateParts(data.festival.endDate);
  const offlineStatus = error
    ? dataSource === 'cache'
      ? `Показана сохранённая версия${lastFetchedAt ? ` от ${new Date(lastFetchedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}.`
      : 'Данные временно недоступны.'
    : null;
  const hasReliableFestivalData = Boolean(
    data.festival.startDate && data.festival.endDate && data.festival.year,
  );
  const showLiveSection = hasReliableFestivalData && festivalPhase === 'during';
  const hasAnyLive = stagePrimaries.some((item) => item.status === 'live');
  const hasAnySoon = stagePrimaries.some(
    (item) => item.status === 'upcoming' && isStartingSoon(item.performance.date, item.performance.startTime, now),
  );
  const liveSectionTitle = hasAnyLive
    ? 'СЕЙЧАС НА СЦЕНАХ'
    : hasAnySoon
      ? 'СКОРО НА СЦЕНАХ'
      : 'СЛЕДУЮЩИЕ ВЫСТУПЛЕНИЯ';

  const backgroundStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.055 },
      { translateX: pointerX.value * -10 },
      { translateY: pointerY.value * -7 },
    ],
  }));

  const handleHeroLayout = (event: LayoutChangeEvent) => {
    heroSize.current = event.nativeEvent.layout;
  };
  const handlePointerMove = (event: any) => {
    const nativeEvent = event.nativeEvent ?? event;
    const bounds = event.currentTarget?.getBoundingClientRect?.();
    const clientX = nativeEvent.clientX ?? nativeEvent.pageX;
    const clientY = nativeEvent.clientY ?? nativeEvent.pageY;
    const locationX = bounds && Number.isFinite(clientX)
      ? clientX - bounds.left
      : (nativeEvent.locationX ?? heroSize.current.width / 2);
    const locationY = bounds && Number.isFinite(clientY)
      ? clientY - bounds.top
      : (nativeEvent.locationY ?? heroSize.current.height / 2);
    const nextX = Math.max(-1, Math.min(1, locationX / heroSize.current.width * 2 - 1));
    const nextY = Math.max(-1, Math.min(1, locationY / heroSize.current.height * 2 - 1));
    pointerX.value = withSpring(nextX, springConfig);
    pointerY.value = withSpring(nextY, springConfig);
  };
  const resetPointer = () => {
    pointerX.value = withSpring(0, springConfig);
    pointerY.value = withSpring(0, springConfig);
  };

  const openHeadliners = useCallback(() => openHeadlinersMain(navigation), [navigation]);
  const openHeadliner = useCallback(
    (id: string) => openHeadlinerDetail(navigation, id),
    [navigation],
  );

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loader}>
          <View style={styles.loaderMark}><Text style={styles.loaderMarkText}>У</Text></View>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.loaderText}>СОБИРАЕМ ФЕСТИВАЛЬ</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View
            style={[styles.hero, compact && styles.heroCompact]}
            onLayout={handleHeroLayout}
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
          >
            <Animated.View style={[styles.heroMedia, backgroundStyle]} pointerEvents="none">
              <Image
                source={HERO_POSTER_SOURCE}
                style={styles.heroImage}
                contentFit="cover"
                contentPosition="center"
                priority="high"
                loading="eager"
                accessibilityLabel=""
                alt=""
                onLoad={() => setPosterReady(true)}
              />
              {allowHeroVideo && posterReady ? (
                <View style={[StyleSheet.absoluteFill, !videoReady && styles.videoHidden]}>
                  <Suspense fallback={null}>
                    <HeroBackgroundVideo onReady={() => setVideoReady(true)} />
                  </Suspense>
                </View>
              ) : null}
            </Animated.View>
            <LinearGradient
              colors={[
                'rgba(8,10,8,0.93)',
                'rgba(8,10,8,0.66)',
                'rgba(8,10,8,0.18)',
                'rgba(8,10,8,0.74)',
              ]}
              locations={[0, 0.42, 0.7, 1]}
              start={{ x: 0, y: 0.35 }}
              end={{ x: 1, y: 0.7 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(255,193,7,0.11)', 'rgba(255,193,7,0)', 'rgba(255,119,77,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.94)']}
              locations={[0, 0.45, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroGrid} pointerEvents="none" />

            <View style={styles.utilityBar}>
              <View style={styles.utilityItem}>
                <View style={styles.statusDot} />
                <Text style={styles.utilityText}>{data.festival.locationShort || data.festival.location}</Text>
              </View>
              <View style={styles.utilityLine} />
              <Text style={styles.utilityText}>{startDate.day}—{endDate.day} ИЮЛЯ / {data.festival.year}</Text>
              {offlineStatus ? (
                <>
                  <View style={styles.utilityLine} />
                  <Text style={styles.utilityCacheText} numberOfLines={1}>{offlineStatus}</Text>
                </>
              ) : null}
              <View style={styles.utilitySpacer} />
              <View style={styles.utilityItem}>
                <DeferredIonicons name="cloud-done-outline" size={15} color="#B9E6C0" />
                <Text style={styles.utilityOnline}>ГИД ДОСТУПЕН ОФЛАЙН</Text>
              </View>
            </View>

            <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
              <View style={styles.heroEyebrowRow}>
                <View style={styles.heroEyebrowLine} />
                <Text style={styles.heroEyebrow}>ФЕСТИВАЛЬ УЛЕТАЙ {data.festival.year}</Text>
              </View>
              <SemanticHeading level={1} style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
                ГРОМЧЕ НЕБА.{`\n`}БЛИЖЕ К СВОИМ.
              </SemanticHeading>
              <Text style={styles.heroLead}>
                Пять дней живой музыки, большого поля и людей,{`\n`}с которыми хочется встретить рассвет.
              </Text>
              <View style={styles.heroActions}>
                {festivalPhase === 'before' ? (
                  <ExternalLink
                    href={TICKET_VENDOR_URL}
                    accessibilityLabel="Купить билет на фестиваль"
                    style={styles.primaryCta}
                  >
                    <Text style={styles.primaryCtaText}>ХОЧУ НА УЛЕТАЙ</Text>
                  </ExternalLink>
                ) : (
                  <MotionPressable
                    onPress={() => openScheduleTabMain(navigation)}
                    style={styles.primaryCta}
                  >
                    <Text style={styles.primaryCtaText}>СМОТРЕТЬ ПРОГРАММУ</Text>
                  </MotionPressable>
                )}
                <MotionPressable
                  onPress={() => navigation.navigate('MapTab')}
                  style={styles.secondaryCta}
                >
                  <DeferredIonicons name="map-outline" size={18} color={colors.text} />
                  <Text style={styles.secondaryCtaText}>КАРТА ПОЛЯ</Text>
                </MotionPressable>
              </View>
            </View>

            <FestivalPass
              year={data.festival.year}
              location={data.festival.locationShort || data.festival.location}
              startDay={startDate.day}
              endDay={endDate.day}
              compact={compact}
              pointerX={pointerX}
              pointerY={pointerY}
            />

          </View>

          <View style={styles.contentPage}>
            <View style={styles.quickLinks}>
            <QuickLink
              eyebrow="01 / НЕ ПРОПУСТИТЬ"
              icon="calendar-outline"
              title="Программа"
              description="Все дни, сцены и выступления"
              onPress={() => openScheduleTabMain(navigation)}
            />
            <QuickLink
              eyebrow="02 / НЕ ЗАБЛУДИТЬСЯ"
              icon="map-outline"
              title="Карта поля"
              description="Сцены, вода, кемпинг и маршруты"
              onPress={() => navigation.navigate('MapTab')}
            />
            <QuickLink
              eyebrow="03 / БЫТЬ ГОТОВЫМ"
              icon="compass-outline"
              title="Гид к поездке"
              description="Правила, вещи и важные контакты"
              onPress={() => navigation.navigate('MoreTab', { screen: 'FestivalRules' })}
            />
            </View>

            {showLiveSection ? (
              <View style={styles.contentSection}>
              <View style={styles.sectionHeadingRow}>
                <View>
                  <Text style={styles.sectionKicker}>ПРЯМО СЕЙЧАС</Text>
                  <SemanticHeading level={2} style={styles.sectionTitle}>{liveSectionTitle}</SemanticHeading>
                </View>
                <MotionPressable onPress={() => openScheduleTabMain(navigation)} style={styles.textLink}>
                  <Text style={styles.textLinkText}>ПОЛНАЯ ПРОГРАММА</Text>
                </MotionPressable>
              </View>
              <View style={styles.liveGrid}>
                {stagePrimaries.map((item) => (
                  <LiveArtistCard
                    key={item.performance.id}
                    performance={item.performance}
                    stageName={getStageName(item.performance.stageId, data.stages)}
                    status={item.status}
                    now={now}
                    style={styles.liveCard}
                    onPress={() => navigation.navigate('ScheduleTab', {
                      screen: 'LiveDetail',
                      params: { performanceId: item.performance.id },
                    })}
                  />
                ))}
              </View>
              {autographPrimaries.length > 0 ? (
                <View style={styles.autographDesktopList}>
                  {autographPrimaries.map((item) => {
                    const soon = item.status === 'upcoming'
                      && isStartingSoon(item.session.date, item.session.startTime, now);
                    return (
                      <AutographSessionRow
                        key={item.session.id}
                        session={item.session}
                        isLive={item.status === 'live'}
                        isUpcoming={soon}
                        soonCountdown={soon ? formatSoonCountdown(parseDateTime(item.session.date, item.session.startTime), now) : undefined}
                        isFavorite={isAutographFavorite(item.session.id)}
                        onToggleFavorite={() => toggleAutographFavorite(item.session.id)}
                        onPress={() => navigation.navigate('Autographs', {
                          screen: 'AutographDetail',
                          params: { sessionId: item.session.id },
                        })}
                      />
                    );
                  })}
                </View>
              ) : null}
              </View>
            ) : null}

            {featuredHeadliners.length > 0 && latestHeadlinerYear != null ? (
              <View style={styles.contentSection}>
              <View style={styles.sectionHeadingRow}>
                <View>
                  <Text style={styles.sectionKicker}>ГОЛОСА, КОТОРЫЕ МЫ ПОМНИМ</Text>
                  <SemanticHeading level={2} style={styles.sectionTitle}>ОНИ УЖЕ БЫЛИ С НАМИ</SemanticHeading>
                  <Text style={styles.sectionSubtitle}>Архив {latestHeadlinerYear}. Новый лайнап объявим позже.</Text>
                </View>
                <MotionPressable onPress={openHeadliners} style={styles.textLink}>
                  <Text style={styles.textLinkText}>ВСЕ АРТИСТЫ</Text>
                </MotionPressable>
              </View>
              <View style={styles.artistGrid}>
                {featuredHeadliners.map((headliner) => (
                  <ArtistPoster
                    key={headliner.id}
                    headliner={headliner}
                    year={latestHeadlinerYear}
                    onPress={() => openHeadliner(headliner.id)}
                  />
                ))}
              </View>
              </View>
            ) : null}

            <View style={styles.guideWrap}>
              <WebFestivalGuide
                festival={data.festival}
                onOpenSchedule={() => openScheduleTabMain(navigation)}
                onOpenMap={() => navigation.navigate('MapTab')}
                onOpenRules={() => navigation.navigate('MoreTab', { screen: 'FestivalRules' })}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerLogo}>УЛЕТАЙ</Text>
              <Text style={styles.footerLine}>МУЗЫКА. ЛЮДИ. СВОБОДА.</Text>
              <View style={styles.footerSpacer} />
              <Text style={styles.footerMeta}>ЛАГУНОВО, УДМУРТИЯ / {data.festival.year}</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0D0B' },
  scrollContent: { paddingBottom: 0 },
  page: { width: '100%' },
  contentPage: { paddingHorizontal: 34 },
  loader: { flex: 1, minHeight: 600, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loaderMark: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotateZ: '-7deg' }] },
  loaderMarkText: { ...appFont('black'), color: '#0B0D0B', fontSize: 32 },
  loaderText: { ...typography.caption, color: colors.textSecondary, letterSpacing: 2 },
  utilityBar: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 6, minHeight: 58, paddingHorizontal: 34, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,193,7,0.13)' },
  utilityItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  utilityLine: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  utilityText: { ...appFont('semiBold'), color: '#D1D4CB', fontSize: 10, letterSpacing: 1.25, textTransform: 'uppercase' },
  utilityCacheText: { ...appFont('medium'), color: '#A8ADA2', fontSize: 9, letterSpacing: 0.35, flexShrink: 1 },
  utilityOnline: { ...appFont('semiBold'), color: '#B9E6C0', fontSize: 10, letterSpacing: 1.15 },
  utilitySpacer: { flex: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, boxShadow: `0 0 12px ${colors.primary}` },
  hero: { position: 'relative', minHeight: 680, overflow: 'hidden', backgroundColor: '#11130F' },
  heroCompact: { minHeight: 620 },
  heroMedia: { ...StyleSheet.absoluteFill },
  heroImage: { width: '100%', height: '100%' },
  videoHidden: { opacity: 0 },
  heroGrid: { ...StyleSheet.absoluteFill, opacity: 0.18, backgroundImage: 'linear-gradient(rgba(255,193,7,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,193,7,.1) 1px, transparent 1px)', backgroundSize: '64px 64px' } as ViewStyle,
  heroCopy: { position: 'absolute', left: 88, top: 146, width: '55%', maxWidth: 650, zIndex: 4 },
  heroCopyCompact: { left: 74, top: 132, width: '59%' },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  heroEyebrowLine: { width: 38, height: 2, backgroundColor: colors.primary },
  heroEyebrow: { ...appFont('bold'), color: colors.primary, fontSize: 11, letterSpacing: 2 },
  heroTitle: { ...appFont('black'), color: '#F5F5EB', fontSize: 68, lineHeight: 70, letterSpacing: -3.2, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 22 },
  heroTitleCompact: { fontSize: 53, lineHeight: 56, letterSpacing: -2.2 },
  heroLead: { ...appFont('medium'), color: '#E6E8DF', fontSize: 16, lineHeight: 25, marginTop: 64 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 },
  primaryCta: { minHeight: 58, paddingHorizontal: 22, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, boxShadow: '0 14px 35px rgba(255,193,7,0.18)' },
  primaryCtaText: { ...appFont('black'), color: colors.primaryText, fontSize: 13, letterSpacing: 0.25 },
  secondaryCta: { minHeight: 58, paddingHorizontal: 19, borderRadius: 12, backgroundColor: 'rgba(16,18,15,0.72)', flexDirection: 'row', alignItems: 'center', gap: 9, backdropFilter: 'blur(12px)' } as ViewStyle,
  secondaryCtaText: { ...appFont('bold'), color: colors.text, fontSize: 11, letterSpacing: 0.7 },
  passScene: { position: 'absolute', right: 76, top: 90, width: 410, height: 500, zIndex: 3, alignItems: 'center', justifyContent: 'center' },
  passSceneCompact: { right: 52, top: 100, width: 300, height: 390 },
  passCard: { position: 'absolute', width: 350, height: 440, padding: 24, borderRadius: 28, overflow: 'hidden', backgroundColor: 'rgba(19,21,17,0.92)', boxShadow: '0 35px 75px rgba(0,0,0,0.56)' },
  passCardCompact: { width: 270, height: 340, padding: 18, borderRadius: 22 },
  passShadowCard: { position: 'absolute', width: 350, height: 440, borderRadius: 28, backgroundColor: 'rgba(255,193,7,0.11)' },
  passTexture: { ...StyleSheet.absoluteFill, opacity: 0.4, backgroundImage: 'radial-gradient(circle at 25% 10%, rgba(255,193,7,.20), transparent 32%), linear-gradient(140deg, rgba(255,255,255,.04), transparent 45%)' } as ViewStyle,
  passShine: { position: 'absolute', width: 90, height: 470, top: -60, left: 78, backgroundColor: 'rgba(255,255,255,0.055)' },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passSerial: { ...appFont('semiBold'), color: '#D6D9CF', fontSize: 8, letterSpacing: 1.2 },
  passLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, boxShadow: `0 0 10px ${colors.primary}` },
  passLogo: { width: 260, height: 125, marginTop: 12, alignSelf: 'center' },
  passLogoCompact: { width: 190, height: 82, marginTop: 6 },
  passDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 34 },
  passDate: { ...appFont('black'), color: '#F7F7EE', fontSize: 54, lineHeight: 57, letterSpacing: -3 },
  passDateCompact: { fontSize: 42, lineHeight: 44, letterSpacing: -2.2 },
  passDateMeta: { alignItems: 'flex-end' },
  passMonth: { ...appFont('bold'), color: colors.primary, fontSize: 9, letterSpacing: 1.4 },
  passYear: { ...appFont('black'), color: colors.text, fontSize: 17 },
  passRule: { height: 1, backgroundColor: 'rgba(255,193,7,0.28)', marginVertical: 13 },
  passLocation: { ...appFont('bold'), color: '#E1E3DA', fontSize: 10, lineHeight: 15, letterSpacing: 0.8, textTransform: 'uppercase' },
  passFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barcode: { height: 28, flexDirection: 'row', alignItems: 'stretch', gap: 3 },
  barcodeLine: { height: '100%', backgroundColor: '#FFC107' },
  passAccess: { ...appFont('black'), color: colors.primary, fontSize: 10, letterSpacing: 1.2 },
  passOrbit: { position: 'absolute', width: 480, height: 480, borderRadius: 240 },
  passOrbitCompact: { width: 350, height: 350, borderRadius: 175 },
  orbitDot: { position: 'absolute', width: 11, height: 11, borderRadius: 6, top: 35, right: 57, backgroundColor: '#FF774D', boxShadow: '0 0 22px rgba(255,119,77,.9)' },
  quickLinks: { flexDirection: 'row', gap: 14, paddingVertical: 18 },
  quickLinkMotion: { flex: 1 },
  quickLink: { minHeight: 172, padding: 20, borderRadius: 17, backgroundColor: '#171A16', justifyContent: 'space-between', boxShadow: '0 18px 44px rgba(0,0,0,0.2)' },
  quickLinkTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickEyebrow: { ...appFont('semiBold'), color: '#7F8579', fontSize: 8, letterSpacing: 1.1 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,193,7,0.08)' },
  quickTitle: { ...appFont('bold'), color: '#F1F2EA', fontSize: 20, letterSpacing: -0.45 },
  quickDescription: { ...appFont('medium'), color: '#9FA49A', fontSize: 11, lineHeight: 17, marginTop: 6 },
  contentSection: { paddingVertical: 52, borderTopWidth: 1, borderTopColor: '#2A2D27' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 27 },
  sectionKicker: { ...appFont('bold'), color: colors.primary, fontSize: 9, letterSpacing: 1.7, marginBottom: 9 },
  sectionTitle: { ...appFont('black'), color: '#F3F4EC', fontSize: 32, lineHeight: 37, letterSpacing: -1, textTransform: 'uppercase' },
  sectionSubtitle: { ...appFont('medium'), color: '#92978D', fontSize: 12, marginTop: 8 },
  textLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  textLinkText: { ...appFont('bold'), color: '#E7E9E0', fontSize: 10, letterSpacing: 1 },
  artistGrid: { flexDirection: 'row', gap: 15 },
  artistCardMotion: { flex: 1, minWidth: 0 },
  artistCard: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#171916', boxShadow: '0 24px 55px rgba(0,0,0,0.32)' },
  artistImageCrop: { position: 'relative', height: 340, overflow: 'hidden', borderRadius: 18 },
  artistImage: { width: '100%', height: '100%' },
  artistYearPill: { position: 'absolute', top: 15, left: 15, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 7, backgroundColor: 'rgba(11,13,11,0.72)' },
  artistYearText: { ...appFont('bold'), color: '#ECEEE5', fontSize: 8, letterSpacing: 1 },
  artistCopy: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  artistName: { ...appFont('black'), color: '#FAFAF2', fontSize: 19, lineHeight: 23, textTransform: 'uppercase' },
  artistGenre: { ...appFont('medium'), color: '#B3B8AD', fontSize: 10, marginTop: 6, textTransform: 'capitalize' },
  liveGrid: { flexDirection: 'row', gap: 12 },
  liveCard: { flex: 1, minWidth: 0, backgroundColor: '#171916' },
  autographDesktopList: { marginTop: 16, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#171916' },
  guideWrap: { paddingVertical: 36, borderTopWidth: 1, borderTopColor: '#2A2D27' },
  footer: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: '#2A2D27' },
  footerLogo: { ...appFont('black'), color: colors.primary, fontSize: 22, letterSpacing: -0.6 },
  footerLine: { ...appFont('bold'), color: '#7E8379', fontSize: 8, letterSpacing: 1.4 },
  footerSpacer: { flex: 1 },
  footerMeta: { ...appFont('semiBold'), color: '#8F9489', fontSize: 9, letterSpacing: 1 },
});
