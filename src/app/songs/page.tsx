'use client';
import LatestEncoded from '@/components/LatestEncoded';
import EncodedSongsList from '@/components/EncodedSongsList';

export default function Songs() {
  return (
    <div className="flex flex-col items-center py-8 space-y-8">
      {/* Featured Carousel */}
      <div className="w-full max-w-7xl">
        <LatestEncoded 
          limit={5}
          title="Recently Encoded Tracks"
          showCount={false}
          showCompleteTag={false}
          showTitle={true}
          itemsPerPage={{ mobile: 1, tablet: 2, desktop: 3 }}
        />
      </div>

      {/* All Songs List */}
      <div className="w-full max-w-7xl">
        <EncodedSongsList 
          title="All Encoded Songs"
          showCount={true}
          showCompleteTag={true}
        />
      </div>
    </div>  

  )
}