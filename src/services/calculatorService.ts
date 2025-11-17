/**
 * Financial Calculators Service
 * Complete implementation of all investment calculators
 */

/**
 * SIP Calculator
 */
export interface SIPInput {
  monthlyInvestment: number;
  expectedReturnRate: number; // Annual % rate
  timePeriod: number; // Years
}

export interface SIPOutput {
  investedAmount: number;
  estimatedReturns: number;
  totalValue: number;
  yearWiseBreakup: Array<{
    year: number;
    invested: number;
    value: number;
    returns: number;
  }>;
}

export function calculateSIP(input: SIPInput): SIPOutput {
  const { monthlyInvestment, expectedReturnRate, timePeriod } = input;

  const monthlyRate = expectedReturnRate / 12 / 100;
  const months = timePeriod * 12;

  // FV of SIP = P × [(1 + r)^n - 1] / r × (1 + r)
  const futureValue =
    monthlyInvestment *
    (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
      (1 + monthlyRate));

  const investedAmount = monthlyInvestment * months;
  const estimatedReturns = futureValue - investedAmount;

  // Year-wise breakup
  const yearWiseBreakup: SIPOutput['yearWiseBreakup'] = [];
  for (let year = 1; year <= timePeriod; year++) {
    const monthsElapsed = year * 12;
    const valueAtYear =
      monthlyInvestment *
      (((Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate) *
        (1 + monthlyRate));

    const investedTillYear = monthlyInvestment * monthsElapsed;
    const returnsTillYear = valueAtYear - investedTillYear;

    yearWiseBreakup.push({
      year,
      invested: Math.round(investedTillYear),
      value: Math.round(valueAtYear),
      returns: Math.round(returnsTillYear),
    });
  }

  return {
    investedAmount: Math.round(investedAmount),
    estimatedReturns: Math.round(estimatedReturns),
    totalValue: Math.round(futureValue),
    yearWiseBreakup,
  };
}

/**
 * Lumpsum Calculator
 */
export interface LumpsumInput {
  investmentAmount: number;
  expectedReturnRate: number; // Annual %
  timePeriod: number; // Years
}

export interface LumpsumOutput {
  investedAmount: number;
  estimatedReturns: number;
  totalValue: number;
  yearWiseBreakup: Array<{
    year: number;
    value: number;
    returns: number;
  }>;
}

export function calculateLumpsum(input: LumpsumInput): LumpsumOutput {
  const { investmentAmount, expectedReturnRate, timePeriod } = input;

  // FV = PV × (1 + r)^n
  const futureValue =
    investmentAmount * Math.pow(1 + expectedReturnRate / 100, timePeriod);

  const estimatedReturns = futureValue - investmentAmount;

  // Year-wise breakup
  const yearWiseBreakup: LumpsumOutput['yearWiseBreakup'] = [];
  for (let year = 1; year <= timePeriod; year++) {
    const valueAtYear =
      investmentAmount * Math.pow(1 + expectedReturnRate / 100, year);
    const returnsAtYear = valueAtYear - investmentAmount;

    yearWiseBreakup.push({
      year,
      value: Math.round(valueAtYear),
      returns: Math.round(returnsAtYear),
    });
  }

  return {
    investedAmount: investmentAmount,
    estimatedReturns: Math.round(estimatedReturns),
    totalValue: Math.round(futureValue),
    yearWiseBreakup,
  };
}

/**
 * Step-up SIP Calculator
 */
export interface StepUpSIPInput {
  initialMonthlyInvestment: number;
  annualStepUp: number; // % increase per year
  expectedReturnRate: number; // Annual %
  timePeriod: number; // Years
}

export interface StepUpSIPOutput {
  totalInvested: number;
  estimatedReturns: number;
  totalValue: number;
  yearWiseBreakup: Array<{
    year: number;
    monthlyInvestment: number;
    invested: number;
    value: number;
    returns: number;
  }>;
}

export function calculateStepUpSIP(input: StepUpSIPInput): StepUpSIPOutput {
  const {
    initialMonthlyInvestment,
    annualStepUp,
    expectedReturnRate,
    timePeriod,
  } = input;

  const monthlyRate = expectedReturnRate / 12 / 100;
  let totalInvested = 0;
  let portfolioValue = 0;

  const yearWiseBreakup: StepUpSIPOutput['yearWiseBreakup'] = [];

  for (let year = 1; year <= timePeriod; year++) {
    const currentMonthlyInvestment =
      initialMonthlyInvestment * Math.pow(1 + annualStepUp / 100, year - 1);

    let yearStartValue = portfolioValue;
    let yearInvested = 0;

    // Calculate month by month for the year
    for (let month = 1; month <= 12; month++) {
      portfolioValue =
        portfolioValue * (1 + monthlyRate) + currentMonthlyInvestment;
      yearInvested += currentMonthlyInvestment;
      totalInvested += currentMonthlyInvestment;
    }

    const yearReturns = portfolioValue - totalInvested;

    yearWiseBreakup.push({
      year,
      monthlyInvestment: Math.round(currentMonthlyInvestment),
      invested: Math.round(totalInvested),
      value: Math.round(portfolioValue),
      returns: Math.round(yearReturns),
    });
  }

  return {
    totalInvested: Math.round(totalInvested),
    estimatedReturns: Math.round(portfolioValue - totalInvested),
    totalValue: Math.round(portfolioValue),
    yearWiseBreakup,
  };
}

/**
 * Goal Planner Calculator
 */
export interface GoalPlannerInput {
  goalAmount: number; // Target amount needed
  currentSavings: number; // Existing savings
  timePeriod: number; // Years to achieve goal
  expectedReturnRate: number; // Annual %
}

export interface GoalPlannerOutput {
  requiredMonthlySIP: number;
  requiredLumpsum: number;
  totalInvestmentNeeded: number;
  existingSavingsGrowth: number;
  shortfall: number;
  achievable: boolean;
  recommendation: string;
}

export function calculateGoalPlanner(
  input: GoalPlannerInput
): GoalPlannerOutput {
  const { goalAmount, currentSavings, timePeriod, expectedReturnRate } = input;

  // Future value of existing savings
  const existingSavingsGrowth =
    currentSavings * Math.pow(1 + expectedReturnRate / 100, timePeriod);

  // Shortfall to be covered
  const shortfall = Math.max(0, goalAmount - existingSavingsGrowth);

  // Required monthly SIP to cover shortfall
  const monthlyRate = expectedReturnRate / 12 / 100;
  const months = timePeriod * 12;

  let requiredMonthlySIP = 0;
  if (shortfall > 0 && months > 0) {
    // P = FV / [((1 + r)^n - 1) / r × (1 + r)]
    requiredMonthlySIP =
      shortfall /
      (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
        (1 + monthlyRate));
  }

  // Required lumpsum today to cover shortfall
  const requiredLumpsum =
    shortfall / Math.pow(1 + expectedReturnRate / 100, timePeriod);

  const totalInvestmentNeeded = requiredMonthlySIP * months;
  const achievable = shortfall <= goalAmount * 0.9; // Reasonable goal

  let recommendation = '';
  if (existingSavingsGrowth >= goalAmount) {
    recommendation =
      'Great! Your current savings are sufficient to meet your goal.';
  } else if (achievable) {
    recommendation =
      `To achieve your goal, invest ₹${Math.round(requiredMonthlySIP).toLocaleString('en-IN')} monthly via SIP ` +
      `or ₹${Math.round(requiredLumpsum).toLocaleString('en-IN')} as a lumpsum today.`;
  } else {
    recommendation =
      'The goal seems ambitious. Consider extending the time period or adjusting the target amount.';
  }

  return {
    requiredMonthlySIP: Math.round(requiredMonthlySIP),
    requiredLumpsum: Math.round(requiredLumpsum),
    totalInvestmentNeeded: Math.round(totalInvestmentNeeded),
    existingSavingsGrowth: Math.round(existingSavingsGrowth),
    shortfall: Math.round(shortfall),
    achievable,
    recommendation,
  };
}

/**
 * Retirement Calculator
 */
export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentMonthlyExpenses: number;
  inflationRate: number; // Annual %
  expectedReturnPreRetirement: number; // Annual %
  expectedReturnPostRetirement: number; // Annual %
  currentSavings: number;
}

export interface RetirementOutput {
  yearsToRetirement: number;
  retirementYears: number;
  monthlyExpensesAtRetirement: number;
  corpusRequired: number;
  existingSavingsGrowth: number;
  additionalCorpusNeeded: number;
  requiredMonthlySIP: number;
  recommendation: string;
  breakdown: {
    inflationImpact: string;
    corpusCalculation: string;
    savingsPlan: string;
  };
}

export function calculateRetirement(input: RetirementInput): RetirementOutput {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentMonthlyExpenses,
    inflationRate,
    expectedReturnPreRetirement,
    expectedReturnPostRetirement,
    currentSavings,
  } = input;

  const yearsToRetirement = retirementAge - currentAge;
  const retirementYears = lifeExpectancy - retirementAge;

  // Monthly expenses at retirement (adjusted for inflation)
  const monthlyExpensesAtRetirement =
    currentMonthlyExpenses *
    Math.pow(1 + inflationRate / 100, yearsToRetirement);

  // Annual expenses at retirement
  const annualExpensesAtRetirement = monthlyExpensesAtRetirement * 12;

  // Corpus required (considering post-retirement returns and inflation)
  // Using present value of annuity formula
  const realReturnPostRetirement =
    ((1 + expectedReturnPostRetirement / 100) / (1 + inflationRate / 100) - 1) *
    100;

  let corpusRequired: number;
  if (realReturnPostRetirement > 0) {
    // PV of annuity = PMT × [(1 - (1 + r)^-n) / r]
    const r = realReturnPostRetirement / 100;
    corpusRequired =
      annualExpensesAtRetirement *
      ((1 - Math.pow(1 + r, -retirementYears)) / r);
  } else {
    // Simple multiplication if real return is zero or negative
    corpusRequired = annualExpensesAtRetirement * retirementYears;
  }

  // Growth of existing savings
  const existingSavingsGrowth =
    currentSavings *
    Math.pow(1 + expectedReturnPreRetirement / 100, yearsToRetirement);

  // Additional corpus needed
  const additionalCorpusNeeded = Math.max(
    0,
    corpusRequired - existingSavingsGrowth
  );

  // Required monthly SIP
  const monthlyRate = expectedReturnPreRetirement / 12 / 100;
  const months = yearsToRetirement * 12;

  let requiredMonthlySIP = 0;
  if (additionalCorpusNeeded > 0 && months > 0) {
    requiredMonthlySIP =
      additionalCorpusNeeded /
      (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
        (1 + monthlyRate));
  }

  // Recommendation
  let recommendation = '';
  if (additionalCorpusNeeded === 0) {
    recommendation =
      '🎉 Excellent! Your current savings are on track for retirement.';
  } else if (requiredMonthlySIP < currentMonthlyExpenses * 0.3) {
    recommendation = `Start investing ₹${Math.round(requiredMonthlySIP).toLocaleString('en-IN')}/month to build a comfortable retirement corpus.`;
  } else {
    recommendation =
      'The required monthly investment is significant. Consider: 1) Extending retirement age, 2) Reducing post-retirement expenses, or 3) Increasing pre-retirement returns.';
  }

  return {
    yearsToRetirement,
    retirementYears,
    monthlyExpensesAtRetirement: Math.round(monthlyExpensesAtRetirement),
    corpusRequired: Math.round(corpusRequired),
    existingSavingsGrowth: Math.round(existingSavingsGrowth),
    additionalCorpusNeeded: Math.round(additionalCorpusNeeded),
    requiredMonthlySIP: Math.round(requiredMonthlySIP),
    recommendation,
    breakdown: {
      inflationImpact: `Your ₹${currentMonthlyExpenses.toLocaleString('en-IN')} monthly expenses will become ₹${Math.round(monthlyExpensesAtRetirement).toLocaleString('en-IN')} at retirement due to ${inflationRate}% inflation.`,
      corpusCalculation: `To sustain ₹${Math.round(monthlyExpensesAtRetirement).toLocaleString('en-IN')}/month for ${retirementYears} years, you need ₹${Math.round(corpusRequired).toLocaleString('en-IN')}.`,
      savingsPlan: `Your current ₹${currentSavings.toLocaleString('en-IN')} will grow to ₹${Math.round(existingSavingsGrowth).toLocaleString('en-IN')}. Additional ₹${Math.round(additionalCorpusNeeded).toLocaleString('en-IN')} needed.`,
    },
  };
}

/**
 * SWP (Systematic Withdrawal Plan) Calculator
 */
export interface SWPInput {
  investmentAmount: number;
  monthlyWithdrawal: number;
  expectedReturnRate: number; // Annual %
  timePeriod: number; // Years
}

export interface SWPOutput {
  totalWithdrawn: number;
  finalValue: number;
  monthsLasted: number;
  monthlyBreakup: Array<{
    month: number;
    withdrawal: number;
    returns: number;
    balance: number;
  }>;
  sustainable: boolean;
}

export function calculateSWP(input: SWPInput): SWPOutput {
  const {
    investmentAmount,
    monthlyWithdrawal,
    expectedReturnRate,
    timePeriod,
  } = input;

  const monthlyRate = expectedReturnRate / 12 / 100;
  const totalMonths = timePeriod * 12;

  let balance = investmentAmount;
  let totalWithdrawn = 0;
  let monthsLasted = 0;

  const monthlyBreakup: SWPOutput['monthlyBreakup'] = [];

  for (let month = 1; month <= totalMonths; month++) {
    // Calculate returns for the month
    const returns = balance * monthlyRate;
    balance += returns;

    // Withdraw
    const withdrawal = Math.min(monthlyWithdrawal, balance);
    balance -= withdrawal;
    totalWithdrawn += withdrawal;
    monthsLasted = month;

    if (month <= 60) {
      // Store only first 5 years in breakup
      monthlyBreakup.push({
        month,
        withdrawal: Math.round(withdrawal),
        returns: Math.round(returns),
        balance: Math.round(balance),
      });
    }

    // Stop if balance is depleted
    if (balance <= 0) break;
  }

  return {
    totalWithdrawn: Math.round(totalWithdrawn),
    finalValue: Math.round(Math.max(0, balance)),
    monthsLasted,
    monthlyBreakup,
    sustainable: balance > 0,
  };
}
