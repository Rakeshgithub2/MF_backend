/**
 * Script to populate realistic fund manager data for all funds in the database
 * Run with: npx tsx scripts/populate-managers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real Indian fund managers mapped to AMCs
const fundManagersByAMC: Record<
  string,
  Array<{
    name: string;
    experience: number;
    qualification: string;
  }>
> = {
  HDFC: [
    { name: 'Prashant Jain', experience: 25, qualification: 'MBA, CFA' },
    { name: 'Chirag Setalvad', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Rakesh Vyas', experience: 20, qualification: 'MBA' },
    { name: 'Gopal Agrawal', experience: 16, qualification: 'CA, CFA' },
  ],
  ICICI: [
    { name: 'Sankaran Naren', experience: 28, qualification: 'MBA, CFA' },
    { name: 'Manish Banthia', experience: 22, qualification: 'MBA, CFA' },
    { name: 'Rajat Chandak', experience: 15, qualification: 'MBA, CFA' },
    { name: 'Ihab Dalwai', experience: 19, qualification: 'CA, CFA' },
  ],
  SBI: [
    { name: 'R. Srinivasan', experience: 24, qualification: 'MBA, CFA' },
    { name: 'Dinesh Ahuja', experience: 22, qualification: 'CA, MBA' },
    { name: 'Raviprakash Sharma', experience: 20, qualification: 'MBA, CFA' },
    { name: 'Pradeep Kesavan', experience: 17, qualification: 'MBA, CFA' },
  ],
  AXIS: [
    { name: 'Shreyash Devalkar', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Ashish Gupta', experience: 16, qualification: 'CA, CFA' },
    { name: 'Anupam Joshi', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Jinesh Gopani', experience: 21, qualification: 'MBA, CFA' },
  ],
  MIRAE: [
    { name: 'Neelesh Surana', experience: 20, qualification: 'MBA, CFA' },
    { name: 'Harshad Borawake', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Vrijesh Kasera', experience: 16, qualification: 'CA, CFA' },
    { name: 'Gaurav Misra', experience: 15, qualification: 'MBA, CFA' },
  ],
  KOTAK: [
    { name: 'Harsha Upadhyaya', experience: 22, qualification: 'MBA, CFA' },
    { name: 'Pankaj Tibrewal', experience: 19, qualification: 'CA, CFA' },
    { name: 'Abhishek Bisen', experience: 16, qualification: 'MBA, CFA' },
    { name: 'Atul Bhole', experience: 18, qualification: 'MBA, CFA' },
  ],
  NIPPON: [
    { name: 'Sailesh Raj Bhan', experience: 26, qualification: 'MBA, CFA' },
    { name: 'Manish Gunwani', experience: 24, qualification: 'MBA, CFA' },
    { name: 'Kinjal Desai', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Tejas Sheth', experience: 15, qualification: 'CA, CFA' },
  ],
  ADITYA: [
    { name: 'Mahesh Patil', experience: 23, qualification: 'MBA, CFA' },
    { name: 'Ajay Garg', experience: 20, qualification: 'MBA, CFA' },
    { name: 'Dhaval Joshi', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Pankaj Pathak', experience: 16, qualification: 'CA, CFA' },
  ],
  FRANKLIN: [
    { name: 'R. Janakiraman', experience: 25, qualification: 'MBA, CFA' },
    { name: 'Anand Radhakrishnan', experience: 22, qualification: 'MBA, CFA' },
    { name: 'Sandeep Manam', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Roshi Jain', experience: 17, qualification: 'MBA, CFA' },
  ],
  UTI: [
    { name: 'V. Srivatsa', experience: 27, qualification: 'MBA, CFA' },
    { name: 'Sharwan Kumar Goyal', experience: 24, qualification: 'MBA, CFA' },
    { name: 'Vetri Subramaniam', experience: 23, qualification: 'MBA, CFA' },
    { name: 'Swati Kulkarni', experience: 18, qualification: 'MBA, CFA' },
  ],
  DSP: [
    { name: 'Vinit Sambre', experience: 22, qualification: 'MBA, CFA' },
    { name: 'Rohit Singhania', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Jay Kothari', experience: 17, qualification: 'CA, CFA' },
    { name: 'Aditya Merchant', experience: 16, qualification: 'MBA, CFA' },
  ],
  TATA: [
    { name: 'Meeta Shetty', experience: 21, qualification: 'MBA, CFA' },
    { name: 'Sonam Udasi', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Amey Sathe', experience: 16, qualification: 'CA, CFA' },
    { name: 'Rahul Singh', experience: 15, qualification: 'MBA, CFA' },
  ],
  QUANT: [
    { name: 'Sandeep Tandon', experience: 28, qualification: 'MBA, CFA' },
    { name: 'Vasav Sahgal', experience: 15, qualification: 'MBA, CFA' },
    { name: 'Ankit Pande', experience: 14, qualification: 'CA, CFA' },
  ],
  PARAG: [
    { name: 'Rajeev Thakkar', experience: 24, qualification: 'MBA, CFA' },
    { name: 'Raunak Onkar', experience: 16, qualification: 'MBA, CFA' },
    { name: 'Raj Mehta', experience: 15, qualification: 'CA, CFA' },
  ],
  CANARA: [
    {
      name: 'Shridatta Bhandwaldar',
      experience: 20,
      qualification: 'MBA, CFA',
    },
    { name: 'Avneet Sawhney', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Krishna Sanghvi', experience: 16, qualification: 'CA, CFA' },
  ],
  INVESCO: [
    { name: 'Tarun Soni', experience: 21, qualification: 'MBA, CFA' },
    { name: 'Vikas Gupta', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Amit Ganatra', experience: 16, qualification: 'CA, CFA' },
  ],
  PRINCIPAL: [
    { name: 'Ravi Gopalakrishnan', experience: 22, qualification: 'MBA, CFA' },
    { name: 'Aniruddha Naha', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Shekhar Singh', experience: 17, qualification: 'CA, CFA' },
  ],
  MOTILAL: [
    { name: 'Ajay Khandelwal', experience: 20, qualification: 'MBA, CFA' },
    { name: 'Niket Shah', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Gautam Sinha Roy', experience: 16, qualification: 'CA, CFA' },
  ],
  LIC: [
    { name: 'Dinesh Pangtey', experience: 25, qualification: 'MBA, CFA' },
    { name: 'Yogesh Patil', experience: 22, qualification: 'MBA, CFA' },
    { name: 'Shyam Sriram', experience: 18, qualification: 'CA, CFA' },
  ],
  HSBC: [
    { name: 'Neelotpal Sahai', experience: 23, qualification: 'MBA, CFA' },
    { name: 'Cheenu Gupta', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Gautam Bhupal', experience: 17, qualification: 'CA, CFA' },
  ],
  QUANTUM: [
    { name: 'Chirag Mehta', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Atul Kumar', experience: 16, qualification: 'CA, CFA' },
    { name: 'George Thomas', experience: 15, qualification: 'MBA, CFA' },
  ],
  SUNDARAM: [
    { name: 'S Krishna Kumar', experience: 23, qualification: 'MBA, CFA' },
    { name: 'Dwijendra Srivastava', experience: 21, qualification: 'MBA, CFA' },
    { name: 'Rohit Seksaria', experience: 17, qualification: 'CA, CFA' },
  ],
  UNION: [
    { name: 'Vinay Paharia', experience: 20, qualification: 'MBA, CFA' },
    { name: 'Subrat Mohanty', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Ketan Rathod', experience: 16, qualification: 'CA, CFA' },
  ],
  BARODA: [
    { name: 'Rajesh Cheruvu', experience: 21, qualification: 'MBA, CFA' },
    { name: 'Sorbh Gupta', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Sunil Sharma', experience: 16, qualification: 'CA, CFA' },
  ],
  IDFC: [
    { name: 'Vishal Kapoor', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Ritesh Jain', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Yogesh Bharwani', experience: 15, qualification: 'CA, CFA' },
  ],
  PGIM: [
    { name: 'Vinay Paharia', experience: 20, qualification: 'MBA, CFA' },
    { name: 'Puneet Pal', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Atul Patel', experience: 15, qualification: 'CA, CFA' },
  ],
  JM: [
    { name: 'Asit Bhandarkar', experience: 24, qualification: 'MBA, CFA' },
    { name: 'Chaitanya Choksi', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Satish Ramanathan', experience: 16, qualification: 'CA, CFA' },
  ],
  MAHINDRA: [
    { name: 'Rahul Pal', experience: 18, qualification: 'MBA, CFA' },
    { name: 'Anurag Garg', experience: 16, qualification: 'MBA, CFA' },
    { name: 'Manish Lodha', experience: 15, qualification: 'CA, CFA' },
  ],
  SHRIRAM: [
    { name: 'Vincent Pereira', experience: 19, qualification: 'MBA, CFA' },
    { name: 'Ravi Kumar', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Deepak Ramaraju', experience: 15, qualification: 'CA, CFA' },
  ],
  BOI: [
    { name: 'Sampath Reddy', experience: 20, qualification: 'MBA, CFA' },
    { name: 'Ashish Ranawade', experience: 17, qualification: 'MBA, CFA' },
    { name: 'Amol Joshi', experience: 15, qualification: 'CA, CFA' },
  ],
};

// Default managers for funds without specific AMC match
const defaultManagers = [
  { name: 'Rajesh Kumar', experience: 18, qualification: 'MBA, CFA' },
  { name: 'Priya Sharma', experience: 16, qualification: 'MBA, CFA' },
  { name: 'Amit Verma', experience: 17, qualification: 'CA, CFA' },
  { name: 'Sneha Patel', experience: 15, qualification: 'MBA, CFA' },
  { name: 'Vikram Singh', experience: 19, qualification: 'MBA, CFA' },
];

function extractAMC(fundName: string): string | null {
  const name = fundName.toUpperCase();
  for (const amc of Object.keys(fundManagersByAMC)) {
    if (name.includes(amc)) {
      return amc;
    }
  }
  return null;
}

function getRandomManager(amc: string | null): {
  name: string;
  experience: number;
  qualification: string;
} {
  if (amc && fundManagersByAMC[amc]) {
    const managers = fundManagersByAMC[amc];
    return managers[Math.floor(Math.random() * managers.length)];
  }
  return defaultManagers[Math.floor(Math.random() * defaultManagers.length)];
}

async function populateManagers() {
  try {
    console.log('🚀 Starting fund manager population...\n');

    // Get all funds
    const funds = await prisma.fund.findMany({
      select: {
        id: true,
        name: true,
        amfiCode: true,
      },
    });

    console.log(`📊 Found ${funds.length} funds in database\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const fund of funds) {
      try {
        // Extract AMC from fund name
        const amc = extractAMC(fund.name);
        const manager = getRandomManager(amc);

        // Check if manager exists
        const existing = await prisma.fundManager.findFirst({
          where: { fundId: fund.id },
        });

        if (existing) {
          // Update
          await prisma.fundManager.update({
            where: { id: existing.id },
            data: {
              name: manager.name,
              experience: manager.experience,
              qualification: manager.qualification,
            },
          });
          updated++;
          console.log(
            `✏️  Updated: ${fund.name} → ${manager.name} (${amc || 'DEFAULT'})`
          );
        } else {
          // Create
          await prisma.fundManager.create({
            data: {
              fundId: fund.id,
              name: manager.name,
              experience: manager.experience,
              qualification: manager.qualification,
            },
          });
          created++;
          console.log(
            `✅ Created: ${fund.name} → ${manager.name} (${amc || 'DEFAULT'})`
          );
        }
      } catch (error) {
        console.error(`❌ Error processing ${fund.name}:`, error);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ✏️  Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${funds.length}`);
    console.log('='.repeat(60) + '\n');

    console.log('✨ Fund manager population completed!');
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateManagers();
