/**
 * EDINET API クライアント
 * 金融庁のEDINET（Electronic Disclosure for Investors' NETwork）から
 * 有価証券報告書等の財務情報を取得
 * 
 * API仕様: https://disclosure.edinet-fsa.go.jp/
 */

const EDINET_API_BASE = 'https://disclosure.edinet-fsa.go.jp/api/v2';

// EDINET APIキー（環境変数から取得）
const getApiKey = () => {
  return process.env.EDINET_API_KEY || '';
};

// 書類一覧の型定義
interface EdinetDocument {
  docID: string;
  edinetCode: string;
  secCode: string | null;  // 証券コード
  JCN: string | null;      // 法人番号
  filerName: string;       // 提出者名
  fundCode: string | null;
  ordinanceCode: string;
  formCode: string;
  docTypeCode: string;     // 書類種別コード
  periodStart: string | null;
  periodEnd: string | null;
  submitDateTime: string;
  docDescription: string;  // 書類概要
  issuerEdinetCode: string | null;
  subjectEdinetCode: string | null;
  subsidiaryEdinetCode: string | null;
  currentReportReason: string | null;
  parentDocID: string | null;
  opeDateTime: string | null;
  withdrawalStatus: string;
  docInfoEditStatus: string;
  disclosureStatus: string;
  xbrlFlag: string;        // XBRL有無フラグ
  pdfFlag: string;
  attachDocFlag: string;
  englishDocFlag: string;
  csvFlag: string;
  legalStatus: string;
}

// 書類一覧レスポンスの型定義
interface EdinetDocumentsResponse {
  metadata: {
    title: string;
    parameter: {
      date: string;
      type: string;
    };
    resultset: {
      count: number;
    };
    processDateTime: string;
    status: string;
    message: string;
  };
  results: EdinetDocument[];
}

// 財務指標の型定義
export interface EdinetFinancialMetrics {
  dividendPayoutRatio: number | null;  // 配当性向 (%)
  dividendYield: number | null;        // 配当利回り (%)
  equityRatio: number | null;          // 自己資本比率 (%)
  per: number | null;                  // PER (倍)
  pbr: number | null;                  // PBR (倍)
  roe: number | null;                  // ROE (%)
  eps: number | null;                  // EPS (円)
  bps: number | null;                  // BPS (円)
  fiscalYear: string | null;           // 決算期
  source: 'edinet';
}

/**
 * 証券コードからEDINETコードを検索
 * @param secCode 証券コード（4桁）
 * @param date 検索日（YYYY-MM-DD形式）
 */
async function findEdinetDocuments(secCode: string, date: string): Promise<EdinetDocument[]> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn('[EDINET API] APIキーが設定されていません。環境変数 EDINET_API_KEY を設定してください。');
    return [];
  }

  try {
    // 書類一覧取得（type=2: 有価証券報告書等のみ）
    const url = `${EDINET_API_BASE}/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    console.log(`[EDINET API] 書類一覧取得: ${date}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[EDINET API] HTTPエラー: ${response.status}`);
      return [];
    }

    const data: EdinetDocumentsResponse = await response.json();
    
    if (data.metadata.status !== '200') {
      console.error(`[EDINET API] APIエラー: ${data.metadata.message}`);
      return [];
    }

    // 証券コードでフィルタリング
    const documents = data.results.filter(doc => {
      // secCodeは5桁（証券コード4桁 + チェックディジット1桁）
      return doc.secCode && doc.secCode.startsWith(secCode);
    });

    console.log(`[EDINET API] ${secCode} の書類: ${documents.length}件`);
    return documents;
  } catch (error) {
    console.error('[EDINET API] 書類一覧取得エラー:', error);
    return [];
  }
}

/**
 * 過去の日付を取得（YYYY-MM-DD形式）
 */
function getPastDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
  }
  
  return dates;
}

/**
 * 有価証券報告書を検索
 * @param secCode 証券コード（4桁）
 */
async function findSecuritiesReport(secCode: string): Promise<EdinetDocument | null> {
  // 過去90日分を検索
  const dates = getPastDates(90);
  
  for (const date of dates) {
    const documents = await findEdinetDocuments(secCode, date);
    
    // 有価証券報告書を優先（docTypeCode: 120）
    const report = documents.find(doc => doc.docTypeCode === '120');
    if (report) {
      console.log(`[EDINET API] 有価証券報告書を発見: ${report.docID}`);
      return report;
    }
    
    // 四半期報告書でも可（docTypeCode: 140, 150）
    const quarterly = documents.find(doc => 
      doc.docTypeCode === '140' || doc.docTypeCode === '150'
    );
    if (quarterly) {
      console.log(`[EDINET API] 四半期報告書を発見: ${quarterly.docID}`);
      return quarterly;
    }
  }
  
  console.warn(`[EDINET API] ${secCode} の報告書が見つかりません`);
  return null;
}

/**
 * XBRLデータから財務指標を抽出
 * @param docID 書類ID
 */
async function extractFinancialMetrics(docID: string): Promise<EdinetFinancialMetrics | null> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return null;
  }

  try {
    // XBRLデータを取得（type=1: XBRLデータ）
    const url = `${EDINET_API_BASE}/documents/${docID}?type=1&Subscription-Key=${apiKey}`;
    console.log(`[EDINET API] XBRLデータ取得: ${docID}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[EDINET API] XBRLデータ取得エラー: ${response.status}`);
      return null;
    }

    // ZIPファイルとして受信
    const buffer = await response.arrayBuffer();
    
    // XBRLの解析は複雑なため、ここでは基本的なメトリクスを返す
    // 実際の実装では、XBRLパーサーを使用してデータを抽出する必要がある
    console.log(`[EDINET API] XBRLデータ受信: ${buffer.byteLength} bytes`);
    
    // TODO: XBRLデータの解析を実装
    // 現在はダミーデータを返す
    return null;
  } catch (error) {
    console.error('[EDINET API] XBRLデータ取得エラー:', error);
    return null;
  }
}

/**
 * EDINET APIから財務指標を取得
 * @param secCode 証券コード（4桁）
 */
export async function getFinancialMetricsFromEdinet(secCode: string): Promise<EdinetFinancialMetrics | null> {
  console.log(`[EDINET API] 財務指標取得開始: ${secCode}`);
  
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn('[EDINET API] APIキーが設定されていません');
    console.warn('[EDINET API] 環境変数 EDINET_API_KEY を設定してください');
    console.warn('[EDINET API] APIキーは https://disclosure.edinet-fsa.go.jp/ で取得できます');
    return null;
  }

  // 有価証券報告書を検索
  const report = await findSecuritiesReport(secCode);
  
  if (!report) {
    return null;
  }

  // 財務指標を抽出
  const metrics = await extractFinancialMetrics(report.docID);
  
  return metrics;
}

/**
 * EDINET APIの接続テスト
 */
export async function testEdinetConnection(): Promise<{
  success: boolean;
  message: string;
  apiKeyStatus: string;
}> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return {
      success: false,
      message: 'EDINET_API_KEY が設定されていません',
      apiKeyStatus: '未設定',
    };
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `${EDINET_API_BASE}/documents.json?date=${today}&type=2&Subscription-Key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok && data.metadata?.status === '200') {
      return {
        success: true,
        message: `接続成功。本日の書類数: ${data.metadata.resultset.count}件`,
        apiKeyStatus: `設定済み (${apiKey.substring(0, 8)}...)`,
      };
    } else {
      return {
        success: false,
        message: data.metadata?.message || `HTTPエラー: ${response.status}`,
        apiKeyStatus: `設定済み (${apiKey.substring(0, 8)}...)`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      apiKeyStatus: `設定済み (${apiKey.substring(0, 8)}...)`,
    };
  }
}

