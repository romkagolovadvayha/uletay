import { resolveAdminImageSrc } from '@/lib/resolve-admin-image';

type Props = {
  imageUrl?: string | null;
  artist?: string | null;
  alt: string;
  className?: string;
};

export function AdminImageThumb({ imageUrl, artist, alt, className }: Props) {
  const src = resolveAdminImageSrc(imageUrl, artist);
  if (!src) return <>—</>;
  return <img className={className} src={src} alt={alt} />;
}

export function AdminImagePreview({
  imageUrl,
  artist,
  alt,
  className,
}: Props) {
  const src = resolveAdminImageSrc(imageUrl, artist);
  if (!src) return null;
  return <img className={className} src={src} alt={alt} />;
}
