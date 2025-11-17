export enum JobType {
  AMFI_INGEST = 'AMFI_INGEST',
  YAHOO_INGEST = 'YAHOO_INGEST',
  NEWS_INGEST = 'NEWS_INGEST',
  ALERT_CHECK = 'ALERT_CHECK',
  SEND_EMAIL = 'SEND_EMAIL',
}

export interface AMFIIngestJobData {
  url?: string;
  date?: string;
}

export interface YahooIngestJobData {
  symbol: string;
  from: string;
  to: string;
}

export interface NewsIngestJobData {
  category?: string;
  keywords?: string[];
}

export interface AlertCheckJobData {
  userId?: string;
  fundId?: string;
}

export interface SendEmailJobData {
  to: string;
  subject: string;
  template: 'verification' | 'alert' | 'digest';
  data: Record<string, any>;
}

export type JobData = 
  | AMFIIngestJobData
  | YahooIngestJobData
  | NewsIngestJobData
  | AlertCheckJobData
  | SendEmailJobData;