import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { usePortfolioWizard } from './hooks/usePortfolioWizard';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { BasicInformationStep } from './steps/BasicInformationStep';
import { FinancialSetupStep } from './steps/FinancialSetupStep';
import { ReviewConfirmStep } from './steps/ReviewConfirmStep';

interface PortfolioWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PortfolioWizard({ onClose, onSuccess }: PortfolioWizardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    currentStep,
    totalSteps,
    formData,
    errors,
    updateFormData,
    validateStep,
    nextStep,
    prevStep,
    canProceed,
  } = usePortfolioWizard();

  const { createPortfolio } = usePortfolioStore();

  const steps = [
    { id: 1, title: 'Basic Info', component: BasicInformationStep },
    { id: 2, title: 'Financial Setup', component: FinancialSetupStep },
    { id: 3, title: 'Review & Confirm', component: ReviewConfirmStep },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps && validateStep(currentStep)) {
      nextStep();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      prevStep();
    }
  };

  const handleCreate = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      // Convert form data to API format
      const portfolioData = {
        name: formData.name,
        description: formData.description || undefined,
        initialBalance: formData.initialBalance,
        currency: formData.currency,
        isPublic: formData.isPublic,
      };

      await createPortfolio(portfolioData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating portfolio:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create portfolio');
    } finally {
      setIsCreating(false);
    }
  };

  const getCurrentStepComponent = () => {
    const currentStepConfig = steps.find(step => step.id === currentStep);
    if (!currentStepConfig) return null;

    const StepComponent = currentStepConfig.component;
    return (
      <StepComponent
        formData={formData}
        errors={errors}
        updateFormData={updateFormData}
      />
    );
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Indicator */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Step {currentStep} of {totalSteps}
          </h3>
          <div className="text-sm text-muted-foreground">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center space-x-2">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    status === 'completed'
                      ? 'bg-primary text-primary-foreground'
                      : status === 'current'
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id}
                </div>
                <div className="ml-2 text-sm">
                  <div className={`font-medium ${status === 'current' ? 'text-primary' : 'text-foreground'}`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-px w-12 ${status === 'completed' ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {getCurrentStepComponent()}

        {/* Error Message */}
        {createError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{createError}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentStep === 1
                ? 'text-muted-foreground cursor-not-allowed'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>

            {currentStep === totalSteps ? (
              <button
                onClick={handleCreate}
                disabled={!canProceed || isCreating}
                className="inline-flex items-center px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Portfolio'
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}