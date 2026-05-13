
import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings2, 
  Code, 
  Monitor, 
  MousePointer2,
  Box,
  Layers,
  Key,
  ShieldAlert,
  Save,
  Copy,
  Check
} from 'lucide-react';

interface RibbonButton {
  id: string;
  name: string;
  icon: any;
  size: 'large' | 'small';
}

interface RibbonPanel {
  id: string;
  name: string;
  buttons: RibbonButton[];
}

interface RibbonTab {
  id: string;
  name: string;
  panels: RibbonPanel[];
}

export const RibbonDesigner: React.FC = () => {
  const [tabs, setTabs] = useState<RibbonTab[]>([
    {
      id: 'tab1',
      name: 'DSH TOOLS',
      panels: [
        {
          id: 'p1',
          name: 'LICENSE',
          buttons: [
            { id: 'b1', name: 'Login', icon: Key, size: 'large' },
            { id: 'b2', name: 'Info', icon: Box, size: 'small' }
          ]
        },
        {
          id: 'p2',
          name: 'MODELING',
          buttons: [
            { id: 'b3', name: 'Auto Join', icon: Layers, size: 'large' }
          ]
        }
      ]
    }
  ]);

  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [copied, setCopied] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const generateCSharpCode = () => {
    let code = `public Result OnStartup(UIControlledApplication application)\n{\n`;
    tabs.forEach(tab => {
      code += `    // Create Tab: ${tab.name}\n`;
      code += `    application.CreateRibbonTab("${tab.name}");\n\n`;
      tab.panels.forEach(panel => {
        code += `    // Create Panel: ${panel.name}\n`;
        code += `    RibbonPanel panel_${panel.name.replace(/\s/g, '_')} = application.CreateRibbonPanel("${tab.name}", "${panel.name}");\n`;
        panel.buttons.forEach(btn => {
          code += `    PushButtonData btnData_${btn.id} = new PushButtonData("${btn.id}", "${btn.name}", assemblyPath, "YourNamespace.Commands.${btn.name}Command");\n`;
          code += `    PushButton btn_${btn.id} = panel_${panel.name.replace(/\s/g, '_')}.AddItem(btnData_${btn.id}) as PushButton;\n`;
          code += `    btn_${btn.id}.LargeImage = GetImageSource("icon_${btn.name.toLowerCase()}.png");\n\n`;
        });
      });
    });
    code += `    return Result.Succeeded;\n}`;
    return code;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generateCSharpCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ribbon Designer</h2>
          <p className="text-sm text-slate-500">Thiết kế thanh công cụ BIM Tool trực quan & sinh mã C#</p>
        </div>
        <div className="flex gap-2">
           <button onClick={copyCode} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
             {copied ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
             {copied ? "Đã chép mã" : "Copy C# Code"}
           </button>
        </div>
      </div>

      {/* REIVIT RIBBON PREVIEW AREA */}
      <div className="bg-[#f0f0f0] border-t border-b border-[#d0d0d0] -mx-8 px-8 py-2 overflow-x-auto select-none">
         {/* Tabs Header */}
         <div className="flex gap-1 mb-1">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`px-4 py-1 text-[11px] font-medium cursor-pointer transition-colors border-t-2 ${activeTabId === tab.id ? 'bg-[#ffffff] text-[#006ac3] border-[#006ac3]' : 'text-[#555] border-transparent hover:bg-white/50'}`}
              >
                {tab.name.toUpperCase()}
              </div>
            ))}
            <div className="px-2 py-1 text-[11px] text-[#aaa] cursor-pointer hover:text-blue-500"><Plus className="w-3 h-3" /></div>
         </div>

         {/* Ribbon Content (Standard BIM Tool Height) */}
         <div className="bg-white h-[95px] border border-[#d0d0d0] flex items-stretch p-1 gap-1">
            {activeTab.panels.map(panel => (
              <div key={panel.id} className="flex flex-col border-r border-[#e0e0e0] last:border-r-0 pr-1 min-w-[80px]">
                <div className="flex-1 flex items-center gap-1.5 px-1 pt-1">
                  {panel.buttons.map(btn => (
                    <div key={btn.id} className={`flex flex-col items-center justify-center p-1 rounded hover:bg-blue-50 cursor-pointer group relative ${btn.size === 'large' ? 'w-16 h-[68px]' : 'w-12 h-[32px]'}`}>
                      <div className={`${btn.size === 'large' ? 'bg-slate-100 p-2 rounded' : 'bg-slate-50 p-1 rounded'}`}>
                        <btn.icon className={`${btn.size === 'large' ? 'w-7 h-7' : 'w-4 h-4'} text-slate-600 group-hover:text-blue-600`} />
                      </div>
                      <span className="text-[10px] text-center leading-tight mt-1 text-slate-700 group-hover:text-blue-700">{btn.name}</span>
                    </div>
                  ))}
                  <button className="w-8 h-[68px] flex items-center justify-center text-slate-300 hover:text-blue-500 border border-dashed border-slate-200 rounded">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-4 bg-[#f8f8f8] border-t border-[#eee] flex items-center justify-center">
                  <span className="text-[9px] font-bold text-[#888] tracking-wider">{panel.name}</span>
                </div>
              </div>
            ))}
            <button className="flex flex-col items-center justify-center border-r border-dashed border-slate-300 px-4 text-slate-300 hover:text-blue-500">
               <Plus className="w-5 h-5" />
               <span className="text-[9px] mt-1 font-bold">ADD PANEL</span>
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center gap-2 mb-2">
             <Settings2 className="w-5 h-5 text-indigo-500" />
             <h3 className="font-bold text-slate-800">Cấu hình Panel & Button</h3>
           </div>
           
           <div className="space-y-4">
             {activeTab.panels.map((panel, pIdx) => (
               <div key={panel.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <input 
                       className="bg-transparent font-bold text-slate-700 border-none focus:ring-0 w-32" 
                       value={panel.name}
                       onChange={(e) => {
                         const newTabs = [...tabs];
                         const tab = newTabs.find(t => t.id === activeTabId);
                         if(tab) tab.panels[pIdx].name = e.target.value.toUpperCase();
                         setTabs(newTabs);
                       }}
                     />
                   </div>
                   <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                 </div>

                 <div className="space-y-2">
                   {panel.buttons.map((btn, bIdx) => (
                     <div key={btn.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                       <div className="p-1.5 bg-slate-50 rounded text-slate-400"><btn.icon className="w-4 h-4" /></div>
                       <input 
                         className="flex-1 text-sm text-slate-600 border-none focus:ring-0" 
                         value={btn.name}
                         onChange={(e) => {
                            const newTabs = [...tabs];
                            const tab = newTabs.find(t => t.id === activeTabId);
                            if(tab) tab.panels[pIdx].buttons[bIdx].name = e.target.value;
                            setTabs(newTabs);
                         }}
                       />
                       <select 
                         className="text-[10px] bg-slate-50 border-none rounded font-bold uppercase"
                         value={btn.size}
                         onChange={(e) => {
                            const newTabs = [...tabs];
                            const tab = newTabs.find(t => t.id === activeTabId);
                            if(tab) tab.panels[pIdx].buttons[bIdx].size = e.target.value as any;
                            setTabs(newTabs);
                         }}
                       >
                         <option value="large">Large</option>
                         <option value="small">Small</option>
                       </select>
                       <button className="text-slate-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Real-time Code Output */}
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
           <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">C# Generated Code</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
           </div>
           <pre className="p-6 text-[11px] font-mono text-blue-300 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 flex-1">
              {generateCSharpCode()}
           </pre>
        </div>
      </div>
    </div>
  );
};
