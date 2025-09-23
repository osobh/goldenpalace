import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Trophy, Calendar, DollarSign, Users, Shield, AlertCircle } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useCompetitionStore } from '../../stores/competitionStore';
import { useAuthStore } from '../../stores/authStore';
import {
  CompetitionType,
  ScoringMetric,
  type CreateCompetitionRequest,
  type CompetitionRules
} from '../../services/competition.service';

interface CreateCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'basic' | 'type' | 'rules' | 'duration' | 'prizes';

const WIZARD_STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Name and group selection' },
  { id: 'type', title: 'Competition Type', description: 'Choose competition format' },
  { id: 'rules', title: 'Rules & Restrictions', description: 'Set trading rules' },
  { id: 'duration', title: 'Duration', description: 'Start and end dates' },
  { id: 'prizes', title: 'Prizes & Fees', description: 'Prize pool and entry fees' }
];

const COMPETITION_TYPES = [
  {
    type: CompetitionType.WEEKLY_PNL,
    name: 'Weekly P&L',
    description: 'Highest profit/loss over 7 days',
    duration: 7,
    metric: ScoringMetric.TOTAL_RETURN,
    icon: '📈'
  },
  {
    type: CompetitionType.MONTHLY_ROI,
    name: 'Monthly ROI',
    description: 'Best percentage return over 30 days',
    duration: 30,
    metric: ScoringMetric.PERCENTAGE_RETURN,
    icon: '📊'
  },
  {
    type: CompetitionType.BEST_TRADE,
    name: 'Best Trade',
    description: 'Single highest profitable trade',
    duration: 14,
    metric: ScoringMetric.BEST_SINGLE_TRADE,
    icon: '🎯'
  },
  {
    type: CompetitionType.CONSISTENCY,
    name: 'Consistency Champion',
    description: 'Most stable daily returns',
    duration: 21,
    metric: ScoringMetric.SHARPE_RATIO,
    icon: '🛡️'
  },
  {
    type: CompetitionType.CUSTOM,
    name: 'Custom Competition',
    description: 'Define your own rules',
    duration: 7,
    metric: ScoringMetric.TOTAL_RETURN,
    icon: '⚙️'
  }
];

export function CreateCompetitionModal({ isOpen, onClose }: CreateCompetitionModalProps) {
  const { user } = useAuthStore();
  const { groups } = useChatStore();
  const { createCompetition } = useCompetitionStore();

  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<CreateCompetitionRequest>>({
    groupId: groups.length > 0 ? groups[0].id : '',
    name: '',
    description: '',
    type: CompetitionType.WEEKLY_PNL,
    scoringMetric: ScoringMetric.TOTAL_RETURN,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    entryFee: 0,
    prizePool: 1000,
    minParticipants: 2,
    maxParticipants: 100,
    isPrivate: false,
    rules: {
      startingBalance: 100000,
      minTrades: 5,
      maxDrawdown: 20,
      stopLossRequired: false
    }
  });

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex].id as WizardStep);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex].id as WizardStep);
    }
  };

  const handleSelectType = (type: typeof COMPETITION_TYPES[0]) => {
    setFormData({
      ...formData,
      type: type.type,
      scoringMetric: type.metric,
      endDate: new Date(Date.now() + type.duration * 24 * 60 * 60 * 1000).toISOString()
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Please login to create a competition');
      return;
    }

    if (!formData.groupId || !formData.name || !formData.type) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const competition = await createCompetition({
        ...formData,
        createdBy: user.id,
        rules: formData.rules || { startingBalance: 100000 }
      } as CreateCompetitionRequest);

      onClose();
      // Optionally navigate to the competition page
      // navigate(`/competitions/${competition.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create competition');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Create Competition</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index < WIZARD_STEPS.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div
                className={`flex flex-col items-center ${
                  step.id === currentStep
                    ? 'text-primary'
                    : index < currentStepIndex
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                    step.id === currentStep
                      ? 'bg-primary border-primary text-primary-foreground'
                      : index < currentStepIndex
                      ? 'bg-muted border-muted-foreground'
                      : 'bg-background border-muted-foreground/50'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentStepIndex
                      ? 'bg-muted-foreground'
                      : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 min-h-[400px]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm text-red-500">{error}</span>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 'basic' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Select Group
                </label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Competition Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Weekly Trading Championship"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Describe your competition..."
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isPrivate}
                    onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    Private competition (invite only)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Competition Type */}
          {currentStep === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Choose Competition Type</h3>

              <div className="grid grid-cols-1 gap-3">
                {COMPETITION_TYPES.map((type) => (
                  <div
                    key={type.type}
                    onClick={() => handleSelectType(type)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.type === type.type
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{type.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>Duration: {type.duration} days</span>
                          <span>Metric: {type.metric.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Rules & Restrictions */}
          {currentStep === 'rules' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Trading Rules</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Starting Balance
                  </label>
                  <input
                    type="number"
                    value={formData.rules?.startingBalance}
                    onChange={(e) => setFormData({
                      ...formData,
                      rules: { ...formData.rules!, startingBalance: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Min Trades Required
                  </label>
                  <input
                    type="number"
                    value={formData.rules?.minTrades || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      rules: { ...formData.rules!, minTrades: e.target.value ? parseInt(e.target.value) : undefined }
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Max Drawdown (%)
                  </label>
                  <input
                    type="number"
                    value={formData.rules?.maxDrawdown}
                    onChange={(e) => setFormData({
                      ...formData,
                      rules: { ...formData.rules!, maxDrawdown: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Max Position Size
                  </label>
                  <input
                    type="number"
                    value={formData.rules?.maxPositionSize}
                    onChange={(e) => setFormData({
                      ...formData,
                      rules: { ...formData.rules!, maxPositionSize: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.rules?.stopLossRequired}
                    onChange={(e) => setFormData({
                      ...formData,
                      rules: { ...formData.rules!, stopLossRequired: e.target.checked }
                    })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    Stop loss required for all trades
                  </span>
                </label>
              </div>

              {formData.type === CompetitionType.CUSTOM && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Allowed Assets (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.rules?.allowedAssets?.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      rules: {
                        ...formData.rules!,
                        allowedAssets: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., AAPL, GOOGL, TSLA"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Duration */}
          {currentStep === 'duration' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Competition Duration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate?.slice(0, 16)}
                    onChange={(e) => setFormData({
                      ...formData,
                      startDate: new Date(e.target.value).toISOString()
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate?.slice(0, 16)}
                    onChange={(e) => setFormData({
                      ...formData,
                      endDate: new Date(e.target.value).toISOString()
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min={formData.startDate?.slice(0, 16)}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Competition duration:{' '}
                    {formData.startDate && formData.endDate && (
                      <span className="font-medium text-foreground">
                        {Math.ceil(
                          (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Min Participants
                  </label>
                  <input
                    type="number"
                    value={formData.minParticipants}
                    onChange={(e) => setFormData({
                      ...formData,
                      minParticipants: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({
                      ...formData,
                      maxParticipants: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min={formData.minParticipants || 2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Prizes & Fees */}
          {currentStep === 'prizes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Prizes & Entry Fees</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Entry Fee ($)
                  </label>
                  <input
                    type="number"
                    value={formData.entryFee || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      entryFee: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Prize Pool ($)
                  </label>
                  <input
                    type="number"
                    value={formData.prizePool}
                    onChange={(e) => setFormData({
                      ...formData,
                      prizePool: parseFloat(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expected from fees:</span>
                  <span className="font-medium text-foreground">
                    ${((formData.entryFee || 0) * (formData.minParticipants || 0)).toFixed(2)}
                    {' - '}
                    ${((formData.entryFee || 0) * (formData.maxParticipants || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <h4 className="text-sm font-medium text-foreground mb-2">Prize Distribution</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🥇 1st Place (50%):</span>
                      <span className="text-foreground">${((formData.prizePool || 0) * 0.5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🥈 2nd Place (30%):</span>
                      <span className="text-foreground">${((formData.prizePool || 0) * 0.3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🥉 3rd Place (20%):</span>
                      <span className="text-foreground">${((formData.prizePool || 0) * 0.2).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0 || isSubmitting}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentStepIndex === 0 || isSubmitting
                ? 'text-muted-foreground bg-muted cursor-not-allowed'
                : 'text-foreground bg-secondary hover:bg-secondary/80'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            {currentStepIndex === WIZARD_STEPS.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name || !formData.groupId}
                className="flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-1" />
                    Create Competition
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
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