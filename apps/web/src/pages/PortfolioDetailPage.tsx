import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Edit2, Trash2, Settings } from 'lucide-react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { AddAssetModal } from '../components/portfolio/AddAssetModal';
import type { Portfolio } from '../services/portfolio.service';

export function PortfolioDetailPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const {
    selectedPortfolio,
    selectedPortfolioAssets,
    isLoading,
    error,
    selectPortfolio,
    fetchPortfolioAssets,
    clearSelection,
    addAssetToPortfolio,
  } = usePortfolioStore();

  const [showAddAssetModal, setShowAddAssetModal] = useState(false);

  const handleAddAsset = async (assetData: any) => {
    if (!portfolioId) return;

    try {
      const response = await addAssetToPortfolio(portfolioId, assetData);

      if (response.success) {
        setShowAddAssetModal(false);
      } else {
        alert(response.error || 'Failed to add asset');
      }
    } catch (error) {
      console.error('Error adding asset:', error);
      alert(error instanceof Error ? error.message : 'Failed to add asset');
    }
  };

  useEffect(() => {
    if (portfolioId) {
      selectPortfolio(portfolioId);
      fetchPortfolioAssets(portfolioId);
    }

    return () => {
      clearSelection();
    };
  }, [portfolioId, selectPortfolio, fetchPortfolioAssets, clearSelection]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedPortfolio?.currency || 'USD',
    }).format(amount);
  };

  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined || percentage === null) return '0.00%';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getReturnColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !selectedPortfolio) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {error || 'Portfolio not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{selectedPortfolio.name}</h1>
            {selectedPortfolio.description && (
              <p className="text-muted-foreground mt-1">{selectedPortfolio.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="inline-flex items-center px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          <button
            onClick={() => setShowAddAssetModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Total Value</h3>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(selectedPortfolio.totalValue)}
          </p>
          <p className="text-sm text-muted-foreground">
            Initial: {formatCurrency(selectedPortfolio.initialBalance)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Total Return</h3>
          <p className={`text-2xl font-bold ${getReturnColor(selectedPortfolio.totalReturn)}`}>
            {formatCurrency(selectedPortfolio.totalReturn)}
          </p>
          <p className={`text-sm ${getReturnColor(selectedPortfolio.totalReturn)}`}>
            {formatPercentage(selectedPortfolio.totalReturnPercentage)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Day Change</h3>
          <p className={`text-2xl font-bold ${getReturnColor(selectedPortfolio.dayChange)}`}>
            {formatCurrency(selectedPortfolio.dayChange)}
          </p>
          <p className={`text-sm ${getReturnColor(selectedPortfolio.dayChange)}`}>
            {formatPercentage(selectedPortfolio.dayChangePercentage)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Assets</h3>
          <p className="text-2xl font-bold text-foreground">{selectedPortfolioAssets.length}</p>
          <p className="text-sm text-muted-foreground">
            {selectedPortfolioAssets.length === 0 ? 'No assets' : 'Active positions'}
          </p>
        </div>
      </div>

      {/* Assets Section */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Assets</h2>
          <button
            onClick={() => setShowAddAssetModal(true)}
            className="inline-flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </button>
        </div>

        {selectedPortfolioAssets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="max-w-sm mx-auto">
              <div className="mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No assets yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your portfolio by adding your first asset.
              </p>
              <button
                onClick={() => setShowAddAssetModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Asset
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Asset</th>
                  <th className="text-right p-4 font-medium text-foreground">Quantity</th>
                  <th className="text-right p-4 font-medium text-foreground">Avg Price</th>
                  <th className="text-right p-4 font-medium text-foreground">Current Price</th>
                  <th className="text-right p-4 font-medium text-foreground">Value</th>
                  <th className="text-right p-4 font-medium text-foreground">P&L</th>
                  <th className="text-right p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedPortfolioAssets.map((asset) => (
                  <tr key={asset.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-foreground">{asset.symbol}</div>
                        <div className="text-sm text-muted-foreground">{asset.name}</div>
                      </div>
                    </td>
                    <td className="text-right p-4 text-foreground">{asset.quantity}</td>
                    <td className="text-right p-4 text-foreground">{formatCurrency(asset.averagePrice)}</td>
                    <td className="text-right p-4 text-foreground">{formatCurrency(asset.currentPrice)}</td>
                    <td className="text-right p-4 text-foreground">{formatCurrency(asset.totalValue)}</td>
                    <td className={`text-right p-4 ${getReturnColor(asset.unrealizedPnl)}`}>
                      {formatCurrency(asset.unrealizedPnl)}
                      <div className="text-xs">
                        {formatPercentage(asset.percentageGain)}
                      </div>
                    </td>
                    <td className="text-right p-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="p-1 hover:bg-muted rounded">
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button className="p-1 hover:bg-muted rounded">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        onSubmit={handleAddAsset}
        portfolioId={portfolioId || ''}
      />
    </div>
  );
}