import { ReactNode } from 'react';

interface WizardStepProps {
  title: string;
  description: string;
  children: ReactNode;
  isValid?: boolean;
  className?: string;
}

export function WizardStep({
  title,
  description,
  children,
  isValid,
  className = ''
}: WizardStepProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Validation Indicator */}
      {isValid !== undefined && (
        <div className="flex items-center justify-center">
          <div className={`h-2 w-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      )}
    </div>
  );
}