import { User, Globe, Lock, BookOpen, DollarSign, TrendingUp } from 'lucide-react';
import { WizardStep } from '../WizardStep';
import type { PortfolioFormData, ValidationErrors } from '../hooks/usePortfolioWizard';

interface BasicInformationStepProps {
  formData: PortfolioFormData;
  errors: ValidationErrors;
  updateFormData: (updates: Partial<PortfolioFormData>) => void;
}

export function BasicInformationStep({ formData, errors, updateFormData }: BasicInformationStepProps) {
  const portfolioTypes = [
    {
      id: 'PAPER' as const,
      title: 'Paper Trading',
      description: 'Practice trading with virtual money - perfect for learning',
      icon: BookOpen,
      recommended: true,
    },
    {
      id: 'REAL' as const,
      title: 'Real Money',
      description: 'Track your actual investments and trades',
      icon: DollarSign,
    },
    {
      id: 'EDUCATIONAL' as const,
      title: 'Educational',
      description: 'Learning-focused portfolio with guided examples',
      icon: TrendingUp,
    },
  ];

  return (
    <WizardStep
      title="Basic Information"
      description="Let's start by setting up the basics of your portfolio"
    >
      {/* Portfolio Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          Portfolio Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="e.g., My Growth Portfolio"
          className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-border'
          }`}
          maxLength={50}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.name.length}/50 characters
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-foreground">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Describe your investment strategy and goals..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${
            errors.description ? 'border-red-500' : 'border-border'
          }`}
          maxLength={200}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.description.length}/200 characters
        </p>
      </div>

      {/* Portfolio Type */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Portfolio Type *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {portfolioTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.portfolioType === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => updateFormData({ portfolioType: type.id })}
                className={`relative p-4 border rounded-lg text-left transition-all hover:border-primary ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                {type.recommended && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {type.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Privacy Settings
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateFormData({ isPublic: false })}
            className={`p-4 border rounded-lg text-left transition-all ${
              !formData.isPublic
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-card hover:bg-muted/50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <Lock className={`h-5 w-5 mt-0.5 ${!formData.isPublic ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <h4 className={`font-medium ${!formData.isPublic ? 'text-primary' : 'text-foreground'}`}>
                  Private
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Only you can see this portfolio
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateFormData({ isPublic: true })}
            className={`p-4 border rounded-lg text-left transition-all ${
              formData.isPublic
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-card hover:bg-muted/50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <Globe className={`h-5 w-5 mt-0.5 ${formData.isPublic ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <h4 className={`font-medium ${formData.isPublic ? 'text-primary' : 'text-foreground'}`}>
                  Public
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Others can discover and follow your portfolio
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </WizardStep>
  );
}