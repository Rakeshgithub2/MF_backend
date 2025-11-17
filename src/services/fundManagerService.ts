import axios from 'axios';
// import * as cheerio from 'cheerio'; // Optional: uncomment after installing cheerio
import { prisma } from '../db';

interface FundManagerDetails {
  name: string;
  experience: number;
  qualification: string;
  bio?: string;
  photo?: string;
  fundsManaged?: number;
  totalAUM?: number;
}

/**
 * Fetch real fund manager details from multiple sources
 */
export class FundManagerService {
  /**
   * Fetch fund manager details from Value Research API
   */
  private static async fetchFromValueResearch(
    fundName: string
  ): Promise<FundManagerDetails | null> {
    try {
      // Value Research Online API endpoint
      const searchUrl = `https://api.valueresearchonline.com/api/fund/search?q=${encodeURIComponent(
        fundName
      )}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      if (response.data && response.data.results && response.data.results[0]) {
        const fundData = response.data.results[0];
        const detailsUrl = `https://api.valueresearchonline.com/api/fund/${fundData.id}`;
        const detailsResponse = await axios.get(detailsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        });

        if (
          detailsResponse.data &&
          detailsResponse.data.fundManager &&
          detailsResponse.data.fundManager.name
        ) {
          return {
            name: detailsResponse.data.fundManager.name,
            experience: detailsResponse.data.fundManager.experience || 0,
            qualification:
              detailsResponse.data.fundManager.qualification || 'MBA, CFA',
            bio: detailsResponse.data.fundManager.bio,
            photo: detailsResponse.data.fundManager.photo,
            fundsManaged: detailsResponse.data.fundManager.fundsManaged,
            totalAUM: detailsResponse.data.fundManager.totalAUM,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching from Value Research:', error);
      return null;
    }
  }

  /**
   * Fetch fund manager details from Moneycontrol
   * Note: Requires cheerio package - install with: npm install cheerio
   */
  private static async fetchFromMoneycontrol(
    fundName: string
  ): Promise<FundManagerDetails | null> {
    // Disabled until cheerio is installed
    console.log('⚠️ Moneycontrol scraping requires cheerio package');
    return null;
  }

  /**
   * Fetch fund manager details from AMFI India
   */
  private static async fetchFromAMFI(
    amfiCode: string
  ): Promise<FundManagerDetails | null> {
    try {
      const url = `https://www.amfiindia.com/spages/NAVAll.txt`;
      const response = await axios.get(url, {
        timeout: 10000,
      });

      // Parse AMFI data (it's a pipe-separated text file)
      const lines = response.data.split('\n');
      for (const line of lines) {
        const parts = line.split(';');
        if (parts[0] === amfiCode) {
          // AMFI doesn't provide manager details directly
          // We'll need to fetch from AMC website
          const amcName = parts[2];
          return await this.fetchFromAMCWebsite(amcName, parts[3]);
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching from AMFI:', error);
      return null;
    }
  }

  /**
   * Fetch manager details from AMC (Asset Management Company) website
   */
  private static async fetchFromAMCWebsite(
    amcName: string,
    fundName: string
  ): Promise<FundManagerDetails | null> {
    try {
      // This is a placeholder - each AMC has different website structure
      // In production, you'd implement specific scrapers for each major AMC
      // like HDFC MF, ICICI Prudential, SBI MF, etc.

      console.log(
        `Fetching manager details for ${fundName} from ${amcName} website`
      );
      // Implementation would vary per AMC
      return null;
    } catch (error) {
      console.error('Error fetching from AMC website:', error);
      return null;
    }
  }

  /**
   * Fetch fund manager details using MFCentral API
   */
  private static async fetchFromMFCentral(
    fundName: string
  ): Promise<FundManagerDetails | null> {
    try {
      // MFCentral API endpoint (if available)
      const url = `https://mfapi.advisorkhoj.com/fundmanager/${encodeURIComponent(
        fundName
      )}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      if (response.data && response.data.manager) {
        return {
          name: response.data.manager.name,
          experience: response.data.manager.experience || 10,
          qualification: response.data.manager.qualification || 'MBA, CFA',
          bio: response.data.manager.bio,
          photo: response.data.manager.photo,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching from MFCentral:', error);
      return null;
    }
  }

  /**
   * Fetch fund manager details with fallback to multiple sources
   */
  public static async getFundManagerDetails(
    fundId: string,
    fundName: string,
    amfiCode?: string
  ): Promise<FundManagerDetails | null> {
    console.log(
      `🔍 Fetching real fund manager details for: ${fundName} (${fundId})`
    );

    // Try multiple sources in order of reliability
    let managerDetails: FundManagerDetails | null = null;

    // 1. Try Value Research (most reliable for Indian funds)
    try {
      managerDetails = await this.fetchFromValueResearch(fundName);
      if (managerDetails) {
        console.log('✅ Found manager details from Value Research');
        await this.updateManagerInDB(fundId, managerDetails);
        return managerDetails;
      }
    } catch (error) {
      console.error('Value Research fetch failed:', error);
    }

    // 2. Try MFCentral
    try {
      managerDetails = await this.fetchFromMFCentral(fundName);
      if (managerDetails) {
        console.log('✅ Found manager details from MFCentral');
        await this.updateManagerInDB(fundId, managerDetails);
        return managerDetails;
      }
    } catch (error) {
      console.error('MFCentral fetch failed:', error);
    }

    // 3. Try Moneycontrol
    try {
      managerDetails = await this.fetchFromMoneycontrol(fundName);
      if (managerDetails) {
        console.log('✅ Found manager details from Moneycontrol');
        await this.updateManagerInDB(fundId, managerDetails);
        return managerDetails;
      }
    } catch (error) {
      console.error('Moneycontrol fetch failed:', error);
    }

    // 4. Try AMFI if we have code
    if (amfiCode) {
      try {
        managerDetails = await this.fetchFromAMFI(amfiCode);
        if (managerDetails) {
          console.log('✅ Found manager details from AMFI');
          await this.updateManagerInDB(fundId, managerDetails);
          return managerDetails;
        }
      } catch (error) {
        console.error('AMFI fetch failed:', error);
      }
    }

    console.log('⚠️ Could not fetch manager details from any source');
    return null;
  }

  /**
   * Update fund manager details in database
   */
  private static async updateManagerInDB(
    fundId: string,
    managerDetails: FundManagerDetails
  ): Promise<void> {
    try {
      // Check if manager already exists for this fund
      const existing = await prisma.fundManager.findFirst({
        where: { fundId },
      });

      if (existing) {
        // Update existing manager
        await prisma.fundManager.update({
          where: { id: existing.id },
          data: {
            name: managerDetails.name,
            experience: managerDetails.experience,
            qualification: managerDetails.qualification,
          },
        });
        console.log('✅ Updated manager in DB');
      } else {
        // Create new manager
        await prisma.fundManager.create({
          data: {
            fundId,
            name: managerDetails.name,
            experience: managerDetails.experience,
            qualification: managerDetails.qualification,
          },
        });
        console.log('✅ Created manager in DB');
      }
    } catch (error) {
      console.error('Error updating manager in DB:', error);
    }
  }

  /**
   * Get cached manager details or fetch fresh if not available
   */
  public static async getManagerWithCache(
    fundId: string,
    fundName: string,
    amfiCode?: string
  ): Promise<FundManagerDetails | null> {
    // First check database
    const dbManager = await prisma.fundManager.findFirst({
      where: { fundId },
    });

    if (dbManager && dbManager.name && dbManager.name !== 'Default Manager') {
      console.log('✅ Using cached manager from DB');
      return {
        name: dbManager.name,
        experience: dbManager.experience || 10,
        qualification: dbManager.qualification || 'MBA, CFA',
      };
    }

    // If not in DB or is default, fetch fresh
    return await this.getFundManagerDetails(fundId, fundName, amfiCode);
  }
}

export default FundManagerService;
