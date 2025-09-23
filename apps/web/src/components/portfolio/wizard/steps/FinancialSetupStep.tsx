import { DollarSign, Shield, Clock, Target } from 'lucide-react';
import { WizardStep } from '../WizardStep';
import type { PortfolioFormData, ValidationErrors } from '../hooks/usePortfolioWizard';

interface FinancialSetupStepProps {
  formData: PortfolioFormData;
  errors: ValidationErrors;
  updateFormData: (updates: Partial<PortfolioFormData>) => void;
}

export function FinancialSetupStep({ formData, errors, updateFormData }: FinancialSetupStepProps) {
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ];

  const riskToleranceOptions = [
    {
      id: 'CONSERVATIVE' as const,
      title: 'Conservative',
      description: 'Low risk, steady returns',
      icon: Shield,
      color: 'text-green-600',
    },
    {
      id: 'BALANCED' as const,
      title: 'Balanced',
      description: 'Moderate risk and returns',
      icon: Target,
      color: 'text-blue-600',
    },
    {
      id: 'AGGRESSIVE' as const,
      title: 'Aggressive',
      description: 'High risk, high potential returns',
      icon: Target,
      color: 'text-red-600',
    },
  ];

  const investmentHorizons = [
    { id: 'SHORT' as const, title: 'Short-term', description: '< 2 years' },
    { id: 'MEDIUM' as const, title: 'Medium-term', description: '2-7 years' },
    { id: 'LONG' as const, title: 'Long-term', description: '7+ years' },
  ];

  const formatCurrency = (amount: number) => {
    const currency = currencies.find(c => c.code === formData.currency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <WizardStep
      title="Financial Setup"
      description="Configure your portfolio's financial parameters"
    >
      {/* Currency Selection */}
      <div className="space-y-3">
        <label htmlFor="currency" className="block text-sm font-medium text-foreground">
          Base Currency *
        </label>
        <select
          id="currency"
          value={formData.currency}
          onChange={(e) => updateFormData({ currency: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.symbol} {currency.name} ({currency.code})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          This will be the base currency for all calculations and displays
        </p>
      </div>

      {/* Initial Balance */}
      <div className="space-y-3">
        <label htmlFor="initialBalance" className="block text-sm font-medium text-foreground">
          Initial Balance *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <input
            id="initialBalance"
            type="number"
            value={formData.initialBalance}
            onChange={(e) => updateFormData({ initialBalance: Number(e.target.value) })}
            placeholder="10000"
            min="100"
            step="100"
            className={`w-full pl-10 pr-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
              errors.initialBalance ? 'border-red-500' : 'border-border'
            }`}
          />
        </div>
        {errors.initialBalance && (
          <p className="text-sm text-red-500">{errors.initialBalance}</p>
        )}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Minimum: {formatCurrency(100)}</span>
          <span>Current: {formatCurrency(formData.initialBalance)}</span>
        </div>
      </div>

      {/* Risk Tolerance */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Risk Tolerance *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {riskToleranceOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = formData.riskTolerance === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateFormData({ riskTolerance: option.id })}
                className={`p-4 border rounded-lg text-left transition-all hover:border-primary ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-primary' : option.color}`} />
                  <div>
                    <h4 className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {option.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Investment Horizon */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Investment Horizon *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {investmentHorizons.map((horizon) => {
            const isSelected = formData.investmentHorizon === horizon.id;

            return (
              <button
                key={horizon.id}
                type="button"
                onClick={() => updateFormData({ investmentHorizon: horizon.id })}
                className={`p-4 border rounded-lg text-left transition-all hover:border-primary ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Clock className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <h4 className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {horizon.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {horizon.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Your investment timeline helps determine appropriate risk levels and asset allocation
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-3">Financial Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Initial Balance:</span>
            <div className="font-medium text-foreground">{formatCurrency(formData.initialBalance)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Risk Level:</span>
            <div className="font-medium text-foreground">{formData.riskTolerance}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Time Horizon:</span>
            <div className="font-medium text-foreground">
              {investmentHorizons.find(h => h.id === formData.investmentHorizon)?.title}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Currency:</span>
            <div className="font-medium text-foreground">{formData.currency}</div>
          </div>
        </div>
      </div>
    </WizardStep>
  );
}