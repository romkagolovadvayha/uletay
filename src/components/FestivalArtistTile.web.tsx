import React, { memo } from 'react';
import { ArtistImage } from './ArtistImage';
import { FavoriteBurst } from './FavoriteBurst';
export const FestivalArtistTile = memo(function FestivalArtistTile({id,name,imageUrl,alternateName,subtitle,onOpen,saved,onSave,badge,live}:{id:string;name:string;imageUrl?:string;alternateName?:string;subtitle?:string;onOpen:()=>void;saved?:boolean;onSave?:()=>void;badge?:string;live?:boolean}) {
  return <article className="fest-artist" data-artist-id={id}>
    <button type="button" className="fest-artist-open" title={name} aria-label={`Открыть артиста ${name}`} onClick={onOpen}>
      <div className="fest-artist-image"><ArtistImage imageUrl={imageUrl} artist={name} alt="" variant="card" style={{width:'100%',height:'100%'}}/></div>
      {badge?<span className="fest-artist-badge" data-live={live}>{badge}</span>:null}
      <div className="fest-artist-copy">{alternateName?<p className="fest-artist-alias">{alternateName}</p>:null}<h2>{name}</h2>{subtitle?<p className="fest-artist-genres">{subtitle}</p>:null}</div>
    </button>
    {onSave?<FavoriteBurst isFavorite={saved} onToggleFavorite={onSave} label={name}/>:null}
  </article>;
});
