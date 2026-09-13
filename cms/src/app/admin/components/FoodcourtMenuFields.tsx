'use client';

import { useState } from 'react';
import type { FoodCourtMenuSection } from '@/types';
import { useEditorChange } from './EditorForm';

export function FoodcourtMenuFields({
  initialMenu = [],
}: {
  initialMenu?: FoodCourtMenuSection[];
}) {
  const [sections, setSections] = useState(initialMenu);
  const markDirty = useEditorChange();
  function update(next: FoodCourtMenuSection[]) {
    setSections(next);
    markDirty();
  }
  return (
    <div className="menu-editor">
      <input type="hidden" name="menuJson" value={JSON.stringify(sections)} />
      <div className="panel-heading">
        <div>
          <h2>Меню и цены</h2>
          <p>Добавьте разделы и блюда — они появятся в карточке точки.</p>
        </div>
      </div>
      {!sections.length && (
        <p className="hint">
          Меню пока не добавлено. Например, создайте раздел «Горячее» или «Напитки».
        </p>
      )}
      {sections.map((section, sectionIndex) => (
        <fieldset className="menu-section" key={sectionIndex}>
          <legend>Раздел {sectionIndex + 1}</legend>
          <div className="menu-section-heading">
            <label>
              Название раздела
              <input
                value={section.title}
                required
                maxLength={120}
                onChange={(event) =>
                  update(
                    sections.map((item, index) =>
                      index === sectionIndex ? { ...item, title: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Напитки"
              />
            </label>
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={() => {
                if (confirm(`Удалить раздел «${section.title || sectionIndex + 1}» и его блюда?`))
                  update(sections.filter((_, index) => index !== sectionIndex));
              }}
            >
              Удалить раздел
            </button>
          </div>
          {section.items.map((item, itemIndex) => (
            <div className="menu-item" key={itemIndex}>
              {(
                [
                  { key: 'name', label: 'Блюдо', placeholder: 'Лимонад', max: 200 },
                  { key: 'price', label: 'Цена', placeholder: '200 ₽', max: 80 },
                  { key: 'portion', label: 'Порция', placeholder: '300 мл', max: 120 },
                  {
                    key: 'description',
                    label: 'Описание',
                    placeholder: 'Состав или особенности',
                    max: 500,
                  },
                ] as const
              ).map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    value={item[field.key] ?? ''}
                    required={field.key === 'name' || field.key === 'price'}
                    maxLength={field.max}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      update(
                        sections.map((entry, index) =>
                          index !== sectionIndex
                            ? entry
                            : {
                                ...entry,
                                items: entry.items.map((row, rowIndex) =>
                                  rowIndex !== itemIndex
                                    ? row
                                    : { ...row, [field.key]: event.target.value },
                                ),
                              },
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="btn-danger btn-sm"
                aria-label={`Удалить блюдо ${item.name || itemIndex + 1}`}
                disabled={section.items.length <= 1}
                onClick={() =>
                  update(
                    sections.map((entry, index) =>
                      index !== sectionIndex
                        ? entry
                        : {
                            ...entry,
                            items: entry.items.filter((_, rowIndex) => rowIndex !== itemIndex),
                          },
                    ),
                  )
                }
              >
                Удалить
              </button>
            </div>
          ))}
          {!section.items.length && (
            <p className="hint">Добавьте хотя бы одно блюдо или удалите пустой раздел.</p>
          )}
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={section.items.length >= 100}
            onClick={() =>
              update(
                sections.map((entry, index) =>
                  index !== sectionIndex
                    ? entry
                    : { ...entry, items: [...entry.items, { name: '', price: '' }] },
                ),
              )
            }
          >
            + Добавить блюдо
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn-secondary"
        disabled={sections.length >= 30}
        onClick={() => update([...sections, { title: '', items: [{ name: '', price: '' }] }])}
      >
        + Добавить раздел меню
      </button>
    </div>
  );
}
