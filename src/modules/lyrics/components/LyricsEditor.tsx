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
    <div className="w-full space-y-1 pb-28 md:pb-12">
      <div className="grid grid-cols-1 items-start md:grid-cols-8 md:items-stretch gap-2 mb-8 md:bg-12">
        <div className="lyrics-editor-panel md:col-span-5 xl:col-span-4">
          <SunEditor
            setContents={initialHtml}
            onChange={setContent}
            setOptions={{
              minHeight: '420px',
              buttonList:   [
                ['undo', 'redo'],
                ['bold', 'underline', 'italic', 'strike'],
                ['fontColor', 'hiliteColor', 'removeFormat'],
                ['fullScreen', 'codeView'],
                ['preview', 'print']
              ],
              colorList: customColors,
              stickyToolbar: 0
            }}
            setDefaultStyle="font-size: 20px;"
          />
        </div>
        <div className="md:col-span-3 xl:col-span-4">
          <div className="lyrics-editor-legend sticky top-0 overflow-y-auto pb-16">
            <Legend/>
          </div>
        </div>
      </div>
      <div className="buttons fixed bottom-4 left-1/2 z-50 flex w-[min(100%,56rem)] -translate-x-1/2 justify-center gap-3 rounded-lg bg-black p-4 shadow-2xl md:sticky md:bottom-0 md:w-full md:translate-x-0 md:left-auto">
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