export {};

declare global {
  type YandexLngLat = [number, number];
  type YandexLngLatBounds = [YandexLngLat, YandexLngLat];

  type YandexMapEntity = {
    update?: (props: Record<string, unknown>) => void;
  };

  type YandexDomEventObject =
    | {
        type: 'marker' | 'feature';
        entity?: {
          id?: string;
          properties?: Record<string, unknown>;
        };
      }
    | undefined;

  type YandexMapsModule = {
    ready: Promise<void>;
    import: {
      (pkg: string): Promise<Record<string, new (...args: unknown[]) => YandexMapEntity>>;
      registerCdn: (template: string, packages: string[]) => void;
    };
    YMap: new (
      container: HTMLElement,
      props: Record<string, unknown>,
      children?: YandexMapEntity[],
    ) => YandexMapInstance;
    YMapDefaultSchemeLayer: new (props?: Record<string, unknown>) => YandexMapEntity;
    YMapDefaultFeaturesLayer: new (props?: Record<string, unknown>) => YandexMapEntity;
    YMapFeatureDataSource: new (props: { id: string }) => YandexMapEntity;
    YMapLayer: new (props: {
      source: string;
      type: 'features' | 'markers' | 'tiles';
      zIndex: number;
    }) => YandexMapEntity;
    YMapFeature: new (props: Record<string, unknown>) => YandexMapEntity;
    YMapMarker: new (props: Record<string, unknown>, element?: HTMLElement) => YandexMapEntity;
    YMapListener: new (props: Record<string, unknown>) => YandexMapEntity;
  };

  type YandexMapInstance = YandexMapEntity & {
    addChild: (child: YandexMapEntity) => void;
    removeChild: (child: YandexMapEntity) => void;
    destroy?: () => void;
  };

  interface Window {
    ymaps3?: YandexMapsModule;
  }
}
