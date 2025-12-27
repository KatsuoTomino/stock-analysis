'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, FileText } from 'lucide-react';

interface Stock {
  id: number;
  code: string;
  name: string;
}

interface AnalysisResult {
  id: number;
  stock_id: number;
  theoretical_price: number | null;
  analysis_text: string;
  created_at: string;
}

export default function AnalyzePage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pdfResult, setPdfResult] = useState<{ analysis_text: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    current_price: '',
    per: '',
    pbr: '',
    roe: '',
    operating_margin: '',
    revenue: '',
    operating_profit: '',
  });

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await fetch('/api/stocks');
      if (!response.ok) {
        throw new Error('銘柄の取得に失敗しました');
      }
      const data = await response.json();
      setStocks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'stock_id') {
      setSelectedStockId(value === '' ? '' : parseInt(value));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const selectedStock = stocks.find((s) => s.id === selectedStockId);
      if (!selectedStock) {
        throw new Error('銘柄を選択してください');
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_id: selectedStockId,
          name: selectedStock.name,
          current_price: parseFloat(formData.current_price),
          per: formData.per ? parseFloat(formData.per) : undefined,
          pbr: formData.pbr ? parseFloat(formData.pbr) : undefined,
          roe: formData.roe ? parseFloat(formData.roe) : undefined,
          operating_margin: formData.operating_margin
            ? parseFloat(formData.operating_margin)
            : undefined,
          revenue: formData.revenue ? parseFloat(formData.revenue) : undefined,
          operating_profit: formData.operating_profit
            ? parseFloat(formData.operating_profit)
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析に失敗しました');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析に失敗しました');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('PDFファイルのみアップロード可能です');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズは10MB以下である必要があります');
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !selectedStockId) {
      setError('PDFファイルと銘柄を選択してください');
      return;
    }

    setAnalyzingPdf(true);
    setError(null);
    setPdfResult(null);

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('stock_id', selectedStockId.toString());

      const response = await fetch('/api/analyze/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF分析に失敗しました');
      }

      const data = await response.json();
      setPdfResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF分析に失敗しました');
    } finally {
      setAnalyzingPdf(false);
    }
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
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          一覧に戻る
        </Link>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Sparkles size={24} />
            AI分析 - 理論株価算出
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="stock_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                銘柄選択 <span className="text-red-500">*</span>
              </label>
              <select
                id="stock_id"
                name="stock_id"
                value={selectedStockId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">銘柄を選択してください</option>
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.name} ({stock.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="current_price"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  現在株価（円） <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="current_price"
                  name="current_price"
                  value={formData.current_price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="例: 2500.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="per"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  PER
                </label>
                <input
                  type="number"
                  id="per"
                  name="per"
                  value={formData.per}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="例: 15.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="pbr"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  PBR
                </label>
                <input
                  type="number"
                  id="pbr"
                  name="pbr"
                  value={formData.pbr}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="例: 1.2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="roe"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ROE（%）
                </label>
                <input
                  type="number"
                  id="roe"
                  name="roe"
                  value={formData.roe}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="例: 12.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="operating_margin"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  営業利益率（%）
                </label>
                <input
                  type="number"
                  id="operating_margin"
                  name="operating_margin"
                  value={formData.operating_margin}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="例: 8.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="revenue"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  売上高（円）
                </label>
                <input
                  type="number"
                  id="revenue"
                  name="revenue"
                  value={formData.revenue}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="例: 1000000000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="operating_profit"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  営業利益（円）
                </label>
                <input
                  type="number"
                  id="operating_profit"
                  name="operating_profit"
                  value={formData.operating_profit}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="例: 85000000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={analyzing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              {analyzing ? '分析中...' : '分析実行'}
            </button>
          </form>
        </div>

        {/* PDF分析 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={24} />
            PDF分析（四季報・決算資料）
          </h2>

          <form onSubmit={handlePdfSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="stock_id_pdf"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                銘柄選択 <span className="text-red-500">*</span>
              </label>
              <select
                id="stock_id_pdf"
                name="stock_id_pdf"
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value === '' ? '' : parseInt(e.target.value))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">銘柄を選択してください</option>
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.name} ({stock.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pdf_file"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                PDFファイル <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="pdf_file"
                name="pdf_file"
                accept=".pdf"
                onChange={handlePdfChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                10MB以下のPDFファイルをアップロードしてください
              </p>
            </div>

            <button
              type="submit"
              disabled={analyzingPdf || !pdfFile}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              {analyzingPdf ? '分析中...' : 'PDF分析実行'}
            </button>
          </form>
        </div>

        {/* 理論株価分析結果表示 */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">理論株価分析結果</h2>
            {result.theoretical_price !== null && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">理論株価</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(result.theoretical_price)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">分析根拠</p>
              <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm text-gray-700">
                {result.analysis_text}
              </div>
            </div>
          </div>
        )}

        {/* PDF分析結果表示 */}
        {pdfResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">PDF分析結果</h2>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">分析内容</p>
              <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm text-gray-700">
                {pdfResult.analysis_text}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

