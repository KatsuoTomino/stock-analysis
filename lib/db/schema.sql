-- stocks テーブル（銘柄情報）
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(4) NOT NULL,
  name VARCHAR(100) NOT NULL,
  purchase_price DECIMAL(10, 2) NOT NULL,
  shares INTEGER NOT NULL,
  purchase_amount DECIMAL(12, 2) NOT NULL,
  dividend_amount DECIMAL(10, 2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- dividends テーブル（配当情報）
CREATE TABLE IF NOT EXISTS dividends (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- analyses テーブル（AI分析結果保存用）
CREATE TABLE IF NOT EXISTS analyses (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  theoretical_price DECIMAL(10, 2),
  analysis_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

