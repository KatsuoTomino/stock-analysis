import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendMessage } from '@/lib/claude';

// POST /api/analyze - 理論株価算出
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      stock_id,
      name,
      current_price,
      per,
      pbr,
      roe,
      operating_margin,
      revenue,
      operating_profit,
    } = body;

    // バリデーション
    if (!stock_id || !name || !current_price) {
      return NextResponse.json(
        { error: '必須項目が不足しています（stock_id, name, current_price）' },
        { status: 400 }
      );
    }

    // 銘柄が存在するか確認
    const stockCheck = await sql`
      SELECT id FROM stocks WHERE id = ${stock_id}
    `;
    const stockRows = stockCheck.rows || stockCheck;
    if (stockRows.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    // Claude APIに送信するプロンプトを作成
    const prompt = `以下の財務データから理論株価を算出してください：

- 銘柄: ${name}
- 現在株価: ${current_price}円
${per !== undefined ? `- PER: ${per}` : ''}
${pbr !== undefined ? `- PBR: ${pbr}` : ''}
${roe !== undefined ? `- ROE: ${roe}%` : ''}
${operating_margin !== undefined ? `- 営業利益率: ${operating_margin}%` : ''}
${revenue !== undefined ? `- 売上高: ${revenue}円` : ''}
${operating_profit !== undefined ? `- 営業利益: ${operating_profit}円` : ''}

同業他社との比較も考慮して、適正株価を算出し、その根拠を説明してください。
理論株価は数値で明確に示してください（例: 理論株価は3,500円です）。`;

    const systemPrompt = `あなたは経験豊富な株式アナリストです。財務データを分析し、理論株価を算出してください。
回答は以下の形式でお願いします：
1. 理論株価: [数値]円
2. 分析根拠: [詳細な説明]`;

    // Claude APIに送信
    const analysisText = await sendMessage(prompt, systemPrompt);

    // 理論株価を抽出（正規表現で数値を探す）
    const priceMatch = analysisText.match(/理論株価[：:]\s*([\d,]+)/);
    const theoreticalPrice = priceMatch
      ? parseFloat(priceMatch[1].replace(/,/g, ''))
      : null;

    // データベースに保存
    const result = await sql`
      INSERT INTO analyses (stock_id, theoretical_price, analysis_text)
      VALUES (${stock_id}, ${theoreticalPrice}, ${analysisText})
      RETURNING *
    `;

    const rows = result.rows || result;
    return NextResponse.json({
      id: rows[0].id,
      stock_id,
      theoretical_price: theoreticalPrice,
      analysis_text: analysisText,
    });
  } catch (error) {
    console.error('理論株価算出エラー:', error);
    return NextResponse.json(
      { error: '理論株価の算出に失敗しました' },
      { status: 500 }
    );
  }
}

// GET /api/analyze - 分析履歴取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stock_id');

    if (!stockId) {
      return NextResponse.json(
        { error: 'stock_idパラメータが必要です' },
        { status: 400 }
      );
    }

    const id = parseInt(stockId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効な銘柄IDです' },
        { status: 400 }
      );
    }

    // 分析履歴を取得（最新順）
    const result = await sql`
      SELECT * FROM analyses
      WHERE stock_id = ${id}
      ORDER BY created_at DESC
    `;

    const rows = result.rows || result;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('分析履歴取得エラー:', error);
    return NextResponse.json(
      { error: '分析履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}

