/**
 * Onboarding 引导组件（Story 3.5: FR22）
 *
 * 3 步引导流程：
 * 1. 介绍一键收藏
 * 2. 说明注解（why_saved）的价值
 * 3. 展示时间轴入口
 *
 * 完成/跳过后写入 Chrome Storage，不再重复展示。
 */
import { useState } from 'react';
import './Onboarding.css';

/** 引导步骤数据 */
const STEPS = [
  {
    icon: '🔖',
    title: '一键收藏',
    description: '看到好内容？点一下就能保存到你的知识库。',
  },
  {
    icon: '✍️',
    title: '写下你的想法',
    description: '添加一句注解，记录"为什么收藏"。未来回看时，这句话比标题更有价值。',
  },
  {
    icon: '📊',
    title: '时间轴回顾',
    description: '所有收藏按时间排列，AI 自动聚类整理，随时回顾你的知识轨迹。',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // 最后一步点"开始使用" → 完成
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await browser.storage.local.set({ onboardingCompleted: true });
    onComplete();
  };

  const current = STEPS[step];

  return (
    <div className="onboarding-container">
      {/* 步骤指示器 */}
      <div className="onboarding-dots">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`dot ${i === step ? 'dot-active' : ''} ${i < step ? 'dot-done' : ''}`}
          />
        ))}
      </div>

      {/* 内容 */}
      <div className="onboarding-content">
        <span className="onboarding-icon">{current.icon}</span>
        <h3 className="onboarding-title">{current.title}</h3>
        <p className="onboarding-desc">{current.description}</p>
      </div>

      {/* 操作按钮 */}
      <div className="onboarding-actions">
        <button className="btn btn-primary" onClick={handleNext}>
          {step < STEPS.length - 1 ? '下一步' : '开始使用'}
        </button>
        {step < STEPS.length - 1 && (
          <button className="btn-skip" onClick={handleFinish}>
            跳过引导
          </button>
        )}
      </div>

      {/* 步骤计数 */}
      <p className="onboarding-counter">{step + 1} / {STEPS.length}</p>
    </div>
  );
}
