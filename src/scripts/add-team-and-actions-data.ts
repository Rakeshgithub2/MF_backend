import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI =
  process.env.DATABASE_URL || 'mongodb://localhost:27017/mutual_funds_db';

// Team member names pool
const TEAM_NAMES = [
  'Anil Kumar',
  'Priya Menon',
  'Rajesh Menon',
  'Kavita Shah',
  'Vikram Singh',
  'Deepa Rao',
  'Anjali Verma',
  'Rohan Patel',
  'Vikrant Desai',
  'Deepak Gupta',
  'Sanjay Iyer',
  'Meera Krishnan',
  'Rahul Verma',
  'Anita Rao',
  'Suresh Pillai',
  'Ritu Malhotra',
  'Karthik Subramanian',
  'Anjali Chopra',
  'Manish Agarwal',
  'Neha Singh',
  'Arvind Bhatia',
  'Sneha Menon',
  'Rohit Kapoor',
  'Divya Srinivasan',
];

// Sector specializations
const SECTORS = {
  LARGE_CAP: [
    'Technology',
    'Banking & Finance',
    'Consumer & Healthcare',
    'Energy & Utilities',
  ],
  MID_CAP: [
    'Healthcare & Pharma',
    'Industrials',
    'Auto & Ancillaries',
    'Metals & Mining',
  ],
  SMALL_CAP: [
    'Emerging Businesses',
    'Consumer & Retail',
    'Chemicals & Materials',
    'IT Services',
  ],
  DEBT: [
    'Fixed Income',
    'Credit Research',
    'Duration Management',
    'Yield Optimization',
  ],
  HYBRID: [
    'Equity Research',
    'Debt Research',
    'Asset Allocation',
    'Risk Management',
  ],
};

const ROLES = [
  'Co-Fund Manager & Sector Specialist',
  'Senior Research Analyst',
  'Quantitative Analyst & Risk Manager',
  'Research Associate',
  'Portfolio Analyst',
  'Senior Equity Analyst',
];

const EDUCATIONS = [
  'B.Tech (IIT Delhi), MBA (IIM Bangalore)',
  'CA, MBA (XLRI Jamshedpur)',
  'M.Sc Statistics (Delhi University), CFA Level III',
  'B.E. Computer Science, MBA (Finance)',
  'B.Com, CA, CFA Charter',
  'B.Pharm, MBA (Marketing & Finance)',
  'M.Com, MBA (IIM Ahmedabad)',
  'B.Tech (IIT Bombay), CFA Charter',
  'CA, FRM',
  'MBA Finance (NMIMS), CFA Level II',
];

// Company pools for portfolio actions
const LARGE_CAP_COMPANIES = [
  'Titan Company',
  'Bajaj Finance',
  'Asian Paints',
  'HDFC Bank',
  'Infosys',
  'TCS',
  'Reliance Industries',
  'ICICI Bank',
  'Kotak Mahindra Bank',
  'Hindustan Unilever',
];

const MID_CAP_COMPANIES = [
  'Dixon Technologies',
  'Lemon Tree Hotels',
  'Persistent Systems',
  'Mphasis',
  'Cholamandalam Finance',
  'Aurobindo Pharma',
  'Torrent Pharma',
  'Astral Ltd',
  'Berger Paints',
  'Godrej Consumer',
];

const SMALL_CAP_COMPANIES = [
  'Route Mobile',
  'Happiest Minds Technologies',
  'Clean Science',
  'KPIT Technologies',
  'Nazara Technologies',
  'Bikaji Foods',
  'Craftsman Automation',
  'Symphony Ltd',
  'CAMS',
  'Fine Organic Industries',
];

const ACTIONS = ['Increased Stake', 'New Entry', 'Reduced Stake', 'Exit'];

function getCompaniesForCategory(category: string): string[] {
  if (category.includes('LARGE')) return LARGE_CAP_COMPANIES;
  if (category.includes('MID')) return MID_CAP_COMPANIES;
  if (category.includes('SMALL')) return SMALL_CAP_COMPANIES;
  return LARGE_CAP_COMPANIES;
}

function getSectorsForCategory(category: string): string[] {
  if (category.includes('LARGE')) return SECTORS.LARGE_CAP;
  if (category.includes('MID')) return SECTORS.MID_CAP;
  if (category.includes('SMALL')) return SECTORS.SMALL_CAP;
  if (category.includes('DEBT')) return SECTORS.DEBT;
  if (category.includes('HYBRID')) return SECTORS.HYBRID;
  return SECTORS.LARGE_CAP;
}

function generateExpertise(
  role: string,
  sector: string,
  category: string
): string {
  const expertiseTemplates = {
    'Co-Fund Manager & Sector Specialist': [
      `Expert in ${sector.toLowerCase()} with deep understanding of industry dynamics and regulatory environment.`,
      `Specializes in identifying quality companies in ${sector.toLowerCase()} space with sustainable competitive advantages.`,
      `Focuses on fundamental analysis and long-term value creation in ${sector.toLowerCase()} sector.`,
    ],
    'Senior Research Analyst': [
      `Covers ${sector.toLowerCase()} companies with strong focus on financial modeling and valuation.`,
      `Deep expertise in ${sector.toLowerCase()} sector analysis and company-specific research.`,
      `Specializes in ${sector.toLowerCase()} with comprehensive understanding of business models and growth drivers.`,
    ],
    'Quantitative Analyst & Risk Manager': [
      'Manages portfolio risk using quantitative models, stress testing, and scenario analysis.',
      'Background in algorithmic trading and statistical arbitrage strategies.',
      'Expert in risk metrics, VaR modeling, and portfolio optimization techniques.',
    ],
    'Research Associate': [
      `Analyzes ${sector.toLowerCase()} companies with focus on growth potential and margin sustainability.`,
      `Tracks ${sector.toLowerCase()} sector trends and emerging opportunities.`,
      `Covers ${sector.toLowerCase()} space with emphasis on competitive positioning.`,
    ],
  };

  const roleKey = Object.keys(expertiseTemplates).find((key) =>
    role.includes(key.split('&')[0].trim())
  );
  const templates = roleKey
    ? expertiseTemplates[roleKey as keyof typeof expertiseTemplates]
    : expertiseTemplates['Research Associate'];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateTeamMembers(
  fundId: ObjectId,
  category: string,
  fundName: string
): any[] {
  const sectors = getSectorsForCategory(category);
  const teamSize = Math.floor(Math.random() * 2) + 3; // 3-4 team members
  const shuffledNames = [...TEAM_NAMES].sort(() => Math.random() - 0.5);
  const shuffledSectors = [...sectors].sort(() => Math.random() - 0.5);

  const team = [];
  for (let i = 0; i < teamSize; i++) {
    const role =
      i === 0
        ? ROLES[0] // First member is always Co-Fund Manager
        : ROLES[Math.floor(Math.random() * (ROLES.length - 1)) + 1];

    const sector = shuffledSectors[i % shuffledSectors.length];
    const fullRole = role.includes('&')
      ? `${role} (${sector})`
      : `${role} (${sector})`;

    team.push({
      fundId,
      name: shuffledNames[i],
      role: fullRole,
      experience: `${Math.floor(Math.random() * 12) + 6} years`, // 6-17 years
      expertise: generateExpertise(role, sector, category),
      education: EDUCATIONS[Math.floor(Math.random() * EDUCATIONS.length)],
      order: i,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return team;
}

function generateRationale(action: string, company: string): string {
  const rationales = {
    'Increased Stake': [
      `Strong quarterly earnings and improving market share. Increased position from ${(Math.random() * 3 + 2).toFixed(1)}% to ${(Math.random() * 3 + 5).toFixed(1)}%.`,
      `Robust growth outlook and attractive valuation. Enhanced allocation from ${(Math.random() * 2 + 3).toFixed(1)}% to ${(Math.random() * 2 + 6).toFixed(1)}%.`,
      `Positive industry tailwinds and strong execution. Raised stake from ${(Math.random() * 2.5 + 2.5).toFixed(1)}% to ${(Math.random() * 2.5 + 5.5).toFixed(1)}%.`,
    ],
    'New Entry': [
      `Attractive entry point with strong growth potential. Added ${(Math.random() * 2 + 2).toFixed(1)}% position.`,
      `High conviction idea with improving fundamentals. Initial ${(Math.random() * 1.5 + 2.5).toFixed(1)}% stake.`,
      `Emerging opportunity with sustainable competitive advantage. Started with ${(Math.random() * 2 + 2).toFixed(1)}% allocation.`,
    ],
    'Reduced Stake': [
      `Valuation concerns after significant rally. Trimmed position from ${(Math.random() * 2 + 5).toFixed(1)}% to ${(Math.random() * 1.5 + 1.5).toFixed(1)}%.`,
      `Profit booking after achieving target price. Reduced from ${(Math.random() * 2.5 + 4).toFixed(1)}% to ${(Math.random() * 1.5 + 2).toFixed(1)}%.`,
      `Risk management measure due to uncertainty. Lowered exposure from ${(Math.random() * 2 + 4).toFixed(1)}% to ${(Math.random() * 1 + 1).toFixed(1)}%.`,
    ],
    Exit: [
      `Valuation fully played out. Booked ${Math.floor(Math.random() * 30 + 30)}% gains and redeployed capital.`,
      `Better opportunities identified elsewhere. Exited with ${Math.floor(Math.random() * 25 + 20)}% returns.`,
      `Strategic reallocation to higher conviction ideas. Realized ${Math.floor(Math.random() * 35 + 25)}% profit.`,
    ],
  };

  const options = rationales[action as keyof typeof rationales];
  return options[Math.floor(Math.random() * options.length)];
}

function generatePortfolioActions(fundId: ObjectId, category: string): any[] {
  const companies = getCompaniesForCategory(category);
  const shuffledCompanies = [...companies].sort(() => Math.random() - 0.5);
  const numActions = 4; // Always 4 actions

  const months = ['Oct 2024', 'Sep 2024', 'Aug 2024', 'Jul 2024'];

  return months.map((month, index) => ({
    fundId,
    date: month,
    action: ACTIONS[index % ACTIONS.length],
    company: shuffledCompanies[index % shuffledCompanies.length],
    rationale: generateRationale(
      ACTIONS[index % ACTIONS.length],
      shuffledCompanies[index % shuffledCompanies.length]
    ),
    order: index,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

async function addTeamAndActionsData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const fundsCollection = db.collection('funds');
    const teamCollection = db.collection('management_team_members');
    const actionsCollection = db.collection('portfolio_actions');

    // Get all funds
    const funds = await fundsCollection.find({}).toArray();
    console.log(`Found ${funds.length} funds`);

    // Clear existing data
    console.log('Clearing existing team members and portfolio actions...');
    await teamCollection.deleteMany({});
    await actionsCollection.deleteMany({});

    let teamMembersAdded = 0;
    let actionsAdded = 0;

    for (let i = 0; i < funds.length; i++) {
      const fund = funds[i];
      const fundId = new ObjectId(fund._id);

      // Generate team members
      const teamMembers = generateTeamMembers(fundId, fund.category, fund.name);
      if (teamMembers.length > 0) {
        await teamCollection.insertMany(teamMembers);
        teamMembersAdded += teamMembers.length;
      }

      // Generate portfolio actions
      const actions = generatePortfolioActions(fundId, fund.category);
      if (actions.length > 0) {
        await actionsCollection.insertMany(actions);
        actionsAdded += actions.length;
      }

      if ((i + 1) % 50 === 0) {
        console.log(`Processed ${i + 1}/${funds.length} funds...`);
      }
    }

    console.log('\n✅ Data addition complete!');
    console.log(`   Management team members added: ${teamMembersAdded}`);
    console.log(`   Portfolio actions added: ${actionsAdded}`);
    console.log(
      `   Average team size: ${(teamMembersAdded / funds.length).toFixed(1)}`
    );
    console.log(
      `   Actions per fund: ${(actionsAdded / funds.length).toFixed(0)}`
    );
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

addTeamAndActionsData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
