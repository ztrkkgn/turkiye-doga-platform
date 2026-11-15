import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventDetail } from '@/components/event-detail';
import { EVENTS, eventBySlug } from '@/lib/events';

export const dynamicParams = false;
export function generateStaticParams() { return EVENTS.map(event=>({slug:event.slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
 const event=eventBySlug((await params).slug);
 return event ? {title:event.title,description:event.summary} : {title:'Olay bulunamadı'};
}
export default async function RegionPage({params}:{params:Promise<{slug:string}>}) {
 const event=eventBySlug((await params).slug);
 if(!event)notFound();
 return <EventDetail event={event}/>;
}
