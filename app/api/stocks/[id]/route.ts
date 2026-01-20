import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// PUT /api/stocks/[id] - 銘柄更新
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
    const { code, name, purchase_price, shares, purchase_amount, memo, industry, payout_ratio } = body;

    // バリデーション
    if (!code || !name) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // purchase_price, shares, purchase_amountは0も許可する
    if (purchase_price === undefined || purchase_price === null) {
      return NextResponse.json(
        { error: '取得株価は必須です' },
        { status: 400 }
      );
    }

    if (shares === undefined || shares === null) {
      return NextResponse.json(
        { error: '株数は必須です' },
        { status: 400 }
      );
    }

    if (purchase_amount === undefined || purchase_amount === null) {
      return NextResponse.json(
        { error: '取得時金額は必須です' },
        { status: 400 }
      );
    }

    // メモのバリデーションと正規化（100文字以内、空文字列も許可）
    let finalMemo: string | null = null;
    if (memo !== undefined && memo !== null) {
      if (typeof memo !== 'string') {
        return NextResponse.json(
          { error: 'メモは文字列である必要があります' },
          { status: 400 }
        );
      }
      // 100文字を超える場合は100文字に切り詰める（フロントエンドでも制限しているが、念のため）
      const trimmedMemo = memo.length > 100 ? memo.slice(0, 100) : memo;
      // 空文字列の場合はnullに変換
      finalMemo = trimmedMemo.trim() === '' ? null : trimmedMemo;
      
      if (memo.length > 100) {
        // 警告ログを出力（エラーにはしない）
        console.warn(`メモが100文字を超えています。切り詰めます: ${memo.length}文字 -> 100文字`);
      }
    }

    // 業種のバリデーションと正規化（50文字以内、空文字列も許可）
    let finalIndustry: string | null = null;
    if (industry !== undefined && industry !== null) {
      if (typeof industry !== 'string') {
        return NextResponse.json(
          { error: '業種は文字列である必要があります' },
          { status: 400 }
        );
      }
      const trimmedIndustry = industry.length > 50 ? industry.slice(0, 50) : industry;
      finalIndustry = trimmedIndustry.trim() === '' ? null : trimmedIndustry;
    }

    // 配当性向のバリデーション（マイナス値と100%以上も許可、小数点2桁まで、空文字列も許可）
    let finalPayoutRatio: number | null = null;
    if (payout_ratio !== undefined && payout_ratio !== null) {
      if (typeof payout_ratio !== 'number') {
        return NextResponse.json(
          { error: '配当性向は数値である必要があります' },
          { status: 400 }
        );
      }
      // 小数点2桁までに丸める
      finalPayoutRatio = Math.round(payout_ratio * 100) / 100;
    }

    // 銘柄コードのバリデーション（4桁の英数字を許可）
    if (typeof code !== 'string' || code.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(code)) {
      return NextResponse.json(
        { error: '銘柄コードは4桁の英数字である必要があります' },
        { status: 400 }
      );
    }

    if (typeof purchase_price !== 'number' || purchase_price < 0) {
      return NextResponse.json(
        { error: '取得株価は0以上の数である必要があります' },
        { status: 400 }
      );
    }

    if (typeof shares !== 'number' || shares < 0 || !Number.isInteger(shares)) {
      return NextResponse.json(
        { error: '株数は0以上の整数である必要があります' },
        { status: 400 }
      );
    }

    if (typeof purchase_amount !== 'number' || purchase_amount < 0) {
      return NextResponse.json(
        { error: '取得時金額は0以上の数である必要があります' },
        { status: 400 }
      );
    }

    // データベースを更新
    // カラムが存在しない場合に備えて、まず追加を試みる
    // データベースカラムの存在確認と追加（必要に応じて）
    try {
      await sql`ALTER TABLE stocks ADD COLUMN IF NOT EXISTS industry VARCHAR(50) DEFAULT NULL`;
    } catch (alterError: any) {
      // カラムが既に存在する場合は無視
      if (!alterError?.message?.includes('already exists') && !alterError?.message?.includes('duplicate')) {
        console.log('industry column already exists or alter failed:', alterError);
      }
    }
    
    try {
      await sql`ALTER TABLE stocks ADD COLUMN IF NOT EXISTS memo VARCHAR(100) DEFAULT NULL`;
    } catch (alterError: any) {
      // カラムが既に存在する場合は、サイズを変更を試みる
      try {
        await sql`ALTER TABLE stocks ALTER COLUMN memo TYPE VARCHAR(100)`;
      } catch (alterMemoError: any) {
        console.log('memo column size update failed:', alterMemoError);
      }
    }
    
    try {
      await sql`ALTER TABLE stocks ADD COLUMN IF NOT EXISTS payout_ratio DECIMAL(10, 2) DEFAULT NULL`;
    } catch (alterError: any) {
      // カラムが既に存在する場合は、型を変更を試みる
      try {
        await sql`ALTER TABLE stocks ALTER COLUMN payout_ratio TYPE DECIMAL(10, 2)`;
      } catch (alterPayoutError: any) {
        console.log('payout_ratio column type update failed:', alterPayoutError);
      }
    }

    const result = await sql`
      UPDATE stocks
      SET 
        code = ${code},
        name = ${name},
        purchase_price = ${purchase_price},
        shares = ${shares},
        purchase_amount = ${purchase_amount},
        memo = ${finalMemo},
        industry = ${finalIndustry},
        payout_ratio = ${finalPayoutRatio},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    const rows = result.rows || result;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('銘柄更新エラー:', error);
    console.error('エラー詳細:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // より詳細なエラーメッセージを返す
    const errorMessage = error?.message || '銘柄の更新に失敗しました';
    
    // データベースエラーの場合、より具体的なメッセージを返す
    if (error?.message?.includes('column') || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'データベースのカラムが存在しません。マイグレーションを実行してください。',
          details: errorMessage 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '銘柄の更新に失敗しました',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/stocks/[id] - 銘柄削除
export async function DELETE(
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

    // データベースから削除
    const result = await sql`
      DELETE FROM stocks
      WHERE id = ${id}
      RETURNING *
    `;

    const rows = result.rows || result;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '銘柄を削除しました', deleted: rows[0] });
  } catch (error) {
    console.error('銘柄削除エラー:', error);
    return NextResponse.json(
      { error: '銘柄の削除に失敗しました' },
      { status: 500 }
    );
  }
}

