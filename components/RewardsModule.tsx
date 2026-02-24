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

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'rewards' ? 'border-b-2 border-[#009900] text-[#009900]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Award size={18} />
                    Khen thưởng & Kỷ luật
                </button>
                <button
                    onClick={() => setActiveTab('decisions')}
                    className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'decisions' ? 'border-b-2 border-[#009900] text-[#009900]' : 'text-slate-500 hover:text-slate-700'}`}
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
