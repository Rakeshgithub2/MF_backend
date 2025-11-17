import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/mutual_funds_db';

// Realistic fund manager names (mix of Indian and international-style names)
const MANAGER_NAMES = [
  'Rajesh Mehta',
  'Priya Sharma',
  'Anil Kumar',
  'Neha Patel',
  'Vikram Singh',
  'Sunita Desai',
  'Amit Joshi',
  'Kavita Reddy',
  'Ramesh Iyer',
  'Deepa Nair',
  'Sanjay Gupta',
  'Meera Krishnan',
  'Rahul Verma',
  'Anita Rao',
  'Suresh Pillai',
  'Ritu Malhotra',
  'Karthik Subramanian',
  'Anjali Chopra',
  'Manish Agarwal',
  'Pooja Jain',
  'Arvind Bhatia',
  'Sneha Menon',
  'Rohit Kapoor',
  'Divya Srinivasan',
  'Vijay Narayan',
  'Swati Bhatt',
  'Nitin Shah',
  'Lakshmi Venkatesh',
  'Abhishek Mishra',
  'Kriti Bansal',
];

const QUALIFICATIONS = [
  'MBA Finance, CFA Charter',
  'MBA Finance, FRM',
  'CFA Charter, B.Com',
  'MBA Finance, CA',
  'PhD Finance, CFA Charter',
  'MBA Finance, PGDM',
  'CFA Charter, M.Com',
  'MBA Finance, B.Tech',
  'CA, CFA Level II',
  'MBA Finance, CFP',
  'CFA Charter, MBA',
  'FRM, MBA Finance',
  'MBA Finance, CS',
  'PGDM Finance, CFA Charter',
  'B.Com, MBA Finance, CFA',
];

const BIO_TEMPLATES = [
  '{name} brings {exp} years of experience in equity research and portfolio management, specializing in {category} investments.',
  'With {exp} years in the mutual fund industry, {name} has a proven track record of identifying high-growth opportunities in {category} stocks.',
  '{name} is a seasoned fund manager with {exp} years of experience, focusing on fundamental analysis and long-term wealth creation in the {category} segment.',
  'A veteran of {exp} years, {name} combines rigorous research with disciplined investing in {category} markets.',
  '{name} has been managing portfolios for {exp} years, with expertise in {category} equities and value investing.',
  'With {exp} years of investment experience, {name} specializes in identifying quality companies in the {category} space.',
  '{name} brings {exp} years of expertise in portfolio construction and risk management for {category} funds.',
  'An experienced professional with {exp} years in asset management, {name} focuses on {category} opportunities with strong fundamentals.',
];

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager6',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager8',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=manager10',
];

function generateBio(
  name: string,
  experience: number,
  category: string
): string {
  const template =
    BIO_TEMPLATES[Math.floor(Math.random() * BIO_TEMPLATES.length)];
  const categoryName = category
    .replace(/_/g, '-')
    .toLowerCase()
    .replace(/-/g, ' ');
  return template
    .replace('{name}', name)
    .replace('{exp}', experience.toString())
    .replace('{category}', categoryName);
}

// Realistic holdings for different fund categories
const LARGE_CAP_STOCKS = [
  { ticker: 'RELIANCE', name: 'Reliance Industries Ltd' },
  { ticker: 'TCS', name: 'Tata Consultancy Services Ltd' },
  { ticker: 'HDFCBANK', name: 'HDFC Bank Ltd' },
  { ticker: 'INFY', name: 'Infosys Ltd' },
  { ticker: 'ICICIBANK', name: 'ICICI Bank Ltd' },
  { ticker: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
  { ticker: 'ITC', name: 'ITC Ltd' },
  { ticker: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd' },
  { ticker: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
  { ticker: 'SBIN', name: 'State Bank of India' },
  { ticker: 'BAJFINANCE', name: 'Bajaj Finance Ltd' },
  { ticker: 'ASIANPAINT', name: 'Asian Paints Ltd' },
  { ticker: 'MARUTI', name: 'Maruti Suzuki India Ltd' },
  { ticker: 'LT', name: 'Larsen & Toubro Ltd' },
  { ticker: 'AXISBANK', name: 'Axis Bank Ltd' },
];

const MID_CAP_STOCKS = [
  { ticker: 'GODREJCP', name: 'Godrej Consumer Products Ltd' },
  { ticker: 'PIDILITIND', name: 'Pidilite Industries Ltd' },
  { ticker: 'CHOLAFIN', name: 'Cholamandalam Investment and Finance' },
  { ticker: 'MPHASIS', name: 'Mphasis Ltd' },
  { ticker: 'PERSISTENT', name: 'Persistent Systems Ltd' },
  { ticker: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd' },
  { ticker: 'INDIGO', name: 'InterGlobe Aviation Ltd' },
  { ticker: 'TORNTPHARM', name: 'Torrent Pharmaceuticals Ltd' },
  { ticker: 'CANBK', name: 'Canara Bank' },
  { ticker: 'LTIM', name: 'LTIMindtree Ltd' },
  { ticker: 'BERGEPAINT', name: 'Berger Paints India Ltd' },
  { ticker: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd' },
  { ticker: 'ASTRAL', name: 'Astral Ltd' },
  { ticker: 'ESCORTS', name: 'Escorts Kubota Ltd' },
  { ticker: 'ABFRL', name: 'Aditya Birla Fashion and Retail Ltd' },
];

const SMALL_CAP_STOCKS = [
  { ticker: 'CRAFTSMAN', name: 'Craftsman Automation Ltd' },
  { ticker: 'KIRLOSENG', name: 'Kirloskar Oil Engines Ltd' },
  { ticker: 'SYMPHONY', name: 'Symphony Ltd' },
  { ticker: 'FINEORG', name: 'Fine Organic Industries Ltd' },
  { ticker: 'ROUTE', name: 'Route Mobile Ltd' },
  { ticker: 'KPITTECH', name: 'KPIT Technologies Ltd' },
  { ticker: 'CENTURYPLY', name: 'Century Plyboards India Ltd' },
  { ticker: 'CAMS', name: 'Computer Age Management Services Ltd' },
  { ticker: 'NAZARA', name: 'Nazara Technologies Ltd' },
  { ticker: 'BIKAJI', name: 'Bikaji Foods International Ltd' },
  { ticker: 'HAPPSTMNDS', name: 'Happiest Minds Technologies Ltd' },
  { ticker: 'CLEAN', name: 'Clean Science and Technology Ltd' },
  { ticker: 'TATVA', name: 'Tatva Chintan Pharma Chem Ltd' },
  { ticker: 'ZOMATO', name: 'Zomato Ltd' },
  { ticker: 'NYKAA', name: 'FSN E-Commerce Ventures Ltd' },
];

const DEBT_HOLDINGS = [
  { ticker: 'GOVT-10Y', name: 'Govt of India 7.18% 2033' },
  { ticker: 'HDFC-BOND', name: 'HDFC Ltd 8.5% 2028' },
  { ticker: 'SBI-BOND', name: 'SBI 8.25% 2029' },
  { ticker: 'ICICI-BOND', name: 'ICICI Bank 8.7% 2027' },
  { ticker: 'GOVT-5Y', name: 'Govt of India 6.92% 2028' },
  { ticker: 'NTPC-BOND', name: 'NTPC Ltd 8.4% 2030' },
  { ticker: 'BAJFIN-BOND', name: 'Bajaj Finance 8.15% 2026' },
  { ticker: 'LT-BOND', name: 'L&T Finance 8.6% 2027' },
  { ticker: 'RPOWER-BOND', name: 'Reliance Power 8.9% 2028' },
  { ticker: 'GOVT-3Y', name: 'Govt of India 6.54% 2026' },
];

function getStocksByCategory(category: string) {
  if (category.includes('LARGE_CAP')) return LARGE_CAP_STOCKS;
  if (category.includes('MID_CAP')) return MID_CAP_STOCKS;
  if (category.includes('SMALL_CAP')) return SMALL_CAP_STOCKS;
  if (category.includes('DEBT')) return DEBT_HOLDINGS;
  if (category.includes('HYBRID')) {
    // Mix of large cap and debt
    return [...LARGE_CAP_STOCKS.slice(0, 7), ...DEBT_HOLDINGS.slice(0, 3)];
  }
  return LARGE_CAP_STOCKS; // Default
}

function generateHoldings(fundId: ObjectId, category: string) {
  const stocks = getStocksByCategory(category);
  const numHoldings = Math.floor(Math.random() * 3) + 8; // 8-10 holdings

  // Shuffle stocks
  const shuffled = [...stocks].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, numHoldings);

  // Generate percentages that sum to roughly 100%
  const basePercent = 100 / numHoldings;
  let remaining = 100;

  const holdings = selected.map((stock, index) => {
    let percent: number;
    if (index === selected.length - 1) {
      percent = parseFloat(remaining.toFixed(2));
    } else {
      // Vary between 80% and 120% of base percent
      const variance = basePercent * 0.4 * (Math.random() - 0.5);
      percent = parseFloat((basePercent + variance).toFixed(2));
      remaining -= percent;
    }

    return {
      fundId,
      ticker: stock.ticker,
      name: stock.name,
      percent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  // Sort by percentage descending
  return holdings.sort((a, b) => b.percent - a.percent);
}

async function addManagerAndHoldingsData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const fundsCollection = db.collection('funds');
    const managersCollection = db.collection('fund_managers');
    const holdingsCollection = db.collection('holdings');

    // Get all funds
    const funds = await fundsCollection.find({}).toArray();
    console.log(`Found ${funds.length} funds`);

    // Clear existing managers and holdings
    console.log('Clearing existing managers and holdings...');
    await managersCollection.deleteMany({});
    await holdingsCollection.deleteMany({});

    let managersAdded = 0;
    let holdingsAdded = 0;

    // Shuffle manager names to ensure variety
    const shuffledManagers = [...MANAGER_NAMES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < funds.length; i++) {
      const fund = funds[i];
      const fundId = new ObjectId(fund._id);

      const experience = Math.floor(Math.random() * 20) + 5; // 5-24 years
      const managerName = shuffledManagers[i % shuffledManagers.length];

      // Create fund manager with bio and photo
      const manager = {
        fundId,
        name: managerName,
        experience,
        qualification:
          QUALIFICATIONS[Math.floor(Math.random() * QUALIFICATIONS.length)],
        bio: generateBio(managerName, experience, fund.category),
        photo: AVATARS[i % AVATARS.length],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await managersCollection.insertOne(manager);
      managersAdded++;

      // Create holdings
      const holdings = generateHoldings(fundId, fund.category);
      if (holdings.length > 0) {
        await holdingsCollection.insertMany(holdings);
        holdingsAdded += holdings.length;
      }

      if ((i + 1) % 50 === 0) {
        console.log(`Processed ${i + 1}/${funds.length} funds...`);
      }
    }

    console.log('\n✅ Data addition complete!');
    console.log(`   Fund Managers added: ${managersAdded}`);
    console.log(`   Holdings added: ${holdingsAdded}`);
    console.log(
      `   Average holdings per fund: ${(holdingsAdded / managersAdded).toFixed(1)}`
    );
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

addManagerAndHoldingsData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
