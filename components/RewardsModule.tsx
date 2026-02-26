import React, { useState } from 'react';
import { Award, FileText } from 'lucide-react';
import { RewardsList } from './RewardsList';
import { DecisionList } from './DecisionList';

export const RewardsModule = () => {
    const [activeTab, setActiveTab] = useState<'rewards' | 'decisions'>('rewards');

    return (
        <div className="p-4 md:p-6 min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Khen thưởng & Kỷ luật</h1>
                <p className="text-slate-500">Quản lý danh sách và quyết định khen thưởng, kỷ luật</p>
            </div>

            {/* Button Group (Pill style) */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit mb-6 gap-1">
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'rewards' ? 'bg-white text-[#009900] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                >
                    <Award size={18} />
                    Khen thưởng & Kỷ luật
                </button>
                <button
                    onClick={() => setActiveTab('decisions')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'decisions' ? 'bg-white text-[#009900] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                >
                    <FileText size={18} />
                    Quyết định KT/KL
                </button>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'rewards' ? <RewardsList /> : <DecisionList />}
            </div>
        </div>
    );
};
