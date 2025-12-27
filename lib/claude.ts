/**
 * Claude API クライアント設定
 * Anthropic SDKを使用してClaude APIと通信
 */

import Anthropic from '@anthropic-ai/sdk';

// Anthropic SDK初期化
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Claude APIにメッセージを送信
 * @param message 送信するメッセージ
 * @param systemPrompt システムプロンプト（オプション）
 * @returns Claude APIからのレスポンステキスト
 */
export async function sendMessage(
  message: string,
  systemPrompt?: string
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    // レスポンスからテキストを抽出
    const textContent = response.content.find(
      (content): content is Anthropic.Messages.TextBlock => content.type === 'text'
    );

    if (!textContent) {
      throw new Error('Claude APIからのレスポンスにテキストが含まれていません');
    }

    return textContent.text;
  } catch (error) {
    console.error('Claude API エラー:', error);
    throw error;
  }
}

/**
 * PDFファイルからテキストを抽出してClaude APIに送信
 * @param pdfBuffer PDFファイルのバッファ
 * @param message 送信するメッセージ
 * @param systemPrompt システムプロンプト（オプション）
 * @returns Claude APIからのレスポンステキスト
 */
export async function sendMessageWithPDF(
  pdfBuffer: Buffer,
  message: string,
  systemPrompt?: string
): Promise<string> {
  try {
    // PDFからテキストを抽出
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('PDFからテキストを抽出できませんでした');
    }

    // PDFのテキスト内容を含めてClaude APIに送信
    const fullMessage = `${message}

【PDFの内容】
${pdfText}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: fullMessage,
        },
      ],
    });

    // レスポンスからテキストを抽出
    const textContent = response.content.find(
      (content): content is Anthropic.Messages.TextBlock => content.type === 'text'
    );

    if (!textContent) {
      throw new Error('Claude APIからのレスポンスにテキストが含まれていません');
    }

    return textContent.text;
  } catch (error) {
    console.error('Claude API PDF解析エラー:', error);
    throw error;
  }
}

