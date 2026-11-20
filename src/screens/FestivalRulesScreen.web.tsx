import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FestivalCarousel } from '../components/FestivalControls.web';
import { FestivalIcon } from '../components/FestivalIcon.web';
import { isExternalLinkVisible } from '../components/ExternalLink';
import { useAppData } from '../context/DataContext';
import type { MoreStackParamList } from '../navigation/types';
import type { FestivalRulesBlock } from '../types';

type Props = NativeStackScreenProps<MoreStackParamList, 'FestivalRules'>;

function RulesBlock({ block }: { block: FestivalRulesBlock }) {
  const title = block.title?.trim();
  const paragraphs = block.paragraphs?.filter(item => item.trim()) ?? [];
  const items = block.items?.filter(item => item.trim()) ?? [];
  const link = block.link?.label.trim() && block.link.url.trim() && isExternalLinkVisible(block.link.url)
    ? block.link : undefined;
  if (!title && !paragraphs.length && !items.length && !link) return null;
  return <article className="fest-rule-card" data-important={block.important || undefined}>
    {title ? <h2>{title}</h2> : null}
    {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {items.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
    {link ? <a className="fest-button" href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<FestivalIcon name="external" size={18}/></a> : null}
  </article>;
}

export function FestivalRulesScreen({ navigation }: Props) {
  const { data } = useAppData();
  const [selected, setSelected] = useState(data.rules[0]?.id ?? '');
  const active = data.rules.find(tab => tab.id === selected) ?? data.rules[0];
  return <section className="fest-screen fest-rules-screen" aria-labelledby="festival-rules-title">
    <div className="fest-inner">
      <header className="fest-compact-heading">
        <button className="fest-icon" type="button" aria-label="Назад" onClick={() => navigation.goBack()}><FestivalIcon name="back"/></button>
        <h1 id="festival-rules-title">Правила и быт</h1>
      </header>
      {active ? <>
        <FestivalCarousel label="Категории правил" items={data.rules} value={active.id} onChange={setSelected}/>
        <div className="fest-rules-content" key={active.id} aria-label={active.label}>
          {active.blocks.length ? active.blocks.map((block, index) => <RulesBlock key={index} block={block}/>) : <p className="fest-muted">Раздел пока не заполнен</p>}
        </div>
      </> : <p className="fest-muted">Раздел пока не заполнен</p>}
    </div>
  </section>;
}
