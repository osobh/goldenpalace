import { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Globe, Lock, Shield } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import type { GroupType } from '../../services/chat.service';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupFormData {
  name: string;
  description: string;
  groupType: GroupType;
  maxMembers: number;
}

const WIZARD_STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Group name and description' },
  { id: 'privacy', title: 'Privacy Settings', description: 'Who can see and join your group' },
  { id: 'advanced', title: 'Advanced Options', description: 'Member limits and additional settings' },
] as const;

type WizardStep = typeof WIZARD_STEPS[number]['id'];

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { createGroup, isLoading } = useChatStore();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    groupType: 'PRIVATE',
    maxMembers: 100,
  });
  const [errors, setErrors] = useState<Partial<GroupFormData>>({});

  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<GroupFormData> = {};

    if (currentStep === 'basic') {
      if (!formData.name.trim()) {
        newErrors.name = 'Group name is required';
      } else if (formData.name.length > 100) {
        newErrors.name = 'Group name must be 100 characters or less';
      }

      if (formData.description.length > 500) {
        newErrors.description = 'Description must be 500 characters or less';
      }
    }

    if (currentStep === 'advanced') {
      if (formData.maxMembers < 2) {
        newErrors.maxMembers = 'Groups must allow at least 2 members';
      } else if (formData.maxMembers > 1000) {
        newErrors.maxMembers = 'Maximum 1000 members allowed';
      }
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
      const response = await createGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        groupType: formData.groupType,
        maxMembers: formData.maxMembers,
      });

      if (response.success) {
        handleClose();
      } else {
        alert(response.error || 'Failed to create group');
      }
    } catch (error) {
      alert('Failed to create group');
    }
  };

  const handleClose = () => {
    setCurrentStep('basic');
    setFormData({
      name: '',
      description: '',
      groupType: 'PRIVATE',
      maxMembers: 100,
    });
    setErrors({});
    onClose();
  };

  const updateFormData = (updates: Partial<GroupFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(updates).forEach(key => {
        delete newErrors[key as keyof GroupFormData];
      });
      return newErrors;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-foreground">Create New Group</h2>
          </div>
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
                  <div className={`w-12 h-0.5 mx-2 transition-colors ${
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
          {currentStep === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-border'
                  }`}
                  placeholder="Enter group name"
                  maxLength={100}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.name.length}/100 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${
                    errors.description ? 'border-red-500' : 'border-border'
                  }`}
                  placeholder="Describe your group's purpose..."
                  rows={3}
                  maxLength={500}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {currentStep === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Who can see and join this group?
                </h3>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="groupType"
                      value="PUBLIC"
                      checked={formData.groupType === 'PUBLIC'}
                      onChange={(e) => updateFormData({ groupType: e.target.value as GroupType })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-foreground">Public</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Anyone can find and join this group. The group will appear in search results.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="groupType"
                      value="PRIVATE"
                      checked={formData.groupType === 'PRIVATE'}
                      onChange={(e) => updateFormData({ groupType: e.target.value as GroupType })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-foreground">Private</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Only invited members can join. The group won't appear in search results.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="groupType"
                      value="INVITE_ONLY"
                      checked={formData.groupType === 'INVITE_ONLY'}
                      onChange={(e) => updateFormData({ groupType: e.target.value as GroupType })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-foreground">Invite Only</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Members can only join with an invite link. Maximum privacy and control.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Maximum Members
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    value={formData.maxMembers}
                    onChange={(e) => updateFormData({ maxMembers: parseInt(e.target.value) || 100 })}
                    className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.maxMembers ? 'border-red-500' : 'border-border'
                    }`}
                    min={2}
                    max={1000}
                  />
                  {errors.maxMembers && (
                    <p className="text-sm text-red-500">{errors.maxMembers}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Set the maximum number of members (2-1000). You can change this later.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium">Name:</span> {formData.name}</p>
                  {formData.description && (
                    <p><span className="font-medium">Description:</span> {formData.description}</p>
                  )}
                  <p><span className="font-medium">Privacy:</span> {formData.groupType}</p>
                  <p><span className="font-medium">Max Members:</span> {formData.maxMembers}</p>
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
                  <span>{isLastStep ? 'Create Group' : 'Next'}</span>
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