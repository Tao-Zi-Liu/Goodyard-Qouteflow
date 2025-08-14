import { MOCK_RFQS } from '@/lib/data';

export async function generateStaticParams() {
  return MOCK_RFQS.map((rfq) => ({
    id: rfq.id,
  }));
}