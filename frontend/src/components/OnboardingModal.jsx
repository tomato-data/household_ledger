import React, { useState, useEffect } from 'react';
import CategoryManagement from './CategoryManagement';
import './OnboardingModal.css';

function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // 온보딩을 이미 봤는지 확인
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboarding) {
            // 약간의 지연 후 모달 표시 (UX 개선)
            setTimeout(() => {
                setIsOpen(true);
            }, 500);
        }
    }, []);

    const handleComplete = () => {
        // 온보딩 완료 표시
        localStorage.setItem('hasSeenOnboarding', 'true');
        setIsOpen(false);
    };

    const handleSkip = () => {
        // 건너뛰기
        localStorage.setItem('hasSeenOnboarding', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="onboarding-modal-overlay">
            <div className="onboarding-modal">
                <div className="onboarding-header">
                    <h2>🎉 환영합니다!</h2>
                    <p>가계부 사용을 시작하기 전에 카테고리를 설정해보세요.</p>
                    <p className="tip">💡 18개의 기본 카테고리가 준비되어 있습니다.</p>
                </div>

                <div className="onboarding-content">
                    <CategoryManagement onComplete={handleComplete} />
                </div>

                <div className="onboarding-footer">
                    <button onClick={handleSkip} className="skip-btn">
                        나중에 하기
                    </button>
                </div>
            </div>
        </div>
    )
}

export default OnboardingModal;