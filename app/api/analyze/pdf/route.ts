import { NextRequest, NextResponse } from 'next/server';
import { sendMessageWithPDF } from '@/lib/claude';

// POST /api/analyze/pdf - PDF分析
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const stockId = formData.get('stock_id') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'PDFファイルがアップロードされていません' },
        { status: 400 }
      );
    }

    if (!stockId) {
      return NextResponse.json(
        { error: 'stock_idが必要です' },
        { status: 400 }
      );
    }

    // ファイルタイプの確認
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDFファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルサイズの確認（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下である必要があります' },
        { status: 400 }
      );
    }

    // PDFファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Claude APIに送信するプロンプト
    const prompt = `このPDFファイル（四季報または決算資料）を分析してください。

以下の点を重点的に分析してください：
1. 重要な財務指標（売上高、営業利益、純利益、PER、PBR、ROEなど）
2. 業績の推移と成長性
3. 財務の健全性
4. 投資判断のサマリー（推奨度、リスク要因、今後の見通し）

分析結果は分かりやすく、構造化して提示してください。`;

    const systemPrompt = `あなたは経験豊富な株式アナリストです。四季報や決算資料を分析し、重要な財務指標を抽出し、投資判断のサマリーを提供してください。
回答は以下の形式でお願いします：
1. 重要な財務指標
2. 業績分析
3. 財務健全性
4. 投資判断サマリー`;

    // Claude APIに送信（PDFからテキストを抽出して送信）
    const analysisText = await sendMessageWithPDF(buffer, prompt, systemPrompt);

    // 分析結果を返す
    return NextResponse.json({
      stock_id: parseInt(stockId),
      analysis_text: analysisText,
    });
  } catch (error) {
    console.error('PDF分析エラー:', error);
    return NextResponse.json(
      { error: 'PDF分析に失敗しました' },
      { status: 500 }
    );
  }
}

