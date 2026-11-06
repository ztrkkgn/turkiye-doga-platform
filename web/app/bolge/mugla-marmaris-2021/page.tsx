import type { Metadata } from 'next';
import { PilotViewer } from '@/components/pilot-viewer';
export const metadata: Metadata = {title:'Marmaris · 2021 yangını'};
export default function RegionPage() { return <PilotViewer detail/> }
