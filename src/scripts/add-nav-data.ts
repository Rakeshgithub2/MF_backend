import { MongoClient, ObjectId } from 'mongodb';

async function addNavData() {
  console.log('Adding NAV data for funds...');

  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('mutual_funds_db');
    const fundsCollection = db.collection('funds');
    const performancesCollection = db.collection('fund_performances');

    // Delete all existing NAV data first
    console.log('Clearing existing NAV data...');
    const deleteResult = await performancesCollection.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing records\n`);

    // Get all funds
    const funds = await fundsCollection.find({}).toArray();
    console.log(`Found ${funds.length} funds`);

    // Generate NAV data for the last 365 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 365);

    for (const fund of funds) {
      console.log(`\nAdding NAV data for: ${fund.name}`);

      // Starting NAV based on fund category
      let baseNav = 100;
      if (fund.category === 'LARGE_CAP') baseNav = 250;
      else if (fund.category === 'MID_CAP') baseNav = 180;
      else if (fund.category === 'SMALL_CAP') baseNav = 120;

      // Generate daily NAV data
      const navRecords = [];
      let currentNav = baseNav;
      const currentDate = new Date(startDate);

      while (currentDate <= today) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          // Random daily change between -2% to +2%
          const change = (Math.random() - 0.5) * 0.04;
          currentNav = currentNav * (1 + change);

          navRecords.push({
            fundId: new ObjectId(fund._id), // Store as ObjectId!
            date: new Date(currentDate),
            nav: parseFloat(currentNav.toFixed(2)),
            createdAt: new Date(),
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`  Generated ${navRecords.length} NAV records`);

      // Insert NAV records using MongoDB native driver
      const result = await performancesCollection.insertMany(navRecords);
      console.log(
        `  ✓ Inserted ${result.insertedCount} records for ${fund.name}`
      );
    }

    const totalCount = await performancesCollection.countDocuments();
    console.log(
      `\n🎉 NAV data added successfully! Total records: ${totalCount}`
    );
  } catch (error) {
    console.error('Error adding NAV data:', error);
    throw error;
  } finally {
    await client.close();
  }
}

addNavData();
