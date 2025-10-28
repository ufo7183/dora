
import React, { useState } from 'react';
import { ChemicalLab } from './components/ChemicalLab';
import { ImageGallery } from './components/ImageGallery';
import { GadgetPouch } from './components/GadgetPouch';
import { GadgetPouchV2 } from './components/GadgetPouchV2';

// FIX: Define and export the COLORS constant for use in the ContextMenu.
export const COLORS = [
  { name: '黃色', bg: 'bg-yellow-400' },
  { name: '綠色', bg: 'bg-green-400' },
  { name: '藍色', bg: 'bg-blue-400' },
  { name: '粉色', bg: 'bg-pink-400' },
  { name: '紫色', bg: 'bg-purple-400' },
  { name: '橘色', bg: 'bg-orange-400' },
  { name: '紅色', bg: 'bg-red-400' },
  { name: '青色', bg: 'bg-cyan-400' },
  { name: '灰色', bg: 'bg-gray-400' },
  { name: '黑色', bg: 'bg-gray-800' },
];

const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            isActive
                ? 'bg-blue-500 text-white shadow'
                : 'text-gray-600 hover:bg-blue-100'
        }`}
    >
        {label}
    </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lab' | 'gallery' | 'pouch' | 'pouchV2'>('lab');

  return (
    <main className="relative w-screen h-screen bg-gray-100 font-sans overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-white/80 backdrop-blur-md rounded-full shadow-md px-2 py-1 flex items-center gap-2 border border-gray-200">
            <TabButton
                label="化學實驗室"
                isActive={activeTab === 'lab'}
                onClick={() => setActiveTab('lab')}
            />
            <TabButton
                label="百變圖庫"
                isActive={activeTab === 'gallery'}
                onClick={() => setActiveTab('gallery')}
            />
            <TabButton
                label="百寶袋"
                isActive={activeTab === 'pouch'}
                onClick={() => setActiveTab('pouch')}
            />
            <TabButton
                label="百寶袋 V2"
                isActive={activeTab === 'pouchV2'}
                onClick={() => setActiveTab('pouchV2')}
            />
        </div>

        {activeTab === 'lab' ? (
            <ChemicalLab />
        ) : activeTab === 'gallery' ? (
            <ImageGallery />
        ) : activeTab === 'pouch' ? (
            <GadgetPouch />
        ) : (
            <GadgetPouchV2 />
        )}
    </main>
  );
};

export default App;