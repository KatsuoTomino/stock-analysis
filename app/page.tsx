'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, TrendingUp, BarChart3, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface Stock {
  id: number;
  code: string;
  name: string;
  purchase_price: number;
  shares: number;
  purchase_amount: number;
  dividend_amount: number | null;
  memo: string | null;
  industry: string | null;
  payout_ratio: number | null;
  created_at: string;
  updated_at: string;
}

interface StockWithPrice extends Stock {
  currentPrice: number | null;
  priceLoading: boolean;
  priceError: string | null;
  dividendAmount: number | null; // 一株配当（年間、円）
  dividendYieldAtPurchase: number | null; // 取得株価の配当利回り（%）
  dividendYieldAtCurrent: number | null; // 現在株価の配当利回り（%）
  infoLoading: boolean;
}

export default function Home() {
  const { data: session } = useSession();
  const [stocks, setStocks] = useState<StockWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'profitLoss' | 'dividendYield'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [newStockCode, setNewStockCode] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    // 銘柄一覧が読み込まれたら、各銘柄の株価を取得
    if (stocks.length > 0 && !loading && stocks.every(s => s.currentPrice === null && !s.priceLoading)) {
      fetchStockPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks.length, loading]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stocks');
      if (!response.ok) {
        throw new Error('銘柄の取得に失敗しました');
      }
      const data: Stock[] = await response.json();
      // 株価情報と配当情報を初期化
      // データベースから取得した数値が文字列の場合があるため、数値に変換
      const stocksWithPrice: StockWithPrice[] = data.map((stock) => ({
        ...stock,
        purchase_price: typeof stock.purchase_price === 'string' 
          ? parseFloat(stock.purchase_price) 
          : stock.purchase_price,
        shares: typeof stock.shares === 'string' 
          ? parseInt(stock.shares, 10) 
          : stock.shares,
        purchase_amount: typeof stock.purchase_amount === 'string' 
          ? parseFloat(stock.purchase_amount) 
          : stock.purchase_amount,
        memo: stock.memo || null, // 明示的にnullを設定
        industry: stock.industry || null,
        payout_ratio: stock.payout_ratio 
          ? (typeof stock.payout_ratio === 'string' ? parseFloat(stock.payout_ratio) : stock.payout_ratio)
          : null,
        currentPrice: null,
        priceLoading: false,
        priceError: null,
        dividendAmount: stock.dividend_amount || null,
        dividendYieldAtPurchase: null,
        dividendYieldAtCurrent: null,
        infoLoading: false,
      }));
      setStocks(stocksWithPrice);
      setError(null);
      
      // 配当情報の取得は、fetchStockPricesの後に実行されるため、ここでは呼び出さない
    } catch (err) {
      console.error('銘柄取得エラー:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      } else {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。しばらく待ってから再度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStockPrices = async () => {
    // 既に取得中の場合はスキップ
    if (priceLoading) return;
    
    setPriceLoading(true);
    
    // 現在のstocksの状態を取得
    const currentStocks = stocks;
    
    // 株価を取得する必要がある銘柄をフィルタ
    const stocksToFetch = currentStocks.filter(
      stock => stock.currentPrice === null && !stock.priceLoading
    );
    
    console.log(`[株価取得] 開始: ${stocksToFetch.length}件の銘柄を取得します`);
    
    // 各銘柄の株価を順次取得（レート制限対策）
    const updatedStocks = await Promise.all(
      currentStocks.map(async (stock, index) => {
        // 既に取得済みの場合はスキップ
        if (stock.currentPrice !== null || stock.priceLoading) {
          return stock;
        }

        try {
          // 株価取得中フラグを設定
          setStocks((prev) =>
            prev.map((s) =>
              s.id === stock.id ? { ...s, priceLoading: true, priceError: null } : s
            )
          );

          console.log(`[株価取得] ${index + 1}/${stocksToFetch.length}: ${stock.code} (${stock.name})`);

          const response = await fetch(`/api/stocks/${stock.id}/price`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || '株価の取得に失敗しました');
          }
          const data = await response.json();
          
          if (!data.price || data.price <= 0) {
            throw new Error('有効な株価データが取得できませんでした');
          }
          
          console.log(`[株価取得] 成功: ${stock.code} = ${data.price}円`);
          
          // 配当情報を保持
          return {
            ...stock,
            currentPrice: data.price,
            priceLoading: false,
            priceError: null,
            dividendAmount: stock.dividendAmount,
            dividendYieldAtPurchase: stock.dividendYieldAtPurchase,
            dividendYieldAtCurrent: stock.dividendYieldAtCurrent,
          };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '株価取得エラー';
          console.error(`[株価取得] エラー: ${stock.code} - ${errorMessage}`);
          
          // 配当情報を保持
          return {
            ...stock,
            currentPrice: null,
            priceLoading: false,
            priceError: errorMessage,
            dividendAmount: stock.dividendAmount,
            dividendYieldAtPurchase: stock.dividendYieldAtPurchase,
            dividendYieldAtCurrent: stock.dividendYieldAtCurrent,
          };
        } finally {
          // レート制限対策: リクエスト間に少し待機（最後のリクエスト以外）
          if (index < stocksToFetch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      })
    );
    
    const successCount = updatedStocks.filter(s => s.currentPrice !== null).length;
    console.log(`[株価取得] 完了: ${successCount}/${stocksToFetch.length} 件取得成功`);

    setStocks(updatedStocks);
    setPriceLoading(false);
    
    // 株価取得後に配当情報を更新（updatedStocksを渡す）
    // currentPriceが設定されていることを確認してから配当情報を取得
    const stocksWithPrice = updatedStocks.filter(s => s.currentPrice !== null);
    if (stocksWithPrice.length > 0) {
      setTimeout(() => {
        fetchDividendInfo(updatedStocks);
      }, 1000);
      // 株式情報（業種・配当性向）も取得
      setTimeout(() => {
        fetchStockInfo(updatedStocks);
      }, 2000);
    } else {
      console.log('株価が取得できていないため、配当情報の取得をスキップします');
    }
  };

  const fetchStockInfo = async (stocksList?: StockWithPrice[]) => {
    const targetStocks = stocksList || stocks;
    
    // 業種と配当性向がまだ取得されていない銘柄のみ取得
    const stocksToFetch = targetStocks.filter(
      stock => !stock.industry && !stock.payout_ratio && !stock.infoLoading
    );
    
    if (stocksToFetch.length === 0) {
      console.log('[株式情報取得] 取得が必要な銘柄がありません');
      return;
    }
    
    console.log(`[株式情報取得] 開始: ${stocksToFetch.length}件の銘柄を取得します`);
    
    // 各銘柄の情報を順次取得（レート制限対策）
    for (const stock of stocksToFetch) {
      try {
        // ローディング状態を設定
        setStocks((prev) =>
          prev.map((s) =>
            s.id === stock.id ? { ...s, infoLoading: true } : s
          )
        );
        
        const response = await fetch(`/api/stocks/${stock.id}/info`);
        if (response.ok) {
          const data = await response.json();
          
          setStocks((prev) =>
            prev.map((s) =>
              s.id === stock.id 
                ? { 
                    ...s, 
                    industry: data.industry, 
                    payout_ratio: data.payoutRatio,
                    infoLoading: false 
                  } 
                : s
            )
          );
          console.log(`[株式情報取得] 成功: ${stock.code} - 業種: ${data.industry}, 配当性向: ${data.payoutRatio}%`);
        } else {
          setStocks((prev) =>
            prev.map((s) =>
              s.id === stock.id ? { ...s, infoLoading: false } : s
            )
          );
        }
      } catch (err) {
        console.error(`[株式情報取得] エラー: ${stock.code}`, err);
        setStocks((prev) =>
          prev.map((s) =>
            s.id === stock.id ? { ...s, infoLoading: false } : s
          )
        );
      }
      
      // レート制限対策: リクエスト間に少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[株式情報取得] 完了');
  };

  const fetchDividendInfo = async (stocksList?: StockWithPrice[]) => {
    // stocksListが渡されていない場合は、現在の状態を使用
    const targetStocks = stocksList || stocks;
    
    // 各銘柄の配当情報を更新（stocksテーブルから取得したdividend_amountを使用）
    setStocks((prevStocks) => {
      return prevStocks.map((stock) => {
        const dividendAmount = stock.dividend_amount || null;
        
        if (!dividendAmount || dividendAmount <= 0) {
          return {
            ...stock,
            dividendAmount: null,
            dividendYieldAtPurchase: null,
            dividendYieldAtCurrent: null,
          };
        }
        
        // 取得株価の配当利回り = (一株配当 ÷ 取得株価) × 100
        const dividendYieldAtPurchase = stock.purchase_price > 0
          ? (dividendAmount / stock.purchase_price) * 100
          : null;
        
        // 現在株価の配当利回り = (100株あたり配当 ÷ 現在株価) × 100
        // 100株あたり配当 = 一株配当 × 100
        // 配当利回り = (100株あたり配当 ÷ 現在株価) = (一株配当 × 100 ÷ 現在株価)
        // ただし、dividendAmountは1株あたりなので、100株あたりは dividendAmount * 100
        // 配当利回り(%) = (100株あたり配当 ÷ 現在株価) = (dividendAmount * 100 ÷ currentPrice)
        const dividendYieldAtCurrent = stock.currentPrice && stock.currentPrice > 0
          ? (dividendAmount * 100) / stock.currentPrice
          : null;
        
        return {
          ...stock,
          dividendAmount,
          dividendYieldAtPurchase,
          dividendYieldAtCurrent,
        };
      });
    });
  };

  const handleRegisterStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockCode || !/^\d{4}$/.test(newStockCode)) {
      setError('有効な4桁の銘柄コードを入力してください');
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      const response = await fetch('/api/stocks/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: newStockCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '銘柄の登録に失敗しました');
      }

      const newStock = await response.json();
      setNewStockCode('');
      
      // 銘柄一覧を再取得
      await fetchStocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '銘柄の登録に失敗しました');
    } finally {
      setRegistering(false);
    }
  };


  const handleDelete = async (id: number) => {
    if (!confirm('この銘柄を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/stocks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      // 一覧を再取得
      fetchStocks();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const calculateCurrentValue = (stock: StockWithPrice): number | null => {
    if (stock.currentPrice === null) return null;
    return stock.currentPrice * stock.shares;
  };

  const calculateProfitLoss = (stock: StockWithPrice): number | null => {
    const currentValue = calculateCurrentValue(stock);
    if (currentValue === null) return null;
    return currentValue - stock.purchase_amount;
  };

  const calculateProfitLossRate = (stock: StockWithPrice): number | null => {
    // 取得株価が設定されていない場合はnullを返す（"-"として表示）
    if (!stock.purchase_price || stock.purchase_price <= 0) {
      return null;
    }
    const profitLoss = calculateProfitLoss(stock);
    if (profitLoss === null) return null;
    // purchase_amountが0の場合はnullを返す
    if (!stock.purchase_amount || stock.purchase_amount <= 0) {
      return null;
    }
    return (profitLoss / stock.purchase_amount) * 100;
  };

  // サマリー計算
  const calculateSummary = () => {
    const totalInvestment = stocks.reduce((sum, stock) => sum + stock.purchase_amount, 0);
    
    const totalCurrentValue = stocks.reduce((sum, stock) => {
      const currentValue = calculateCurrentValue(stock);
      return sum + (currentValue !== null ? currentValue : 0);
    }, 0);

    const totalProfitLoss = totalCurrentValue - totalInvestment;
    const totalProfitLossRate = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

    // ポートフォリオ全体の配当利回り計算
    // 各銘柄の配当金額を取得時金額で加重平均
    let totalDividendAmount = 0;
    
    stocks.forEach((stock) => {
      if (stock.dividendAmount !== null && stock.dividendAmount > 0) {
        const weightedDividend = stock.dividendAmount * stock.shares;
        totalDividendAmount += weightedDividend;
      }
    });

    const portfolioDividendYield = totalInvestment > 0 && totalDividendAmount > 0
      ? (totalDividendAmount / totalInvestment) * 100
      : null;

    // 配当金の累計（20%の税抜き後）
    const totalDividendAfterTax = totalDividendAmount * 0.8;

    return {
      totalInvestment,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossRate,
      portfolioDividendYield,
      totalDividendAmount,
      totalDividendAfterTax,
    };
  };

  // フィルタリングとソート
  const filteredAndSortedStocks = stocks
    .filter((stock) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        stock.code.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'profitLoss') {
        const profitLossA = calculateProfitLoss(a) || 0;
        const profitLossB = calculateProfitLoss(b) || 0;
        return profitLossB - profitLossA; // 降順
      } else if (sortBy === 'dividendYield') {
        const yieldA = a.dividendYieldAtCurrent || a.dividendYieldAtPurchase || 0;
        const yieldB = b.dividendYieldAtCurrent || b.dividendYieldAtPurchase || 0;
        return yieldB - yieldA; // 降順
      }
      // デフォルト順: ID順（登録順）
      return a.id - b.id;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg blur-sm opacity-50"></div>
              <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-3">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Tomikawa Finance
              </h1>
              <p className="text-sm text-gray-600 mt-1">ポートフォリオ管理システム</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{session.user?.name}</span> としてログイン中
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <LogOut size={18} />
              ログアウト
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        {(() => {
          const summary = calculateSummary();
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">総投資金額</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalInvestment)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">総評価額</p>
                <p className="text-xl font-bold text-gray-900">
                  {summary.totalCurrentValue > 0 ? formatCurrency(summary.totalCurrentValue) : '-'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">総損益金額</p>
                <p className={`text-xl font-bold ${summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.totalCurrentValue > 0 ? formatCurrency(summary.totalProfitLoss) : '-'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">総損益率</p>
                <p className={`text-xl font-bold ${summary.totalProfitLossRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.totalCurrentValue > 0 ? formatPercentage(summary.totalProfitLossRate) : '-'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">ポートフォリオ配当利回り</p>
                <p className="text-xl font-bold text-blue-600">
                  {summary.portfolioDividendYield !== null ? `${summary.portfolioDividendYield.toFixed(2)}%` : '-'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">配当金累計（税抜）</p>
                <p className="text-xl font-bold text-purple-600">
                  {summary.totalDividendAfterTax > 0 ? formatCurrency(summary.totalDividendAfterTax) : '-'}
                </p>
              </div>
            </div>
          );
        })()}

        {/* 新規登録フォーム */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">新規銘柄登録</h2>
          <form onSubmit={handleRegisterStock} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="銘柄コード（4桁の数字、例: 7203）"
                value={newStockCode}
                onChange={(e) => setNewStockCode(e.target.value)}
                pattern="[0-9]{4}"
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={registering || !newStockCode}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {registering ? '登録中...' : '登録'}
            </button>
          </form>
        </div>

        {/* 検索・ソート機能 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="銘柄コードまたは銘柄名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'default' | 'profitLoss' | 'dividendYield')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="default">デフォルト順</option>
                <option value="profitLoss">損益金額順</option>
                <option value="dividendYield">配当利回り順</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    fetchStocks();
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  再試行
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-700 mt-4">読み込み中...</p>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-700 mb-4">銘柄が登録されていません</p>
            <p className="text-sm text-gray-600">銘柄コードを入力して登録してください</p>
          </div>
        ) : filteredAndSortedStocks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-700 mb-4">検索条件に一致する銘柄が見つかりません</p>
            <p className="text-sm text-gray-600">検索キーワードを変更してください</p>
          </div>
        ) : (
          <>
            {/* デスクトップ: テーブル表示 */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      銘柄コード
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      銘柄名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      業種
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      取得株価
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      現在株価
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      株数
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      現在評価額
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      損益金額
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      損益率
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      配当金
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      配当性向
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      取得株価配当利回り
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      現在株価配当利回り
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ minWidth: '250px', maxWidth: '300px' }}>
                      メモ
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      削除
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedStocks.map((stock) => {
                    const currentValue = calculateCurrentValue(stock);
                    const profitLoss = calculateProfitLoss(stock);
                    const profitLossRate = calculateProfitLossRate(stock);

                    return (
                      <tr key={stock.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/stocks/${stock.id}`}
                            className="text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            {stock.code}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/stocks/${stock.id}`}
                            className="text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            {stock.name}
                          </Link>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stock.infoLoading ? (
                            <span className="text-gray-500">取得中...</span>
                          ) : stock.industry ? (
                            <span className="text-gray-900">{stock.industry}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {stock.purchase_price > 0 ? (
                            formatCurrency(stock.purchase_price)
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {stock.priceLoading ? (
                            <span className="text-gray-600">取得中...</span>
                          ) : stock.currentPrice !== null ? (
                            formatCurrency(stock.currentPrice)
                          ) : (
                            <span className="text-red-500" title={stock.priceError || '取得失敗'}>
                              取得失敗
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {stock.shares > 0 ? (
                            `${stock.shares.toLocaleString()}株`
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {currentValue !== null ? (
                            formatCurrency(currentValue)
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {profitLoss !== null ? (
                            <span
                              className={
                                profitLoss >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                              }
                            >
                              {formatCurrency(profitLoss)}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {profitLossRate !== null ? (
                            <span
                              className={
                                profitLossRate >= 0
                                  ? 'text-green-600 font-medium'
                                  : 'text-red-600 font-medium'
                              }
                            >
                              {formatPercentage(profitLossRate)}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {stock.dividendAmount !== null && stock.shares > 0 ? (
                            <span className="text-gray-900 font-semibold">
                              {formatCurrency(stock.dividendAmount * stock.shares)}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          {stock.infoLoading ? (
                            <span className="text-gray-500">取得中...</span>
                          ) : stock.payout_ratio !== null && stock.payout_ratio > 0 ? (
                            <span className={`font-medium ${stock.payout_ratio > 80 ? 'text-red-600' : stock.payout_ratio > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {stock.payout_ratio.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {stock.dividendYieldAtPurchase !== null ? (
                            <span className="text-blue-600 font-medium">
                              {stock.dividendYieldAtPurchase.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {stock.dividendYieldAtCurrent !== null ? (
                            <span className="text-green-600 font-medium">
                              {stock.dividendYieldAtCurrent.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900" style={{ minWidth: '250px', maxWidth: '300px' }}>
                          {stock.memo && stock.memo.trim() ? (
                            <div 
                              className="text-gray-900 break-words" 
                              title={stock.memo} 
                              style={{ 
                                wordBreak: 'break-word', 
                                whiteSpace: 'normal',
                                writingMode: 'horizontal-tb',
                                textOrientation: 'mixed',
                                lineHeight: '1.6',
                                display: 'block',
                                overflowWrap: 'break-word',
                                wordWrap: 'break-word'
                              }}
                            >
                              {stock.memo}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleDelete(stock.id)}
                              className="text-red-600 hover:text-red-900"
                              title="削除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* モバイル: カード表示 */}
          <div className="md:hidden space-y-4">
            {filteredAndSortedStocks.map((stock) => {
              const currentValue = calculateCurrentValue(stock);
              const profitLoss = calculateProfitLoss(stock);
              const profitLossRate = calculateProfitLossRate(stock);

              return (
                <div key={stock.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link
                        href={`/stocks/${stock.id}`}
                        className="text-lg font-bold text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {stock.name}
                      </Link>
                      <p className="text-sm text-gray-700">{stock.code}</p>
                      {stock.industry && (
                        <p className="text-xs text-gray-500 mt-1">{stock.industry}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(stock.id)}
                        className="text-red-600 hover:text-red-900"
                        title="削除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-900 font-semibold">取得株価</p>
                      <p className="text-gray-900 font-bold text-base">{formatCurrency(stock.purchase_price)}</p>
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold">現在株価</p>
                      <p className="text-gray-900 font-bold text-base">
                        {stock.priceLoading ? (
                          <span className="text-gray-600">取得中...</span>
                        ) : stock.currentPrice !== null ? (
                          formatCurrency(stock.currentPrice)
                        ) : (
                          <span className="text-red-600 font-bold">取得失敗</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold">株数</p>
                      <p className="text-gray-900 font-bold text-base">{stock.shares.toLocaleString()}株</p>
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold">現在評価額</p>
                      <p className="text-gray-900 font-bold text-base">
                        {currentValue !== null ? formatCurrency(currentValue) : <span className="text-gray-600">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">損益金額</p>
                      <p className={`font-semibold ${profitLoss !== null && profitLoss >= 0 ? 'text-green-600' : profitLoss !== null ? 'text-red-600' : 'text-gray-400'}`}>
                        {profitLoss !== null ? formatCurrency(profitLoss) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">損益率</p>
                      <p className={`font-semibold ${profitLossRate !== null && profitLossRate >= 0 ? 'text-green-600' : profitLossRate !== null ? 'text-red-600' : 'text-gray-400'}`}>
                        {profitLossRate !== null ? formatPercentage(profitLossRate) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">配当金</p>
                      <p className={`font-semibold ${stock.dividendAmount !== null && stock.shares > 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                        {stock.dividendAmount !== null && stock.shares > 0 ? formatCurrency(stock.dividendAmount * stock.shares) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">配当性向</p>
                      <p className={`font-semibold ${stock.payout_ratio !== null && stock.payout_ratio > 0 ? (stock.payout_ratio > 80 ? 'text-red-600' : stock.payout_ratio > 50 ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}`}>
                        {stock.payout_ratio !== null && stock.payout_ratio > 0 ? `${stock.payout_ratio.toFixed(1)}%` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">取得株価配当利回り</p>
                      <p className={`font-semibold ${stock.dividendYieldAtPurchase !== null ? 'text-blue-600' : 'text-gray-400'}`}>
                        {stock.dividendYieldAtPurchase !== null ? `${stock.dividendYieldAtPurchase.toFixed(2)}%` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">現在株価配当利回り</p>
                      <p className={`font-semibold ${stock.dividendYieldAtCurrent !== null ? 'text-green-600' : 'text-gray-400'}`}>
                        {stock.dividendYieldAtCurrent !== null ? `${stock.dividendYieldAtCurrent.toFixed(2)}%` : '-'}
                      </p>
                    </div>
                    {stock.memo && stock.memo.trim() && (
                      <div className="col-span-2">
                        <p className="text-gray-900 font-semibold mb-1">購入基準メモ</p>
                        <div 
                          className="text-gray-900 text-sm bg-gray-50 p-3 rounded border border-gray-200 break-words" 
                          style={{ 
                            wordBreak: 'break-word', 
                            whiteSpace: 'normal',
                            writingMode: 'horizontal-tb',
                            textOrientation: 'mixed',
                            lineHeight: '1.6',
                            display: 'block',
                            overflowWrap: 'break-word',
                            wordWrap: 'break-word'
                          }}
                        >
                          {stock.memo}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* アプリケーション情報 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Tomikawa Finance</h3>
              </div>
              <p className="text-sm text-gray-400">
                ポートフォリオ管理システム
              </p>
              <p className="text-sm text-gray-400 mt-2">
                日本株の銘柄管理と配当情報の追跡を簡単に
              </p>
            </div>

            {/* 機能 */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                主な機能
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-gray-400">✓ リアルタイム株価取得</span>
                </li>
                <li>
                  <span className="text-gray-400">✓ 配当情報管理</span>
                </li>
                <li>
                  <span className="text-gray-400">✓ 損益計算</span>
                </li>
                <li>
                  <span className="text-gray-400">✓ ポートフォリオ分析</span>
                </li>
              </ul>
            </div>

            {/* 技術スタック */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                技術スタック
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-gray-400">Next.js 16</span>
                </li>
                <li>
                  <span className="text-gray-400">React 19</span>
                </li>
                <li>
                  <span className="text-gray-400">TypeScript</span>
                </li>
                <li>
                  <span className="text-gray-400">Tailwind CSS</span>
                </li>
                <li>
                  <span className="text-gray-400">Vercel Postgres</span>
                </li>
              </ul>
            </div>
          </div>

          {/* コピーライト */}
          <div className="border-t border-gray-800 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} Tomikawa Finance. All rights reserved.
              </p>
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <span className="text-xs text-gray-500">
                  Built with ❤️ using Next.js
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
