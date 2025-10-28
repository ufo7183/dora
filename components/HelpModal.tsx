
import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-2xl font-bold text-gray-800">多啦A夢實驗室使用說明</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none" aria-label="關閉說明">&times;</button>
        </div>
        
        <div className="space-y-6 text-gray-700">
          <p>嗨！歡迎來到多啦A夢實驗室，這是一個讓你發揮無限創意的地方！把它想像成一個來自未來，有著四次元口袋的超大畫布。</p>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">一、遨遊實驗室 🗺️</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>平移畫布</strong>：按住鍵盤上的 <code className="bg-gray-200 text-gray-800 font-semibold px-1.5 py-0.5 rounded">空白鍵</code>，然後用滑鼠拖曳，就可以移動整張畫布，探索每個角落。</li>
              <li><strong>縮放視野</strong>：滾動你的滑鼠滾輪，可以放大看細節，或縮小看全景。</li>
              <li><strong>回到中心</strong>：如果迷路了，左上角有個「重設視圖」按鈕，按一下就能馬上回到畫布中央。</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">二、拿出道具 🎨</h3>
            <p className="mb-2">你可以隨意在畫布上新增三種東西：</p>
            <ul className="list-disc list-inside space-y-1">
                <li><strong>指令卡</strong>：點擊左上角的「新增指令」，或在畫布任意處點擊滑鼠右鍵，選擇「新增指令」。</li>
                <li><strong>指示箭頭</strong>：點擊「新增箭頭」，或用右鍵選單新增。</li>
                <li><strong>圖片</strong>：點擊「新增圖片」來上傳你電腦裡的照片。</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">三、編輯與調整 ✍️</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>選取</strong>：
                <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                    <li>單獨選取：直接用滑鼠點一下物件。</li>
                    <li>一次選多個：按住 <code className="bg-gray-200 text-gray-800 font-semibold px-1.5 py-0.5 rounded">Shift</code> 鍵再一個個點，或者直接用滑鼠在空白處拖曳出一個框，把想選的物件都框進來。</li>
                </ul>
              </li>
              <li><strong>移動</strong>：選取物件後，按住滑鼠拖曳它到任何地方。</li>
              <li><strong>改變大小</strong>：選取物件後，拖曳右下角出現的白色小方塊。</li>
              <li><strong>旋轉</strong>：選取物件後，拖曳上方出現的藍色小圓點。</li>
              <li><strong>修改指令文字</strong>：在指令卡上快速點兩下滑鼠，就可以開始打字了。</li>
              <li><strong>改變顏色</strong>：選取指令卡或指示箭頭後，左邊的控制面板會出現調色盤，點一下就能換色。</li>
              <li><strong>調整圖層</strong>：想讓某個物件疊在最上面或最下面嗎？用「移到最上層」和「移到最下層」按鈕就對了！</li>
              <li><strong>刪除</strong>：選取物件後，按下鍵盤的 <code className="bg-gray-200 text-gray-800 font-semibold px-1.5 py-0.5 rounded">Delete</code> 或 <code className="bg-gray-200 text-gray-800 font-semibold px-1.5 py-0.5 rounded">Backspace</code> 鍵，或是點擊「刪除」按鈕。</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">四、✨ AI 魔法口袋 ✨</h3>
            <p className="mb-2">這是最酷的功能！你可以讓 AI 幫你畫圖。</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>如何使用</strong>：
                <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                  <li>先選取一個或多個「指令卡」或「圖片」。</li>
                  <li>選好後，旁邊會出現一個黃色的「生成 ✨」按鈕，按下去！</li>
                </ol>
              </li>
              <li><strong>你可以做什麼</strong>：
                <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                  <li><strong>文字變圖片</strong>：新增一個指令卡，在裡面寫下你想畫的東西（例如：「一隻在太空旅行的柴犬」），然後選取這個指令卡，按下「生成」。</li>
                  <li><strong>修改圖片</strong>：上傳一張圖，再新增一個指令卡寫下修改指令（例如：「幫這隻貓加上一副太陽眼鏡」），然後同時選取圖片和指令卡，按下「生成」。</li>
                  <li><strong>融合圖片</strong>：選取兩張以上的圖片，AI 會發揮創意，把它们融合在一起，創造出全新的圖像！</li>
                </ul>
              </li>
              <li><strong>生成之後</strong>：AI 畫好圖後，會跳出一個視窗給你看結果。你可以選擇「新增至畫布」把它放進來，或是「下載」存到你的電腦。</li>
            </ul>
          </div>
          
          <p className="text-center font-semibold pt-4 border-t mt-4">現在你已經是實驗室博士了！快去試試看吧！</p>
        </div>

      </div>
    </div>
  );
};
