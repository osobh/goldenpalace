import { useState, useEffect } from 'react';
import { X, Plus, Info } from 'lucide-react';

// Asset Types from our enhanced schema
export type AssetType =
  | 'STOCK' | 'OPTION' | 'FUTURE' | 'COMMODITY_METALS' | 'COMMODITY_LIVESTOCK'
  | 'COMMODITY_ENERGY' | 'COMMODITY_AGRICULTURE' | 'REAL_ESTATE' | 'LAND'
  | 'BUSINESS' | 'CRYPTO' | 'BOND' | 'ETF' | 'FOREX' | 'INDEX';

export type ValuationMethod = 'MARKET_PRICE' | 'MANUAL' | 'APPRAISAL' | 'FORMULA';

interface AssetFormData {
  symbol: string;
  name: string;
  assetType: AssetType;
  subcategory?: string;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
  valuationMethod: ValuationMethod;
  description?: string;
  customAttributes?: Record<string, any>;
  notes?: string;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assetData: AssetFormData) => void;
  portfolioId: string;
}

// Asset category configurations
const assetCategories = {
  STOCK: {
    label: 'Stock',
    subcategories: ['Common Stock', 'Preferred Stock', 'REIT', 'Penny Stock'],
    fields: ['symbol', 'quantity', 'averageCost'],
    customFields: ['dividend_yield', 'sector', 'market_cap']
  },
  OPTION: {
    label: 'Option',
    subcategories: ['Call Option', 'Put Option', 'Covered Call', 'Protective Put'],
    fields: ['symbol', 'quantity', 'averageCost', 'strike_price', 'expiration_date'],
    customFields: ['option_type', 'underlying_asset', 'premium']
  },
  FUTURE: {
    label: 'Future',
    subcategories: ['Commodity Future', 'Stock Index Future', 'Currency Future', 'Interest Rate Future'],
    fields: ['symbol', 'quantity', 'averageCost', 'contract_size', 'expiration_date'],
    customFields: ['margin_requirement', 'tick_size', 'underlying_asset']
  },
  COMMODITY_METALS: {
    label: 'Precious Metals',
    subcategories: ['Gold', 'Silver', 'Platinum', 'Palladium', 'Copper'],
    fields: ['name', 'quantity', 'averageCost', 'weight_unit'],
    customFields: ['purity', 'storage_location', 'form'],
    defaultValuation: 'MANUAL' as ValuationMethod
  },
  COMMODITY_LIVESTOCK: {
    label: 'Livestock',
    subcategories: ['Cattle', 'Hogs', 'Sheep', 'Poultry'],
    fields: ['name', 'quantity', 'averageCost', 'location'],
    customFields: ['breed', 'age', 'weight', 'health_status'],
    defaultValuation: 'APPRAISAL' as ValuationMethod
  },
  COMMODITY_ENERGY: {
    label: 'Energy Commodities',
    subcategories: ['Crude Oil', 'Natural Gas', 'Gasoline', 'Heating Oil'],
    fields: ['name', 'quantity', 'averageCost', 'unit'],
    customFields: ['grade', 'delivery_location', 'contract_month']
  },
  COMMODITY_AGRICULTURE: {
    label: 'Agricultural Commodities',
    subcategories: ['Corn', 'Wheat', 'Soybeans', 'Cotton', 'Coffee', 'Sugar'],
    fields: ['name', 'quantity', 'averageCost', 'unit'],
    customFields: ['grade', 'harvest_season', 'storage_location']
  },
  REAL_ESTATE: {
    label: 'Real Estate',
    subcategories: ['Residential', 'Commercial', 'Industrial', 'Retail', 'Multifamily'],
    fields: ['name', 'averageCost', 'location'],
    customFields: ['property_type', 'square_footage', 'year_built', 'rental_income'],
    defaultValuation: 'APPRAISAL' as ValuationMethod,
    quantityLabel: 'Properties'
  },
  LAND: {
    label: 'Land',
    subcategories: ['Agricultural', 'Residential Development', 'Commercial Development', 'Recreational', 'Timber'],
    fields: ['name', 'averageCost', 'location', 'acreage'],
    customFields: ['zoning', 'soil_type', 'water_rights', 'mineral_rights'],
    defaultValuation: 'APPRAISAL' as ValuationMethod,
    quantityLabel: 'Acres'
  },
  BUSINESS: {
    label: 'Business',
    subcategories: ['Private Company', 'Partnership', 'Franchise', 'Sole Proprietorship'],
    fields: ['name', 'averageCost', 'ownership_percentage'],
    customFields: ['industry', 'employees', 'annual_revenue', 'valuation_date'],
    defaultValuation: 'APPRAISAL' as ValuationMethod,
    quantityLabel: 'Ownership %'
  },
  CRYPTO: {
    label: 'Cryptocurrency',
    subcategories: ['Bitcoin', 'Ethereum', 'Altcoin', 'Stablecoin', 'DeFi Token'],
    fields: ['symbol', 'quantity', 'averageCost'],
    customFields: ['wallet_address', 'staking_rewards', 'blockchain']
  },
  BOND: {
    label: 'Bond',
    subcategories: ['Government Bond', 'Corporate Bond', 'Municipal Bond', 'Treasury Bill'],
    fields: ['symbol', 'quantity', 'averageCost', 'face_value', 'maturity_date'],
    customFields: ['coupon_rate', 'credit_rating', 'yield_to_maturity']
  },
  ETF: {
    label: 'ETF',
    subcategories: ['Equity ETF', 'Bond ETF', 'Commodity ETF', 'Sector ETF', 'International ETF'],
    fields: ['symbol', 'quantity', 'averageCost'],
    customFields: ['expense_ratio', 'tracking_index', 'dividend_yield']
  },
  FOREX: {
    label: 'Foreign Exchange',
    subcategories: ['Major Pairs', 'Minor Pairs', 'Exotic Pairs', 'Cross Currency'],
    fields: ['symbol', 'quantity', 'averageCost'],
    customFields: ['base_currency', 'quote_currency', 'leverage']
  },
  INDEX: {
    label: 'Index',
    subcategories: ['Stock Index', 'Bond Index', 'Commodity Index', 'Real Estate Index'],
    fields: ['symbol', 'quantity', 'averageCost'],
    customFields: ['index_provider', 'component_count', 'weighting_method']
  }
};

export function AddAssetModal({ isOpen, onClose, onSubmit, portfolioId }: AddAssetModalProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    symbol: '',
    name: '',
    assetType: 'STOCK',
    quantity: 0,
    averageCost: 0,
    valuationMethod: 'MARKET_PRICE',
    customAttributes: {}
  });

  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentCategory = assetCategories[formData.assetType];

  useEffect(() => {
    if (currentCategory.defaultValuation) {
      setFormData(prev => ({
        ...prev,
        valuationMethod: currentCategory.defaultValuation!
      }));
    }
    // Reset custom fields when asset type changes
    setCustomFields({});
  }, [formData.assetType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.quantity <= 0) newErrors.quantity = 'Quantity must be greater than 0';
    if (formData.averageCost <= 0) newErrors.averageCost = 'Cost must be greater than 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare final data
    const finalData: AssetFormData = {
      ...formData,
      customAttributes: {
        ...formData.customAttributes,
        ...customFields
      }
    };

    onSubmit(finalData);
    onClose();
  };

  const handleReset = () => {
    setFormData({
      symbol: '',
      name: '',
      assetType: 'STOCK',
      quantity: 0,
      averageCost: 0,
      valuationMethod: 'MARKET_PRICE',
      customAttributes: {}
    });
    setCustomFields({});
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-semibold text-foreground">Add Asset</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Type Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Asset Category
            </label>
            <select
              value={formData.assetType}
              onChange={(e) => setFormData(prev => ({ ...prev, assetType: e.target.value as AssetType }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(assetCategories).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          {currentCategory.subcategories && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subcategory
              </label>
              <select
                value={formData.subcategory || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select subcategory...</option>
                {currentCategory.subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Symbol/Name fields */}
            {currentCategory.fields.includes('symbol') && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., AAPL"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.name ? 'border-red-500 bg-red-50' : 'border-input bg-background'
                }`}
                placeholder="Asset name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {currentCategory.quantityLabel || 'Quantity'}
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.quantity ? 'border-red-500 bg-red-50' : 'border-input bg-background'
                }`}
              />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
            </div>

            {/* Average Cost */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Average Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.averageCost}
                onChange={(e) => setFormData(prev => ({ ...prev, averageCost: parseFloat(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.averageCost ? 'border-red-500 bg-red-50' : 'border-input bg-background'
                }`}
              />
              {errors.averageCost && <p className="text-red-500 text-xs mt-1">{errors.averageCost}</p>}
            </div>

            {/* Current Price (for market-priced assets) */}
            {formData.valuationMethod === 'MARKET_PRICE' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentPrice || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPrice: parseFloat(e.target.value) || undefined }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Leave empty for auto-fetch"
                />
              </div>
            )}

            {/* Valuation Method */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Valuation Method
              </label>
              <select
                value={formData.valuationMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, valuationMethod: e.target.value as ValuationMethod }))}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="MARKET_PRICE">Market Price</option>
                <option value="MANUAL">Manual Valuation</option>
                <option value="APPRAISAL">Professional Appraisal</option>
                <option value="FORMULA">Formula-Based</option>
              </select>
            </div>
          </div>

          {/* Custom Fields */}
          {currentCategory.customFields && currentCategory.customFields.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-foreground mb-3">Additional Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentCategory.customFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    <input
                      type="text"
                      value={customFields[field] || ''}
                      onChange={(e) => setCustomFields(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder={`Enter ${field.replace('_', ' ')}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Private notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}