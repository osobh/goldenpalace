import { Check, User, DollarSign, Settings, Shield } from 'lucide-react';
import { WizardStep } from '../WizardStep';
import type { PortfolioFormData, ValidationErrors } from '../hooks/usePortfolioWizard';

interface ReviewConfirmStepProps {
  formData: PortfolioFormData;
  errors: ValidationErrors;
  updateFormData: (updates: Partial<PortfolioFormData>) => void;
}

export function ReviewConfirmStep({ formData, errors, updateFormData }: ReviewConfirmStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sections = [
    {
      title: 'Basic Information',
      icon: User,
      items: [
        { label: 'Portfolio Name', value: formData.name },
        { label: 'Description', value: formData.description || 'Not provided' },
        { label: 'Type', value: formData.portfolioType },
        { label: 'Privacy', value: formData.isPublic ? 'Public' : 'Private' },
      ],
    },
    {
      title: 'Financial Setup',
      icon: DollarSign,
      items: [
        { label: 'Initial Balance', value: formatCurrency(formData.initialBalance) },
        { label: 'Currency', value: formData.currency },
        { label: 'Risk Tolerance', value: formData.riskTolerance },
        { label: 'Investment Horizon', value: formData.investmentHorizon },
      ],
    },
  ];

  return (
    <WizardStep
      title="Review & Confirm"
      description="Please review your portfolio settings before creating"
    >
      {/* Review Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Icon className="h-5 w-5 text-primary" />
                <h4 className="font-medium text-foreground">{section.title}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.items.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    <div className="font-medium text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Terms and Conditions */}
      <div className="space-y-3">
        <div className={`border rounded-lg p-4 ${errors.acceptTerms ? 'border-red-500 bg-red-50' : 'border-border bg-muted/30'}`}>
          <div className="flex items-start space-x-3">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => updateFormData({ acceptTerms: e.target.checked })}
              className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="acceptTerms" className="text-sm font-medium text-foreground cursor-pointer">
                I accept the Terms and Conditions *
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                By creating this portfolio, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>,{' '}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>, and{' '}
                <a href="#" className="text-primary hover:underline">Risk Disclosure</a>.
              </p>
            </div>
          </div>
        </div>
        {errors.acceptTerms && (
          <p className="text-sm text-red-500">{errors.acceptTerms}</p>
        )}
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Important Notice</h4>
            <p className="text-sm text-blue-800">
              {formData.portfolioType === 'PAPER'
                ? "This is a paper trading portfolio. No real money will be invested. This is for educational and practice purposes only."
                : formData.portfolioType === 'EDUCATIONAL'
                ? "This educational portfolio includes guided examples and learning materials to help you understand investing concepts."
                : "This portfolio will track real investments. Please ensure you understand the risks involved in investing."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Creation Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Check className="h-5 w-5 text-green-600" />
          <h4 className="font-medium text-green-900">Ready to Create</h4>
        </div>
        <p className="text-sm text-green-800">
          Your <span className="font-medium">{formData.name}</span> portfolio is ready to be created with an initial balance of{' '}
          <span className="font-medium">{formatCurrency(formData.initialBalance)}</span>.
        </p>
      </div>
    </WizardStep>
  );
}