import catalog from './events-catalog.json';

export type EventCategory = 'fire' | 'water';
export interface NatureEvent {
  id: string;
  slug: string;
  title: string;
  location: string;
  province: string;
  year: number;
  date: string;
  category: EventCategory;
  coordinates: [number, number];
  summary: string;
  story: string[];
  analysis: {status: 'available' | 'pending'; summaryUrl?: string};
  sources: {title: string; url: string; publisher: string}[];
  coordinateNote: string;
}

export const EVENTS = catalog.events as NatureEvent[];
export const CATALOG_UPDATED_AT = catalog.updatedAt;
export const eventBySlug = (slug: string) => EVENTS.find(event => event.slug === slug);
export const categoryLabel = (category: EventCategory) => category === 'fire' ? 'Orman yangını' : 'Su ve sulak alan';
export const analysisLabel = (event: NatureEvent) => event.analysis.status === 'available' ? 'Olay dönemi analizi var' : 'Kaynaklı olay kaydı';
export function eventDateLabel(event: NatureEvent) {
  if (/^\d{4}$/.test(event.date)) return `${event.year} · yıl düzeyinde kayıt`;
  return new Intl.DateTimeFormat('tr-TR', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(event.date));
}

function searchText(text: string) {
  return text.toLocaleLowerCase('tr-TR').replaceAll('ı','i').normalize('NFD').replace(/\p{Diacritic}/gu,'');
}

export function filterEvents(events: NatureEvent[], query: string, category: EventCategory | 'all', analyzedOnly: boolean) {
  const needle = searchText(query.trim());
  return events.filter(event => (category === 'all' || event.category === category)
    && (!analyzedOnly || event.analysis.status === 'available')
    && (!needle || searchText(`${event.title} ${event.location} ${event.province} ${event.year}`).includes(needle)));
}
