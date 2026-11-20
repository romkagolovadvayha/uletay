import React from 'react';

export function ArtistParticipationYears({ years, currentYear }: { years: number[]; currentYear: number }) {
  return <ul className="fest-years-grid" aria-label="Годы участия артиста">
    {years.map(year => <li key={year} className="fest-year-text" data-current={year === currentYear} aria-label={`Улетай ${year}${year === currentYear ? ', заявлен в лайн-ап' : ''}`}>
      <span>{year}</span>
    </li>)}
  </ul>;
}
