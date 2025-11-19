'use client';
import { useState } from 'react';
import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { FaSave, FaTimes } from 'react-icons/fa';

export default function LyricsEditor({
  initialHtml,
  onSave,
  onCancel,
}: {
  initialHtml: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(initialHtml);

  return (
    <div className="space-y-4">
      <SunEditor
        setContents={content}
        onChange={setContent}
        setOptions={{
          height: '500px',
          buttonList: [['undo', 'redo'], ['fontColor', 'hiliteColor']],
        }}
      />
      <div className="flex gap-3">
        <button
          onClick={() => onSave(content)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <FaSave /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          <FaTimes /> Cancel
        </button>
      </div>
    </div>
  );
}