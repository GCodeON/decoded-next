import { Suspense } from 'react';
import SearchContent from './SearchContent';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-white/60">Loading…</div>}>
      <SearchContent />
    </Suspense>
  );
}
