import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// PUT /api/stocks/[id]/dividend - 設定配当金を更新（上書き）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { dividend_amount } = body;

    console.log('配当金額更新リクエスト:', {
      id,
      body,
      dividend_amount,
      type: typeof dividend_amount
    });

    // バリデーション
    if (dividend_amount === undefined) {
      console.error('配当金額が未定義です');
      return NextResponse.json(
        { error: '配当金額が必要です' },
        { status: 400 }
      );
    }

    if (dividend_amount !== null && (typeof dividend_amount !== 'number' || dividend_amount < 0)) {
      console.error('配当金額のバリデーションエラー:', {
        dividend_amount,
        type: typeof dividend_amount,
        isNumber: typeof dividend_amount === 'number',
        isPositive: dividend_amount >= 0
      });
      return NextResponse.json(
        { error: '配当金額は0以上の数値である必要があります' },
        { status: 400 }
      );
    }

    // 銘柄が存在するか確認
    const stockCheck = await sql`
      SELECT id FROM stocks WHERE id = ${id}
    `;
    const stockRows = stockCheck.rows || stockCheck;
    if (stockRows.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    // 設定配当金を更新（上書き）
    // まず、dividend_amountカラムが存在するか確認し、存在しない場合は追加
    try {
      console.log('データベース更新実行:', { id, dividend_amount });
      
      const result = await sql`
        UPDATE stocks
        SET dividend_amount = ${dividend_amount},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      const rows = result.rows || result;
      
      console.log('データベース更新結果:', {
        rowsCount: rows.length,
        updatedStock: rows[0]
      });
      
      if (rows.length === 0) {
        console.error('更新された行がありません');
        return NextResponse.json(
          { error: '銘柄の更新に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json(rows[0]);
    } catch (dbError: any) {
      // カラムが存在しない場合のエラーをキャッチ
      if (dbError.message && dbError.message.includes('dividend_amount')) {
        console.error('dividend_amountカラムが存在しません。マイグレーションを実行してください。');
        return NextResponse.json(
          { error: 'データベースの設定が不完全です。dividend_amountカラムを追加してください。' },
          { status: 500 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('配当金額更新エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: `配当金額の更新に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}

