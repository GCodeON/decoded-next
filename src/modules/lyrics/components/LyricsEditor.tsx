'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FaSave, FaTimes } from 'react-icons/fa';
import { Legend, customColors } from '@/modules/lyrics';
import 'suneditor/dist/css/suneditor.min.css';

const SunEditor = dynamic(() => import('suneditor-react'), {
  ssr: false
});

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
    <div className="w-full space-y-1">
      <div className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-4">
        <div className="md:col-span-5 xl:col-span-4">
          <SunEditor
            setContents={content}
            onChange={setContent}
            setOptions={{
              height: '100%',
              buttonList: [['undo', 'redo'], ['fontColor', 'hiliteColor']],
              colorList: customColors
            }}
            setDefaultStyle="font-size: 20px;"
          />
        </div>
        <div className="md:col-span-3 xl:col-span-4">
          <div className="sticky top-0">
            <Legend/>
          </div>
        </div>
      </div>
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