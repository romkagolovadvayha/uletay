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
          properties?: Record<string, unknown>;
        };
      }
    | undefined;

  type YandexMapClickEvent = {
    coordinates?: YandexLngLat;
  };

  type YandexMapsModule = {
    ready: Promise<void>;
    import: {
      (pkg: string): Promise<Record<string, new (...args: unknown[]) => YandexMapEntity>>;
      registerCdn: (template: string, packages: string | string[]) => void;
    };
    YMap: new (
      container: HTMLElement,
      props: Record<string, unknown>,
      children?: YandexMapEntity[],
    ) => YandexMapInstance;
    YMapDefaultSchemeLayer: new (props?: Record<string, unknown>) => YandexMapEntity;
    YMapDefaultFeaturesLayer: new (props?: Record<string, unknown>) => YandexMapEntity;
    YMapFeature: new (props: Record<string, unknown>) => YandexMapEntity;
    YMapMarker: new (props: Record<string, unknown>, element?: HTMLElement) => YandexMapEntity;
    YMapListener: new (props: {
      layer?: string;
      onClick?: (object: YandexDomEventObject, event?: YandexMapClickEvent) => void;
    }) => YandexMapEntity;
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
