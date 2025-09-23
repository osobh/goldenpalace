import { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, TrendingUp, TrendingDown, DollarSign, Target, Shield, AlertTriangle } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useChatStore } from '../../stores/chatStore';
import type { AssetType, TradeDirection } from '../../services/trading.service';
import type { Portfolio } from '../../services/portfolio.service';
import type { Group } from '../../services/chat.service';

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TradeType = 'real' | 'paper' | 'idea';
type WizardStep = 'type' | 'asset' | 'parameters' | 'target' | 'review';

interface TradeFormData {
  // Trade Type
  tradeType: TradeType;

  // Asset Selection
  symbol: string;
  assetType: AssetType;
  assetName?: string;

  // Trade Parameters
  direction: TradeDirection;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;

  // Target Selection
  targetPortfolio?: Portfolio;
  targetGroup?: Group;

  // Additional for Trade Ideas
  confidence?: number;
  timeframe?: string;
  rationale?: string;
  tags?: string[];
}

const WIZARD_STEPS: { id: WizardStep; title: string; description: string }[] = [
  { id: 'type', title: 'Trade Type', description: 'Choose your trading mode' },
  { id: 'asset', title: 'Asset Selection', description: 'Select the asset to trade' },
  { id: 'parameters', title: 'Trade Parameters', description: 'Set your entry and exit points' },
  { id: 'target', title: 'Target Selection', description: 'Choose where to execute' },
  { id: 'review', title: 'Review & Execute', description: 'Confirm your trade details' },
];

const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'STOCK', label: 'Stock', icon: '📈' },
  { value: 'CRYPTO', label: 'Crypto', icon: '₿' },
  { value: 'FOREX', label: 'Forex', icon: '💱' },
  { value: 'COMMODITY', label: 'Commodity', icon: '🛢️' },
  { value: 'INDEX', label: 'Index', icon: '📊' },
  { value: 'OPTION', label: 'Option', icon: '📑' },
];

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

export function NewTradeModal({ isOpen, onClose }: NewTradeModalProps) {
  const { createTradeIdea, createPaperPosition, isLoading } = useTradingStore();
  const { portfolios, addAssetToPortfolio } = usePortfolioStore();
  const { groups } = useChatStore();

  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<TradeFormData>({
    tradeType: 'paper',
    symbol: '',
    assetType: 'STOCK',
    direction: 'LONG',
    quantity: 100,
    entryPrice: 0,
    confidence: 3,
    timeframe: '1d',
    tags: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TradeFormData, string>>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<Record<keyof TradeFormData, string>> = {};

    switch (currentStep) {
      case 'asset':
        if (!formData.symbol.trim()) {
          newErrors.symbol = 'Symbol is required';
        }
        if (!formData.assetType) {
          newErrors.assetType = 'Asset type is required';
        }
        break;

      case 'parameters':
        if (!formData.entryPrice || formData.entryPrice <= 0) {
          newErrors.entryPrice = 'Valid entry price is required';
        }
        if (formData.tradeType !== 'idea' && formData.quantity <= 0) {
          newErrors.quantity = 'Valid quantity is required';
        }
        break;

      case 'target':
        if (formData.tradeType === 'real' && !formData.targetPortfolio) {
          newErrors.targetPortfolio = 'Please select a portfolio';
        }
        if ((formData.tradeType === 'paper' || formData.tradeType === 'idea') && !formData.targetGroup) {
          newErrors.targetGroup = 'Please select a group';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (isLastStep) {
        handleSubmit();
      } else {
        setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id);
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    try {
      let response;

      switch (formData.tradeType) {
        case 'real':
          // Add asset to portfolio
          if (formData.targetPortfolio) {
            response = await addAssetToPortfolio(formData.targetPortfolio.id, {
              symbol: formData.symbol.toUpperCase(),
              name: formData.assetName,
              assetType: formData.assetType,
              quantity: formData.quantity,
              averageCost: formData.entryPrice,
            });
          }
          break;

        case 'paper':
          // Create paper position
          if (formData.targetGroup) {
            response = await createPaperPosition({
              groupId: formData.targetGroup.id,
              symbol: formData.symbol.toUpperCase(),
              assetType: formData.assetType,
              quantity: formData.quantity,
              entryPrice: formData.entryPrice,
              stopLoss: formData.stopLoss,
              takeProfit: formData.takeProfit1,
            });
          }
          break;

        case 'idea':
          // Create trade idea
          if (formData.targetGroup) {
            response = await createTradeIdea({
              groupId: formData.targetGroup.id,
              symbol: formData.symbol.toUpperCase(),
              assetType: formData.assetType,
              direction: formData.direction,
              entryPrice: formData.entryPrice,
              stopLoss: formData.stopLoss,
              takeProfit1: formData.takeProfit1,
              takeProfit2: formData.takeProfit2,
              takeProfit3: formData.takeProfit3,
              timeframe: formData.timeframe,
              confidence: formData.confidence,
              rationale: formData.rationale,
              tags: formData.tags,
            });
          }
          break;
      }

      if (response?.success) {
        handleClose();
      } else {
        alert(response?.error || 'Failed to execute trade');
      }
    } catch (error) {
      alert('Failed to execute trade');
    }
  };

  const handleClose = () => {
    setCurrentStep('type');
    setFormData({
      tradeType: 'paper',
      symbol: '',
      assetType: 'STOCK',
      direction: 'LONG',
      quantity: 100,
      entryPrice: 0,
      confidence: 3,
      timeframe: '1d',
      tags: [],
    });
    setErrors({});
    setSearchQuery('');
    onClose();
  };

  const updateFormData = (updates: Partial<TradeFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(updates).forEach(key => {
        delete newErrors[key as keyof TradeFormData];
      });
      return newErrors;
    });
  };

  const calculateRiskReward = () => {
    if (!formData.entryPrice || !formData.stopLoss || !formData.takeProfit1) return null;

    const risk = Math.abs(formData.entryPrice - formData.stopLoss);
    const reward = Math.abs(formData.takeProfit1 - formData.entryPrice);
    const ratio = reward / risk;

    const totalRisk = risk * formData.quantity;
    const totalReward = reward * formData.quantity;

    return {
      ratio: ratio.toFixed(2),
      risk: totalRisk.toFixed(2),
      reward: totalReward.toFixed(2),
      riskPercent: ((risk / formData.entryPrice) * 100).toFixed(2),
      rewardPercent: ((reward / formData.entryPrice) * 100).toFixed(2),
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">New Trade</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-muted/30">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  index <= currentStepIndex
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`w-20 h-0.5 mx-2 transition-colors ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-medium text-foreground">
              {WIZARD_STEPS[currentStepIndex].title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {WIZARD_STEPS[currentStepIndex].description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
          {currentStep === 'type' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => updateFormData({ tradeType: 'real' })}
                  className={`p-4 border rounded-lg transition-colors ${
                    formData.tradeType === 'real'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <DollarSign className="h-8 w-8 mb-2 mx-auto text-primary" />
                  <h4 className="font-medium text-foreground">Real Trade</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Execute in your portfolio
                  </p>
                </button>

                <button
                  onClick={() => updateFormData({ tradeType: 'paper' })}
                  className={`p-4 border rounded-lg transition-colors ${
                    formData.tradeType === 'paper'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Shield className="h-8 w-8 mb-2 mx-auto text-blue-600" />
                  <h4 className="font-medium text-foreground">Paper Trade</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Practice without risk
                  </p>
                </button>

                <button
                  onClick={() => updateFormData({ tradeType: 'idea' })}
                  className={`p-4 border rounded-lg transition-colors ${
                    formData.tradeType === 'idea'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Target className="h-8 w-8 mb-2 mx-auto text-green-600" />
                  <h4 className="font-medium text-foreground">Trade Idea</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share with your group
                  </p>
                </button>
              </div>
            </div>
          )}

          {currentStep === 'asset' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Symbol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => updateFormData({ symbol: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.symbol ? 'border-red-500' : 'border-border'
                  }`}
                  placeholder="Enter symbol (e.g., AAPL, BTC-USD)"
                />
                {errors.symbol && (
                  <p className="mt-1 text-sm text-red-500">{errors.symbol}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Asset Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ASSET_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => updateFormData({ assetType: type.value })}
                      className={`p-2 border rounded-lg transition-colors ${
                        formData.assetType === type.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-lg mr-1">{type.icon}</span>
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Asset Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.assetName || ''}
                  onChange={(e) => updateFormData({ assetName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Apple Inc."
                />
              </div>
            </div>
          )}

          {currentStep === 'parameters' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateFormData({ direction: 'LONG' })}
                  className={`p-3 border rounded-lg transition-colors ${
                    formData.direction === 'LONG'
                      ? 'border-green-600 bg-green-600/10'
                      : 'border-border hover:border-green-600/50'
                  }`}
                >
                  <TrendingUp className="h-6 w-6 mb-1 mx-auto text-green-600" />
                  <span className="text-sm font-medium">Long</span>
                </button>

                <button
                  onClick={() => updateFormData({ direction: 'SHORT' })}
                  className={`p-3 border rounded-lg transition-colors ${
                    formData.direction === 'SHORT'
                      ? 'border-red-600 bg-red-600/10'
                      : 'border-border hover:border-red-600/50'
                  }`}
                >
                  <TrendingDown className="h-6 w-6 mb-1 mx-auto text-red-600" />
                  <span className="text-sm font-medium">Short</span>
                </button>
              </div>

              {formData.tradeType !== 'idea' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => updateFormData({ quantity: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.quantity ? 'border-red-500' : 'border-border'
                    }`}
                    min="0"
                    step="0.01"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Entry Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.entryPrice || ''}
                  onChange={(e) => updateFormData({ entryPrice: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.entryPrice ? 'border-red-500' : 'border-border'
                  }`}
                  min="0"
                  step="0.01"
                />
                {errors.entryPrice && (
                  <p className="mt-1 text-sm text-red-500">{errors.entryPrice}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    value={formData.stopLoss || ''}
                    onChange={(e) => updateFormData({ stopLoss: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Take Profit
                  </label>
                  <input
                    type="number"
                    value={formData.takeProfit1 || ''}
                    onChange={(e) => updateFormData({ takeProfit1: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {formData.tradeType === 'idea' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Take Profit 2
                      </label>
                      <input
                        type="number"
                        value={formData.takeProfit2 || ''}
                        onChange={(e) => updateFormData({ takeProfit2: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Take Profit 3
                      </label>
                      <input
                        type="number"
                        value={formData.takeProfit3 || ''}
                        onChange={(e) => updateFormData({ takeProfit3: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Timeframe
                      </label>
                      <select
                        value={formData.timeframe}
                        onChange={(e) => updateFormData({ timeframe: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {TIMEFRAMES.map(tf => (
                          <option key={tf} value={tf}>{tf}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confidence (1-5)
                      </label>
                      <input
                        type="number"
                        value={formData.confidence}
                        onChange={(e) => updateFormData({ confidence: Math.max(1, Math.min(5, parseInt(e.target.value) || 3)) })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="1"
                        max="5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rationale
                    </label>
                    <textarea
                      value={formData.rationale || ''}
                      onChange={(e) => updateFormData({ rationale: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Explain your trade setup..."
                    />
                  </div>
                </>
              )}

              {/* Risk/Reward Calculation */}
              {calculateRiskReward() && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-foreground mb-2">Risk/Reward Analysis</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ratio:</span>
                      <span className={`ml-2 font-medium ${
                        parseFloat(calculateRiskReward()!.ratio) >= 2
                          ? 'text-green-600'
                          : parseFloat(calculateRiskReward()!.ratio) >= 1
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        1:{calculateRiskReward()!.ratio}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Risk:</span>
                      <span className="ml-2 font-medium text-red-600">
                        ${calculateRiskReward()!.risk} ({calculateRiskReward()!.riskPercent}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reward:</span>
                      <span className="ml-2 font-medium text-green-600">
                        ${calculateRiskReward()!.reward} ({calculateRiskReward()!.rewardPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'target' && (
            <div className="space-y-4">
              {formData.tradeType === 'real' ? (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select Portfolio <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {portfolios.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No portfolios found. Create a portfolio first.
                      </p>
                    ) : (
                      portfolios.map(portfolio => (
                        <button
                          key={portfolio.id}
                          onClick={() => updateFormData({ targetPortfolio: portfolio })}
                          className={`w-full text-left p-3 border rounded-lg transition-colors ${
                            formData.targetPortfolio?.id === portfolio.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-foreground">{portfolio.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Balance: ${portfolio.currentValue.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-sm">
                              <span className={`font-medium ${
                                portfolio.totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {portfolio.totalReturnPct >= 0 ? '+' : ''}{portfolio.totalReturnPct.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {errors.targetPortfolio && (
                    <p className="mt-1 text-sm text-red-500">{errors.targetPortfolio}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select Group <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {groups.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No groups found. Join a group first.
                      </p>
                    ) : (
                      groups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => updateFormData({ targetGroup: group })}
                          className={`w-full text-left p-3 border rounded-lg transition-colors ${
                            formData.targetGroup?.id === group.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-foreground">{group.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {group.memberCount} members
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {errors.targetGroup && (
                    <p className="mt-1 text-sm text-red-500">{errors.targetGroup}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-foreground">Trade Summary</h4>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium capitalize">{formData.tradeType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Symbol:</span>
                    <span className="ml-2 font-medium">{formData.symbol}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Direction:</span>
                    <span className={`ml-2 font-medium ${
                      formData.direction === 'LONG' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formData.direction}
                    </span>
                  </div>
                  {formData.tradeType !== 'idea' && (
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2 font-medium">{formData.quantity}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Entry:</span>
                    <span className="ml-2 font-medium">${formData.entryPrice}</span>
                  </div>
                  {formData.stopLoss && (
                    <div>
                      <span className="text-muted-foreground">Stop Loss:</span>
                      <span className="ml-2 font-medium text-red-600">${formData.stopLoss}</span>
                    </div>
                  )}
                  {formData.takeProfit1 && (
                    <div>
                      <span className="text-muted-foreground">Take Profit:</span>
                      <span className="ml-2 font-medium text-green-600">${formData.takeProfit1}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Target:</span>
                    <span className="ml-2 font-medium">
                      {formData.tradeType === 'real'
                        ? formData.targetPortfolio?.name
                        : formData.targetGroup?.name}
                    </span>
                  </div>
                  {formData.tradeType !== 'idea' && formData.quantity && formData.entryPrice && (
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="ml-2 font-medium">
                        ${(formData.quantity * formData.entryPrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-yellow-900">Review Carefully</h5>
                    <p className="text-xs text-yellow-700 mt-1">
                      {formData.tradeType === 'real'
                        ? 'This will execute a real trade in your portfolio.'
                        : formData.tradeType === 'paper'
                        ? 'This will create a simulated position for tracking.'
                        : 'This will share your trade idea with the group.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="flex items-center space-x-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                <>
                  <span>{isLastStep ? 'Execute Trade' : 'Next'}</span>
                  {!isLastStep && <ArrowRight className="h-4 w-4" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}