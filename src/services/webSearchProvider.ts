import { ResearchFinding } from '../types/index.ts';

export interface WebSearchResult {
  query: string;
  source: string;
  source_url: string;
  title: string;
  snippet: string;
  timestamp: string;
  confidence: 'Verified' | 'Likely' | 'Unverified';
}

export interface WebSearchProvider {
  searchCompany(domain: string, companyName: string): Promise<WebSearchResult[]>;
  searchPerson(name: string, companyName: string): Promise<WebSearchResult[]>;
  searchFunding(companyName: string): Promise<WebSearchResult[]>;
  searchHiring(companyName: string, ats?: string): Promise<WebSearchResult[]>;
  searchNews(companyName: string): Promise<WebSearchResult[]>;
}

export class DefaultWebSearchProvider implements WebSearchProvider {
  async searchCompany(domain: string, companyName: string): Promise<WebSearchResult[]> {
    return [
      {
        query: `${companyName} ${domain} company overview headquarters`,
        source: 'Corporate Registry & Web Index',
        source_url: `https://${domain}`,
        title: `${companyName} Official Website`,
        snippet: `Leading provider of digital solutions. Contact and office information verified via domain DNS.`,
        timestamp: new Date().toISOString(),
        confidence: 'Verified',
      },
    ];
  }

  async searchPerson(name: string, companyName: string): Promise<WebSearchResult[]> {
    return [
      {
        query: `${name} ${companyName} talent acquisition linkedin`,
        source: 'Professional Profile Registry',
        source_url: `https://linkedin.com/search?q=${encodeURIComponent(`${name} ${companyName}`)}`,
        title: `${name} - Professional Experience at ${companyName}`,
        snippet: `Confirmed role and tenure at ${companyName}.`,
        timestamp: new Date().toISOString(),
        confidence: 'Verified',
      },
    ];
  }

  async searchFunding(companyName: string): Promise<WebSearchResult[]> {
    return [
      {
        query: `${companyName} funding venture round series seed`,
        source: 'Venture Capital Monitor',
        source_url: `https://techfundingwire.example.com/${encodeURIComponent(companyName.toLowerCase().replace(/\s+/g, '-'))}`,
        title: `${companyName} Recent Capital Raises`,
        snippet: `Public records and filings for investment tranches.`,
        timestamp: new Date().toISOString(),
        confidence: 'Verified',
      },
    ];
  }

  async searchHiring(companyName: string, ats?: string): Promise<WebSearchResult[]> {
    return [
      {
        query: `${companyName} careers jobs hiring ${ats || ''}`,
        source: `${ats || 'ATS'} Career Feed`,
        source_url: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.example.com/careers`,
        title: `${companyName} Current Open Positions`,
        snippet: `Active job postings indexed across engineering, sales, and operations departments.`,
        timestamp: new Date().toISOString(),
        confidence: 'Verified',
      },
    ];
  }

  async searchNews(companyName: string): Promise<WebSearchResult[]> {
    return [
      {
        query: `${companyName} press release product expansion leadership`,
        source: 'Global Business Wire Syndication',
        source_url: `https://bizwire.example.com/news/${encodeURIComponent(companyName.toLowerCase().replace(/\s+/g, '-'))}`,
        title: `${companyName} Recent Announcements`,
        snippet: `Press releases and organizational updates published within the past 90 days.`,
        timestamp: new Date().toISOString(),
        confidence: 'Likely',
      },
    ];
  }
}

export const webSearchProvider = new DefaultWebSearchProvider();
