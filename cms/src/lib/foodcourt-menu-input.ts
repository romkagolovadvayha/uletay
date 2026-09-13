import type { FoodCourtMenuSection } from '@/types';

export function parseFoodcourtMenu(raw: string): FoodCourtMenuSection[] {
  if (raw.length > 100_000)
    throw new Error('Меню слишком большое. Разделите его на несколько разделов.');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Не удалось прочитать меню. Обновите страницу и повторите.');
  }
  if (!Array.isArray(value) || value.length > 30)
    throw new Error('В меню может быть не более 30 разделов.');
  function field(value: unknown, title: string, required = false, maxLength = 500) {
    if (typeof value !== 'string' || value.length > maxLength || (required && !value.trim()))
      throw new Error(`Проверьте поле «${title}» в меню.`);
    return value.trim();
  }
  return value.map((section) => {
    if (
      !section ||
      typeof section !== 'object' ||
      !Array.isArray(section.items) ||
      !section.items.length ||
      section.items.length > 100
    )
      throw new Error('Добавьте от 1 до 100 позиций в каждый раздел меню.');
    return {
      title: field(section.title, 'Название раздела', true, 120),
      items: section.items.map((item: Record<string, unknown>) => {
        if (!item || typeof item !== 'object') throw new Error('Проверьте позиции меню.');
        return {
          name: field(item.name, 'Название блюда', true, 200),
          price: field(item.price, 'Цена', true, 80),
          portion: field(item.portion ?? '', 'Порция', false, 120),
          description: field(item.description ?? '', 'Описание'),
        };
      }),
    };
  });
}
