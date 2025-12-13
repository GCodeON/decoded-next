import { FaClock, FaEdit, FaFont } from 'react-icons/fa';

export type ActionButtonsProps = {
  hasSynced: boolean;
  hasWordSynced: boolean;
  wordSyncEnabled: boolean;
  showRhymes: boolean;
  repairing: boolean;
  onToggleWordSync: () => void;
  onToggleRhymes: () => void;
  onEditSync: () => void;
  onEditLyrics: () => void;
  onRunRepair: () => void;
};

export default function ActionButtons({
  hasSynced,
  hasWordSynced,
  wordSyncEnabled,
  showRhymes,
  repairing,
  onToggleWordSync,
  onToggleRhymes,
  onEditSync,
  onEditLyrics,
  onRunRepair,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4">
      {hasSynced && (
        <button
          onClick={onToggleWordSync}
          className={`flex items-center gap-2 font-semibold ${
            wordSyncEnabled ? 'text-purple-600 hover:text-purple-700' : 'text-gray-600 hover:text-gray-700'
          }`}
        >
          <FaFont /> {wordSyncEnabled ? 'Word Sync ON' : 'Word Sync'}
        </button>
      )}
      <button
        onClick={onToggleRhymes}
        className={`flex items-center gap-2 font-semibold ${
          showRhymes ? 'text-green-600 hover:text-green-700' : 'text-gray-600 hover:text-gray-700'
        }`}
      >
        {showRhymes ? 'Rhymes ON' : 'Rhymes OFF'}
      </button>
      <button
        onClick={onEditSync}
        className={`flex items-center gap-2 ${hasSynced ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'} font-semibold`}
      >
        <FaClock /> {hasSynced ? 'Edit Sync' : 'Sync Lyrics'}
      </button>
      <button
        onClick={onEditLyrics}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        <FaEdit /> Edit
      </button>
      {(hasSynced || hasWordSynced) && (
        <button
          onClick={onRunRepair}
          className={`flex items-center gap-2 ${repairing ? 'text-gray-400' : 'text-red-600 hover:text-red-700'} font-semibold`}
          disabled={repairing}
        >
          <FaClock /> {repairing ? 'Repairing…' : 'Repair Sync'}
        </button>
      )}
    </div>
  );
}
