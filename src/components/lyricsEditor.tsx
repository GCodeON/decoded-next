'use client';
import { useState } from 'react';

import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { FaSave, FaTimes, FaInfoCircle } from 'react-icons/fa';

import Legend from './legend';
import { customColors } from '@/utils/legend'

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
  const [showLegend, setShowLegend] = useState(true);

  return (
    <div className="w-full space-y-1">
      <div className="grid grid-cols-1 lg:grid-cols-8 gap-2 mb-4">
        <div className="lg:col-span-5 xl:col-span-4">
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
        <Legend
          toggle={showLegend}
        />
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