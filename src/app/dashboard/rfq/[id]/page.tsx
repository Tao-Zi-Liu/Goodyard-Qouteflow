import { MOCK_RFQS } from '@/lib/data';
import RFQDetailClient from './rfq-detail-client';

// This function is required for static export with dynamic routes
export async function generateStaticParams() {
  return MOCK_RFQS.map((rfq) => ({
    id: rfq.id,
  }));
}

// Server component that renders the client component
export default function RFQDetailPage() {
  return <RFQDetailClient />;
}