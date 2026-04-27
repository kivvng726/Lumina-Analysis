import React, { useState } from 'react';
import { Step1_Intent } from './components/Step1_Intent';
import { Step1_5_Crawling } from './components/Step1_5_Crawling';
import { Step2_Cleaning } from './components/Step2_Cleaning';
import { Step3_Dataset } from './components/Step3_Dataset';
import { Step4_Visualization } from './components/Step4_Visualization';
import { Step5_Orchestration } from './components/Step5_Orchestration';
import { Step6_Reporting } from './components/Step6_Reporting';
import { CommentData } from './types';
import { fetchAgentReport } from './services/reportService';

const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [dataset, setDataset] = useState<CommentData[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [agentReport, setAgentReport] = useState<string>('');
  const [agentReportLoading, setAgentReportLoading] = useState<boolean>(false);
  const [agentReportError, setAgentReportError] = useState<string | null>(null);

  // Updated Navigation with 7 Steps
  const renderProgress = () => {
    if (step === 1) return null;
    const steps = ['意图', '抓取', '清洗', '数据集', '可视化', '编排', '报告'];
    return (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 z-50">
            <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                style={{ width: `${(step / 7) * 100}%` }} 
            />
            <div className="absolute top-2 left-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                步骤 {step} / 7 : {steps[step - 1]}
            </div>
        </div>
    );
  };

  return (
    <div className="w-screen min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 relative">
      {renderProgress()}
      
      {step === 1 && (
        <Step1_Intent 
            onComplete={(config) => {
                console.log("Config", config);
                setStep(2); // Go to Crawling
            }} 
        />
      )}

      {step === 2 && (
        <Step1_5_Crawling 
            onComplete={() => {
                setStep(3); // Go to Cleaning
            }}
        />
      )}

      {step === 3 && (
        <Step2_Cleaning 
            onComplete={(data) => {
                setDataset(data);
                // 默认选中所有已接受的数据，后续可在 Step3 中调整
                const initialSelected = data
                  .filter(item => item.status === 'accepted')
                  .map(item => item.id);
                setSelectedDatasetIds(initialSelected);
                setStep(4);
            }} 
        />
      )}

      {step === 4 && (
        <Step3_Dataset 
            data={dataset}
            selectedIds={selectedDatasetIds}
            onSelectedIdsChange={setSelectedDatasetIds}
            onComplete={(lockedIds) => {
              setSelectedDatasetIds(lockedIds);
              setStep(5);
            }} 
        />
      )}

      {step === 5 && (
        <Step4_Visualization 
            onNext={() => setStep(6)} 
        />
      )}

      {step === 6 && (
        <Step5_Orchestration 
            onComplete={() => setStep(7)} 
        />
      )}

      {step === 7 && (
        <Step6_Reporting 
          agentReport={agentReport}
          isLoading={agentReportLoading}
          error={agentReportError}
          onGenerateReport={async () => {
            // 只使用已接受且被选中的数据
            const selectedTexts = dataset
              .filter(item => item.status === 'accepted' && selectedDatasetIds.includes(item.id))
              .map(item => item.content);

            if (selectedTexts.length === 0) {
              setAgentReportError('请在步骤 4 中至少选择一条「有效数据」后再生成报告');
              return;
            }

            setAgentReportLoading(true);
            setAgentReportError(null);
            try {
              const report = await fetchAgentReport(selectedTexts);
              setAgentReport(report);
            } catch (e: any) {
              setAgentReportError(e?.message || '报告生成失败，请稍后重试');
            } finally {
              setAgentReportLoading(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
