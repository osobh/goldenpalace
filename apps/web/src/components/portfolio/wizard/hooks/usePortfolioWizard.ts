import { useState, useCallback, useMemo } from 'react';

export interface PortfolioFormData {
  // Step 1: Basic Information
  name: string;
  description: string;
  portfolioType: 'REAL' | 'PAPER' | 'EDUCATIONAL';
  isPublic: boolean;

  // Step 2: Financial Setup
  currency: string;
  initialBalance: number;
  riskTolerance: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'CUSTOM';
  investmentHorizon: 'SHORT' | 'MEDIUM' | 'LONG';

  // Step 3: Strategy & Allocation
  investmentStrategy: 'VALUE' | 'GROWTH' | 'INCOME' | 'BALANCED' | 'CUSTOM';
  stockAllocation: number;
  bondAllocation: number;
  cashAllocation: number;
  cryptoAllocation: number;
  sectorPreferences: string[];
  geographicAllocation: {
    us: number;
    international: number;
    emergingMarkets: number;
  };

  // Step 4: Risk Management
  maxPositionSize: number;
  stopLossAuto: boolean;
  rebalancingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'MANUAL';
  riskMetricsMonitoring: string[];

  // Step 5: Social & Notifications
  allowFollowing: boolean;
  showInLeaderboards: boolean;
  allowCopyTrading: boolean;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  showPerformancePublicly: boolean;

  // Step 6: Terms
  acceptTerms: boolean;
}

export interface ValidationErrors {
  [key: string]: string;
}

const initialFormData: PortfolioFormData = {
  // Step 1
  name: '',
  description: '',
  portfolioType: 'PAPER',
  isPublic: false,

  // Step 2
  currency: 'USD',
  initialBalance: 10000,
  riskTolerance: 'BALANCED',
  investmentHorizon: 'MEDIUM',

  // Step 3
  investmentStrategy: 'BALANCED',
  stockAllocation: 60,
  bondAllocation: 30,
  cashAllocation: 10,
  cryptoAllocation: 0,
  sectorPreferences: [],
  geographicAllocation: {
    us: 70,
    international: 25,
    emergingMarkets: 5,
  },

  // Step 4
  maxPositionSize: 10,
  stopLossAuto: false,
  rebalancingFrequency: 'QUARTERLY',
  riskMetricsMonitoring: ['SHARPE_RATIO', 'VAR'],

  // Step 5
  allowFollowing: true,
  showInLeaderboards: true,
  allowCopyTrading: false,
  notificationPreferences: {
    email: true,
    push: true,
    inApp: true,
  },
  showPerformancePublicly: false,

  // Step 6
  acceptTerms: false,
};

export function usePortfolioWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PortfolioFormData>(initialFormData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  const totalSteps = 3;

  const updateFormData = useCallback((updates: Partial<PortfolioFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);

    // Clear relevant errors
    const updatedFields = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => {
        delete newErrors[field];
      });
      return newErrors;
    });
  }, []);

  // Pure validation function that doesn't set state
  const validateStepPure = useCallback((step: number, data: PortfolioFormData): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1:
        if (!data.name.trim()) {
          newErrors.name = 'Portfolio name is required';
        } else if (data.name.length < 3) {
          newErrors.name = 'Portfolio name must be at least 3 characters';
        } else if (data.name.length > 50) {
          newErrors.name = 'Portfolio name must be less than 50 characters';
        }

        if (data.description.length > 200) {
          newErrors.description = 'Description must be less than 200 characters';
        }
        break;

      case 2:
        if (data.initialBalance < 100) {
          newErrors.initialBalance = 'Initial balance must be at least $100';
        }
        break;

      case 3:
        if (!data.acceptTerms) {
          newErrors.acceptTerms = 'You must accept the terms and conditions';
        }
        break;
    }

    return newErrors;
  }, []);

  // Validation function that sets state
  const validateStep = useCallback((step: number): boolean => {
    const newErrors = validateStepPure(step, formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateStepPure]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps, validateStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const reset = useCallback(() => {
    setCurrentStep(1);
    setFormData(initialFormData);
    setErrors({});
    setIsDirty(false);
  }, []);

  const isStepValid = useCallback((step: number) => {
    const stepErrors = validateStepPure(step, formData);
    return Object.keys(stepErrors).length === 0;
  }, [formData, validateStepPure]);

  const canProceed = useMemo(() => {
    if (currentStep === totalSteps) {
      return !errors.acceptTerms; // For the last step, check if terms are accepted
    }
    const stepErrors = validateStepPure(currentStep, formData);
    return Object.keys(stepErrors).length === 0;
  }, [currentStep, totalSteps, formData, errors.acceptTerms, validateStepPure]);

  return {
    currentStep,
    totalSteps,
    formData,
    errors,
    isDirty,
    updateFormData,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
    reset,
    isStepValid,
    canProceed,
  };
}