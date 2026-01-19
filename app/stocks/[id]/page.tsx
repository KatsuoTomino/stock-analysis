'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, ExternalLink, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import StockChart from '@/components/StockChart';

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
}


export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
  const [stock, setStock] = useState<Stock | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    purchase_price: '',
    shares: '',
    memo: '',
    industry: '',
    payout_ratio: '',
  });
  const isSubmittingRef = useRef(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchStock();
  }, [id]);

  useEffect(() => {
    // 株価を取得
    if (stock) {
      fetchCurrentPrice();
    }
  }, [stock]);

  const fetchStock = async () => {
    try {
      const response = await fetch('/api/stocks');
      if (!response.ok) {
        throw new Error('銘柄の取得に失敗しました');
      }
      const stocks: Stock[] = await response.json();
      const foundStock = stocks.find((s) => s.id === parseInt(id));

      if (!foundStock) {
        throw new Error('銘柄が見つかりません');
      }

      setStock(foundStock);
      // 現在の設定値をフォームに設定
      setFormData({
        amount: foundStock.dividend_amount ? foundStock.dividend_amount.toString() : '',
        purchase_price: foundStock.purchase_price ? foundStock.purchase_price.toString() : '',
        shares: foundStock.shares ? foundStock.shares.toString() : '',
        memo: foundStock.memo ? String(foundStock.memo) : '',
        industry: foundStock.industry ? String(foundStock.industry) : '',
        payout_ratio: foundStock.payout_ratio ? foundStock.payout_ratio.toString() : '',
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPrice = async () => {
    if (!stock) return;
    
    setPriceLoading(true);
    try {
      const response = await fetch(`/api/stocks/${stock.id}/price`);
      if (!response.ok) {
        throw new Error('株価の取得に失敗しました');
      }
      const data = await response.json();
      setCurrentPrice(data.price);
    } catch (err) {
      console.error('株価取得エラー:', err);
      setCurrentPrice(null);
    } finally {
      setPriceLoading(false);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    try {
      // メモフィールドの場合は50文字を超えないように制限（コピー&ペーストにも対応）
      if (name === 'memo') {
        const limitedValue = value.slice(0, 50); // 50文字に制限
        setFormData((prev) => ({ ...prev, [name]: limitedValue }));
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
    } catch (error) {
      console.error('入力処理エラー:', error);
      // エラーが発生してもアプリケーションがクラッシュしないようにする
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    try {
      // メモフィールドでのペースト時も50文字に制限
      if (e.currentTarget.name === 'memo') {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').slice(0, 50);
        setFormData((prev) => ({ ...prev, memo: pastedText }));
      }
    } catch (error) {
      console.error('ペースト処理エラー:', error);
      // エラーが発生してもアプリケーションがクラッシュしないようにする
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 既に保存中の場合は処理をスキップ（連続クリック防止）
    if (saving || isSubmittingRef.current) {
      console.log('保存処理が既に実行中です。スキップします。');
      return;
    }
    
    isSubmittingRef.current = true;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const amount = formData.amount ? parseFloat(formData.amount) : null;
      const purchasePrice = formData.purchase_price ? parseFloat(formData.purchase_price) : null;
      const shares = formData.shares ? parseInt(formData.shares, 10) : null;
      
      console.log('更新開始:', {
        id,
        formData,
        amount,
        purchasePrice,
        shares
      });
      
      // 配当金額のバリデーション
      if (formData.amount && (isNaN(amount!) || amount! < 0)) {
        throw new Error('有効な配当金額を入力してください');
      }

      // 取得株価と株数のバリデーション
      if (formData.purchase_price && (isNaN(purchasePrice!) || purchasePrice! < 0)) {
        throw new Error('取得株価は0以上の数値である必要があります');
      }
      if (formData.shares && (isNaN(shares!) || shares! < 0 || !Number.isInteger(shares!))) {
        throw new Error('株数は0以上の整数である必要があります');
      }

      // 配当金を更新
      if (formData.amount && amount !== null) {
        const dividendResponse = await fetch(`/api/stocks/${id}/dividend`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dividend_amount: amount,
          }),
        });

        const dividendData = await dividendResponse.json();
        if (!dividendResponse.ok) {
          throw new Error(dividendData.error || '配当金の更新に失敗しました');
        }
      }

      // 取得株価、株数、メモ、業種、配当性向を更新
      const finalPurchasePrice = purchasePrice !== null && purchasePrice >= 0 
        ? purchasePrice 
        : stock?.purchase_price || 0;
      const finalShares = shares !== null && shares >= 0 
        ? shares 
        : stock?.shares || 0;
      const purchaseAmount = finalPurchasePrice * finalShares;
      
      // 業種と配当性向の処理
      const industry = formData.industry?.trim() || null;
      let payoutRatio: number | null = null;
      if (formData.payout_ratio && formData.payout_ratio.trim() !== '') {
        const parsed = parseFloat(formData.payout_ratio);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          payoutRatio = parsed;
        }
      }

      if (stock) {
        const stockResponse = await fetch(`/api/stocks/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: stock.code,
            name: stock.name,
            purchase_price: finalPurchasePrice,
            shares: finalShares,
            purchase_amount: purchaseAmount,
            memo: formData.memo || null,
            industry: industry,
            payout_ratio: payoutRatio,
          }),
        });

        const stockData = await stockResponse.json();
        if (!stockResponse.ok) {
          const errorMsg = stockData.error || '銘柄の更新に失敗しました';
          const details = stockData.details ? ` (${stockData.details})` : '';
          throw new Error(`${errorMsg}${details}`);
        }
      }

      // 銘柄情報を再取得
      await fetchStock();
      
      // 成功メッセージ
      setSuccessMessage('情報を更新しました');
      setError(null);
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('更新エラー:', err);
      const errorMessage = err instanceof Error ? err.message : '更新に失敗しました';
      setError(errorMessage);
      setSuccessMessage(null);
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  const calculateDividendYieldAtPurchase = (): number | null => {
    if (!stock || !stock.dividend_amount || stock.dividend_amount <= 0) return null;
    // 配当利回り = (年間配当金 ÷ 取得株価) × 100
    return (stock.dividend_amount / stock.purchase_price) * 100;
  };

  const calculateDividendYieldAtCurrent = (): number | null => {
    if (!stock || !stock.dividend_amount || stock.dividend_amount <= 0 || !currentPrice || currentPrice <= 0) return null;
    // 配当利回り(%) = (100株あたり配当 ÷ 現在株価)
    // 100株あたり配当 = 一株配当 × 100
    // dividend_amountは1株あたりの配当金なので、100株あたりは dividend_amount * 100
    // 配当利回り(%) = (dividend_amount * 100) / currentPrice
    return (stock.dividend_amount * 100) / currentPrice;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">読み込み中...</p>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-red-600 mb-4">銘柄が見つかりません</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900"
            >
              <ArrowLeft size={20} />
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const dividendYieldAtPurchase = calculateDividendYieldAtPurchase();
  const dividendYieldAtCurrent = calculateDividendYieldAtCurrent();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            一覧に戻る
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <LogOut size={18} />
            ログアウト
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {stock.name} ({stock.code})
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">現在株価</p>
              {priceLoading ? (
                <p className="text-lg font-semibold text-gray-600">取得中...</p>
              ) : currentPrice ? (
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(currentPrice)}</p>
              ) : (
                <p className="text-lg font-semibold text-gray-600">取得失敗</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">取得株数</p>
              <p className="text-lg font-semibold text-gray-900">{stock.shares.toLocaleString()}株</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">配当利回り</p>
              <div className="space-y-1">
                {dividendYieldAtPurchase !== null && (
                  <p className="text-sm font-semibold text-blue-600">
                    取得株価: {dividendYieldAtPurchase.toFixed(2)}%
                  </p>
                )}
                {dividendYieldAtCurrent !== null && (
                  <p className="text-sm font-semibold text-green-600">
                    現在株価: {dividendYieldAtCurrent.toFixed(2)}%
                  </p>
                )}
                {dividendYieldAtPurchase === null && dividendYieldAtCurrent === null && (
                  <p className="text-sm text-gray-600">-</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 外部リンク */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">外部リンク</h2>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <a
              href={`https://minkabu.jp/stock/${stock.code}/dividend`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={18} />
              みんかぶ配当ページ
            </a>
            <a
              href={`https://stocks.finance.yahoo.co.jp/stocks/detail/?code=${stock.code}.T`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ExternalLink size={18} />
              Yahoo!ファイナンス優待ページ
            </a>
            <a
              href={`https://minkabu.jp/stock/${stock.code}/yutai`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ExternalLink size={18} />
              みんかぶ優待ページ
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">設定情報</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {successMessage}
            </div>
          )}

          {!loading && mounted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="purchase_price"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  取得株価（円）
                </label>
                <input
                  type="number"
                  id="purchase_price"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="例: 2500.00"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
                <p className="mt-2 text-sm text-gray-700">
                  1株あたりの取得株価を入力してください。
                </p>
              </div>
              <div>
                <label
                  htmlFor="shares"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  取得株数（株）
                </label>
                <input
                  type="number"
                  id="shares"
                  name="shares"
                  value={formData.shares}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="例: 100"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
                <p className="mt-2 text-sm text-gray-700">
                  取得した株数を入力してください。
                </p>
              </div>
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  配当金額（年間、円）
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="例: 100.00"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
                <p className="mt-2 text-sm text-gray-700">
                  一株あたりの年間配当金額を入力してください。みんかぶの配当ページで確認できます。
                </p>
              </div>
              <div>
                <label
                  htmlFor="memo"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  購入基準メモ（50文字以内）
                </label>
                <textarea
                  id="memo"
                  name="memo"
                  value={formData.memo}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  maxLength={50}
                  rows={3}
                  placeholder="例: 配当利回り3%以上、PER15倍以下を基準に購入"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium resize-none"
                />
                <p className="mt-2 text-sm text-gray-700">
                  購入基準の参考となるメモを入力してください。メインページでも表示されます。
                  <span className="text-gray-500 ml-2">
                    ({(formData.memo || '').length}/50文字)
                  </span>
                </p>
              </div>
              <div>
                <label
                  htmlFor="industry"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  業種
                </label>
                <input
                  type="text"
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  maxLength={50}
                  placeholder="例: 自動車"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
                <p className="mt-2 text-sm text-gray-700">
                  銘柄の業種を入力してください。メインページでも表示されます。
                </p>
              </div>
              <div>
                <label
                  htmlFor="payout_ratio"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  配当性向（%）
                </label>
                <input
                  type="number"
                  id="payout_ratio"
                  name="payout_ratio"
                  value={formData.payout_ratio}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="例: 30.5"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
                <p className="mt-2 text-sm text-gray-700">
                  配当性向をパーセンテージで入力してください（0-100）。メインページでも表示されます。
                </p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={18} />
                {saving ? '保存中...' : '情報を更新'}
              </button>
            </form>
          )}
        </div>

        {/* チャート */}
        {stock && (
          <div className="mb-6">
            <StockChart stockId={stock.id} stockCode={stock.code} stockName={stock.name} />
          </div>
        )}
      </div>
    </div>
  );
}

