'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FaSave, FaTimes } from 'react-icons/fa';
import { Legend, customColors } from '@/modules/lyrics';
import 'suneditor/dist/css/suneditor.min.css';
import { buttonList } from 'suneditor-react';

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
      <div className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-8 md:bg-12">
        <div className="md:col-span-5 xl:col-span-4">
          <SunEditor
            setContents={content}
            onChange={setContent}
            setOptions={{
              maxHeight: '650px',
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
          <div className="sticky top-0 pb-16">
            <Legend/>
          </div>
        </div>
      </div>
      <div className="buttons absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-3 bg-black p-4 rounded-lg shadow-2xl w-full  justify-center">
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