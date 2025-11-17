/**
 * AI Chat Service - RAG (Retrieval Augmented Generation)
 * Vector-based semantic search + LLM integration
 */

import { OpenAI } from 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  fundData?: any;
  userProfile?: any;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    title: string;
    content: string;
    relevance: number;
  }>;
  relatedFunds?: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  followUpQuestions?: string[];
}

// Enhanced Knowledge base for mutual funds
const KNOWLEDGE_BASE = [
  {
    id: 'mf-basics',
    title: 'What are Mutual Funds?',
    content:
      'Mutual funds are professionally managed investment vehicles that pool money from multiple investors to create a diversified portfolio of stocks, bonds, or other securities. Each investor owns units, representing their portion of holdings. Benefits include: professional management, diversification, liquidity, affordability (start with ₹500), and regulatory oversight by SEBI.',
    tags: ['basics', 'introduction', 'mutual funds', 'what', 'are'],
  },
  {
    id: 'sip-explained',
    title: 'Systematic Investment Plan (SIP)',
    content:
      'SIP allows you to invest a fixed amount regularly (weekly/monthly/quarterly) in mutual funds. Key benefits: (1) Rupee Cost Averaging - buy more units when prices are low, fewer when high; (2) Power of Compounding - reinvested returns generate additional returns; (3) Disciplined Investing - automates savings; (4) Reduces Timing Risk - no need to predict market peaks/troughs. Example: ₹5,000/month SIP for 10 years at 12% return = ₹11.6 lakhs (invested ₹6 lakhs).',
    tags: [
      'sip',
      'investment',
      'strategy',
      'systematic',
      'plan',
      'how',
      'works',
    ],
  },
  {
    id: 'sip-vs-lumpsum',
    title: 'SIP vs Lumpsum Investment',
    content:
      'SIP is better when: (1) You have regular income but no large corpus; (2) Markets are volatile or at highs; (3) You want to reduce timing risk. Lumpsum is better when: (1) You have a large amount to invest; (2) Markets are at lows (after correction); (3) Long investment horizon (7+ years). Many experts recommend 70:30 split between SIP and lumpsum for optimal strategy.',
    tags: ['sip', 'lumpsum', 'compare', 'difference', 'vs', 'versus'],
  },
  {
    id: 'nav',
    title: 'Net Asset Value (NAV)',
    content:
      'NAV is the per-unit price of a mutual fund, calculated daily. Formula: NAV = (Total Assets - Total Liabilities) / Total Outstanding Units. Example: If fund has ₹100 crore assets, ₹5 crore liabilities, and 1 crore units, NAV = ₹95. Important: NAV is NOT a measure of fund quality - a ₹50 NAV fund can outperform a ₹200 NAV fund. Focus on returns, not NAV value.',
    tags: ['nav', 'valuation', 'basics', 'price', 'unit'],
  },
  {
    id: 'expense-ratio',
    title: 'Expense Ratio & Its Impact',
    content:
      'Expense ratio is the annual fee (as % of AUM) charged for fund management. Includes: fund manager fees, administrative costs, marketing (for regular plans). Direct plans have 0.5-1% lower expense ratio than regular plans. Impact: On ₹10 lakh investment over 10 years, 1% difference in expense ratio = ₹1.5 lakh difference in final corpus! SEBI limits: Equity funds - 2.25%, Debt funds - 2.0%. Always prefer direct plans for lower costs.',
    tags: ['fees', 'expense', 'costs', 'ratio', 'charges', 'direct', 'regular'],
  },
  {
    id: 'risk-types',
    title: 'Types of Risk in Mutual Funds',
    content:
      'Major risks: (1) Market Risk - price fluctuations due to economic conditions; (2) Credit Risk - issuer defaulting (debt funds); (3) Liquidity Risk - difficulty selling units quickly; (4) Interest Rate Risk - bond prices fall when rates rise; (5) Currency Risk - forex fluctuations in international funds; (6) Concentration Risk - over-exposure to few stocks/sectors. Risk mitigation: Diversify across categories, maintain long-term horizon, regular portfolio review.',
    tags: ['risk', 'safety', 'analysis', 'types', 'market', 'credit'],
  },
  {
    id: 'fund-categories',
    title: 'Mutual Fund Categories & Selection',
    content:
      'SEBI categorizes funds into: (1) Equity - Large-cap (stable, top 100 companies), Mid-cap (growth, 101-250), Small-cap (high-risk, 251+), Multi-cap, Sectoral, ELSS (tax-saving); (2) Debt - Liquid, Ultra-short, Corporate bond, Gilt (govt securities); (3) Hybrid - Aggressive (65-80% equity), Conservative (10-25% equity), Balanced (40-60% equity); (4) Solution Oriented - Retirement, Children. Choose based on: investment goal, time horizon, risk appetite.',
    tags: [
      'categories',
      'types',
      'classification',
      'equity',
      'debt',
      'hybrid',
      'which',
      'choose',
    ],
  },
  {
    id: 'sharpe-ratio',
    title: 'Sharpe Ratio - Risk-Adjusted Returns',
    content:
      'Sharpe Ratio = (Fund Return - Risk-free Rate) / Standard Deviation. Measures excess return per unit of risk. Interpretation: <1 = Poor, 1-2 = Good, 2-3 = Very Good, >3 = Excellent. Example: Fund A returns 15% with Sharpe 1.8, Fund B returns 18% with Sharpe 1.2 - Fund A is better on risk-adjusted basis. Use it to compare similar category funds. Higher Sharpe = better compensation for taking risk.',
    tags: [
      'metrics',
      'sharpe',
      'performance',
      'ratio',
      'risk',
      'adjusted',
      'explain',
    ],
  },
  {
    id: 'alpha-beta',
    title: 'Alpha and Beta - Performance Metrics',
    content:
      'Alpha: Excess return vs benchmark. Positive alpha = outperformance. Example: If Nifty returns 12% and fund returns 15%, alpha = 3%. Target: >2% alpha consistently. Beta: Volatility vs market. Beta 1 = moves with market, <1 = less volatile (defensive), >1 = more volatile (aggressive). Example: Beta 1.2 means fund moves 1.2% for every 1% market movement. For conservative investors, prefer beta <1 with positive alpha.',
    tags: [
      'metrics',
      'alpha',
      'beta',
      'analysis',
      'performance',
      'benchmark',
      'explain',
      'meaning',
    ],
  },
  {
    id: 'tax-implications',
    title: 'Tax on Mutual Fund Returns',
    content:
      'EQUITY FUNDS: LTCG (>1 year) - 10% tax on gains above ₹1 lakh/year; STCG (≤1 year) - 15% flat. DEBT FUNDS: LTCG (>3 years) - 20% with indexation benefit; STCG (≤3 years) - Added to income, taxed at slab rate. HYBRID FUNDS: Taxed as equity if equity >65%, else as debt. DIVIDEND: TDS 10% if dividend >₹5,000/year, taxed at your slab rate. TAX-SAVING: ELSS has 3-year lock-in, ₹1.5L deduction under 80C.',
    tags: [
      'tax',
      'ltcg',
      'stcg',
      'taxation',
      'implications',
      'capital',
      'gains',
    ],
  },
  {
    id: 'when-to-exit',
    title: 'When to Exit a Mutual Fund',
    content:
      'Exit if: (1) Consistent underperformance vs benchmark and peers for 2-3 years; (2) Frequent fund manager changes; (3) Significant strategy drift (e.g., large-cap fund buying small-caps); (4) AUM becomes too large or too small; (5) Expense ratio increases significantly; (6) Your financial goal is achieved; (7) Better alternatives available with similar risk profile. Do not exit due to: short-term underperformance, market volatility, recent NAV drop. Review portfolio quarterly, but be patient with good funds.',
    tags: ['exit', 'sell', 'strategy', 'when', 'redeem', 'withdraw'],
  },
  {
    id: 'large-cap-funds',
    title: 'Large-Cap Equity Funds',
    content:
      'Invest primarily in top 100 companies by market cap (SEBI mandated 80% minimum). Characteristics: Lower volatility, stable returns, high liquidity, suitable for conservative equity investors. Expected returns: 10-13% CAGR long-term. Best for: First-time equity investors, 3-5 year goals, core portfolio (40-50% allocation). Top performers typically have: consistent track record, low expense ratio (<1%), experienced fund managers, diversified across sectors.',
    tags: ['large', 'cap', 'large-cap', 'bluechip', 'best', 'equity', 'funds'],
  },
  {
    id: 'mid-cap-funds',
    title: 'Mid-Cap and Small-Cap Funds',
    content:
      'MID-CAP (rank 101-250): Higher growth potential than large-cap, moderate volatility. Expected returns: 12-16% CAGR. SMALL-CAP (rank 251+): Highest growth potential, maximum volatility, illiquidity in bear markets. Expected returns: 15-20% CAGR but with higher risk. Recommended allocation: 20-30% mid-cap, 10-20% small-cap for aggressive investors. Hold for 7-10 years minimum to ride volatility. Avoid during market peaks.',
    tags: [
      'mid',
      'cap',
      'small',
      'mid-cap',
      'small-cap',
      'growth',
      'best',
      'funds',
    ],
  },
  {
    id: 'debt-funds',
    title: 'Debt Mutual Funds',
    content:
      'Invest in fixed-income securities: government bonds, corporate bonds, treasury bills, commercial papers. Types: (1) Liquid Funds - 1-91 days maturity, for emergency fund; (2) Ultra-Short Duration - 3-6 months, better than savings; (3) Short Duration - 1-3 years, FD alternative; (4) Corporate Bond - higher yield, some credit risk; (5) Gilt - govt securities, zero credit risk. Expected returns: 5-8% based on duration. Tax-efficient for 3+ year holding.',
    tags: [
      'debt',
      'fixed',
      'income',
      'bond',
      'liquid',
      'gilt',
      'safe',
      'funds',
    ],
  },
  {
    id: 'elss-tax-saving',
    title: 'ELSS - Tax Saving Mutual Funds',
    content:
      'Equity Linked Savings Scheme (ELSS) offers: (1) ₹1.5 lakh tax deduction under Section 80C; (2) Shortest lock-in among 80C options - just 3 years; (3) Potential for high returns (10-15% CAGR); (4) No maximum investment limit. Comparison: PPF (7-8%, 15-year lock), NSC (7%, 5-year lock), Tax-saver FD (6%, 5-year lock). Strategy: Start SIP in January for maximum 80C benefit, continue post lock-in for wealth creation. Ideal for tax-payers in 20%+ bracket.',
    tags: ['elss', 'tax', 'saving', '80c', 'deduction', 'best'],
  },
  {
    id: 'index-funds',
    title: 'Index Funds and ETFs',
    content:
      'Passive funds that replicate an index (Nifty 50, Sensex, Nifty Next 50). Benefits: (1) Very low expense ratio (0.1-0.5%); (2) No fund manager risk; (3) Transparent holdings; (4) Beats 70% of active funds over 10+ years. Best for: Long-term investors (10+ years), beginners, core portfolio allocation (30-40%). Top indices: Nifty 50 (large-cap), Nifty Next 50 (mid-cap opportunities), Nifty 500 (diversified). SIP recommended over lumpsum.',
    tags: ['index', 'passive', 'etf', 'nifty', 'sensex', 'funds'],
  },
  {
    id: 'portfolio-allocation',
    title: 'Portfolio Allocation Strategy',
    content:
      'Age-based rule: Equity % = 100 - Age (e.g., 30-year-old: 70% equity, 30% debt). AGGRESSIVE (Age <35): 80% equity (40% large, 30% mid, 10% small) + 20% debt. MODERATE (Age 35-50): 60% equity (35% large, 20% mid, 5% small) + 40% debt. CONSERVATIVE (Age >50): 30% equity (mostly large-cap) + 70% debt. Rebalance annually. Increase debt allocation as goals approach. Emergency fund (6 months expenses) in liquid funds before investing.',
    tags: [
      'portfolio',
      'allocation',
      'asset',
      'strategy',
      'how',
      'much',
      'invest',
    ],
  },
  {
    id: 'common-mistakes',
    title: 'Common Mutual Fund Mistakes',
    content:
      "Avoid these mistakes: (1) Chasing past performance - yesterday's winner is not tomorrow's winner; (2) Over-diversification - 15+ funds dilute returns; (3) Frequent switching - increases costs and taxes; (4) Ignoring expense ratios - 1% higher ER = 25% lower corpus in 25 years; (5) Investing lumpsum at market peaks - use STP; (6) No goal-based planning - align funds with specific goals; (7) Panic selling in corrections - stay invested; (8) Choosing regular over direct plans - wastes 1% annually.",
    tags: ['mistakes', 'avoid', 'common', 'errors', 'wrong', 'do not'],
  },
];

/**
 * Simple vector search using enhanced TF-IDF similarity with semantic understanding
 */
function calculateRelevance(query: string, document: any): number {
  const queryTokens = tokenize(query.toLowerCase());
  const docText =
    `${document.title} ${document.content} ${document.tags.join(' ')}`.toLowerCase();
  const docTokens = tokenize(docText);

  let matchScore = 0;

  // 1. Exact word matching (base score)
  for (const token of queryTokens) {
    if (docTokens.includes(token)) {
      matchScore += 1;
    }
  }

  // 2. Tag matching (higher weight - tags are key topics)
  const queryLower = query.toLowerCase();
  for (const tag of document.tags) {
    if (queryLower.includes(tag)) {
      matchScore += 2; // Tags get 2x weight
    }
  }

  // 3. Title matching (even higher weight - titles are specific topics)
  if (
    queryTokens.some((token) => document.title.toLowerCase().includes(token))
  ) {
    matchScore += 3;
  }

  // 4. Semantic phrase matching (common question patterns)
  const semanticBoosts = [
    {
      pattern: /how.*(work|calculate|compute)/i,
      boost: ['sip', 'nav', 'expense', 'returns'],
      score: 2,
    },
    {
      pattern: /what.*(is|are|mean)/i,
      boost: ['basics', 'introduction', 'explained'],
      score: 2,
    },
    {
      pattern: /best|top|good|recommend/i,
      boost: ['best', 'selection', 'criteria'],
      score: 2,
    },
    {
      pattern: /should\s+i|can\s+i/i,
      boost: ['strategy', 'advice', 'when'],
      score: 1.5,
    },
    {
      pattern: /difference|vs|versus|compare/i,
      boost: ['compare', 'vs', 'difference'],
      score: 2,
    },
    {
      pattern: /risk|safe|dangerous/i,
      boost: ['risk', 'safety', 'volatility'],
      score: 2,
    },
    { pattern: /tax|taxation/i, boost: ['tax', 'ltcg', 'stcg'], score: 3 },
  ];

  for (const { pattern, boost, score } of semanticBoosts) {
    if (pattern.test(query)) {
      for (const keyword of boost) {
        if (docText.includes(keyword) || document.tags.includes(keyword)) {
          matchScore += score;
        }
      }
    }
  }

  // Normalize score
  const maxPossibleScore = queryTokens.length + 10; // Base + bonuses
  return matchScore / maxPossibleScore;
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Retrieve relevant documents from knowledge base
 */
export function retrieveRelevantDocs(
  query: string,
  topK: number = 3
): Array<{ title: string; content: string; relevance: number }> {
  const scoredDocs = KNOWLEDGE_BASE.map((doc) => ({
    ...doc,
    relevance: calculateRelevance(query, doc),
  }))
    .filter((doc) => doc.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, topK);

  return scoredDocs.map((doc) => ({
    title: doc.title,
    content: doc.content,
    relevance: Math.round(doc.relevance * 100),
  }));
}

/**
 * Build context for LLM with enhanced prompting
 */
function buildContext(
  query: string,
  relevantDocs: any[],
  context?: ChatContext
): string {
  let contextStr = `You are an expert Mutual Fund Investment Advisor with deep knowledge of Indian markets, SEBI regulations, and investment strategies.

**Current User Question:** "${query}"

**Your Role:**
- Answer THE SPECIFIC QUESTION asked by the user directly and comprehensively
- Use real examples with Indian market context (₹, Nifty, Sensex)
- Provide specific numbers, percentages, and timeframes relevant to their question
- Use emojis sparingly (2-3 per response) for visual appeal
- Break complex topics into digestible points
- Tailor your answer to the user's actual query, not a generic response

**Response Style:**
- Start with a DIRECT answer to their SPECIFIC question
- Follow with relevant explanation and context
- End with actionable next steps related to their question
- Keep responses 200-400 words for complex questions, 100-200 for simple ones
- Use bullet points and formatting for clarity
- Avoid generic answers - be specific to what they asked

`;

  if (relevantDocs.length > 0) {
    contextStr +=
      '**Relevant Knowledge Base Information for this Question:**\n';
    relevantDocs.forEach((doc, i) => {
      contextStr += `${i + 1}. ${doc.title}: ${doc.content}\n\n`;
    });
    contextStr +=
      "Use the above information to answer the user's SPECIFIC question. Don't just repeat the knowledge base - synthesize it to address their exact query.\n\n";
  }

  if (context?.fundData) {
    contextStr += `**Current Fund Data:**\n${JSON.stringify(context.fundData, null, 2)}\n\n`;
  }

  contextStr += `**Critical Guidelines:**
- Answer ONLY what the user is asking - don't give generic "best fund selection" answers if they ask about NAV
- If they ask about a specific topic (NAV, SIP, risk, tax), focus your entire answer on THAT topic
- If question is vague, provide a targeted answer based on context clues in their question
- For market timing/global events questions, provide specific impact analysis with examples
- Always mention both risks and returns when relevant
- Use real historical data (2008 crisis, 2020 COVID, 2022 Ukraine war, etc.)
- Never guarantee returns; use "historically" or "typically" for past performance
- If they ask about different topics in one question, address each separately\n`;

  return contextStr;
}

/**
 * Generate response using OpenAI GPT-4 (with intelligent fallback)
 */
export async function generateChatResponse(
  query: string,
  context?: ChatContext
): Promise<ChatResponse> {
  console.log('🤖 Processing query:', query);

  // Retrieve relevant documents from knowledge base
  const sources = retrieveRelevantDocs(query, 5); // Get top 5 most relevant
  console.log(`📚 Found ${sources.length} relevant knowledge sources`);

  // Check if OpenAI API is available
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      console.log('🚀 Using OpenAI GPT-4 for intelligent response...');
      const openai = new OpenAI({ apiKey });

      const systemContext = buildContext(query, sources, context);
      const messages: any[] = [{ role: 'system', content: systemContext }];

      // Add conversation history if available
      if (
        context?.conversationHistory &&
        context.conversationHistory.length > 0
      ) {
        messages.push(...context.conversationHistory.slice(-4)); // Last 4 messages for context
      }

      messages.push({ role: 'user', content: query });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective: $0.15/1M input tokens, $0.60/1M output
        messages,
        temperature: 0.8, // Slightly higher for more varied responses
        max_tokens: 1000, // Allow longer, more detailed answers
        presence_penalty: 0.3, // Encourage topic variety
        frequency_penalty: 0.2, // Reduce repetition
      });

      const answer =
        completion.choices[0]?.message?.content ||
        'I apologize, but I could not generate a response. Please try rephrasing your question.';

      console.log('✅ OpenAI response generated successfully');
      console.log(
        `📊 Tokens used: ${completion.usage?.total_tokens || 'unknown'}`
      );

      return {
        answer,
        sources: sources.slice(0, 3), // Return top 3 sources
        followUpQuestions: generateFollowUpQuestions(query),
      };
    } catch (error: any) {
      console.error('❌ OpenAI API error:', error.message);
      console.log('⚠️ Falling back to rule-based response...');
      // Fall through to rule-based response
    }
  } else {
    console.log('⚠️ OpenAI API key not configured, using rule-based responses');
  }

  // Fallback: Rule-based response (for when API is unavailable)
  const answer = generateRuleBasedResponse(query, sources, context);

  return {
    answer,
    sources: sources.slice(0, 3),
    followUpQuestions: generateFollowUpQuestions(query),
  };
}

/**
 * Enhanced Rule-based response generator with contextual understanding
 */
function generateRuleBasedResponse(
  query: string,
  sources: any[],
  context?: ChatContext
): string {
  const lowerQuery = query.toLowerCase();
  console.log('🤖 Generating response for query:', query);
  console.log('📚 Found sources:', sources.length);

  // Enhanced keyword matching with more variations
  const queryKeywords = {
    sip: /\b(sip|systematic|investment|plan)\b/i,
    sipVsLumpsum:
      /\b(sip\s*(vs|versus|or)\s*lumpsum|lumpsum\s*(vs|versus|or)\s*sip)\b/i,
    risk: /\b(risk|safe|volatility|dangerous)\b/i,
    tax: /\b(tax|taxation|ltcg|stcg|capital\s*gain)\b/i,
    returns: /\b(return|performance|cagr|growth|profit)\b/i,
    expense: /\b(expense|fee|cost|charge)\b/i,
    nav: /\b(nav|net\s*asset\s*value|price|unit)\b/i,
    best: /\b(best|top|good|recommend)\b/i,
    largeCap: /\b(large[\s-]?cap|blue\s*chip)\b/i,
    midCap: /\b(mid[\s-]?cap)\b/i,
    smallCap: /\b(small[\s-]?cap)\b/i,
    elss: /\b(elss|tax[\s-]?sav(e|ing))\b/i,
    portfolio: /\b(portfolio|allocation|diversif)\b/i,
    howToStart:
      /\b(how\s*(to|do|can)\s*(start|begin|invest)|start\s*invest|beginner|new\s*to)\b/i,
    whichFund:
      /\b(which|what)\s*(fund|mf|mutual\s*fund).*\b(best|good|choose|select|right|suitable)\b/i,
    investAmount: /\b(invest|want.*invest|have.*(?:rupees|rs|₹|\d+))\b/i,
    marketImpact:
      /\b(global|world|international|news|event|impact|affect|influence|geopolitic|war|recession|inflation|fed|interest\s*rate)\b/i,
  };

  // Check which category the query falls into
  const isSipQuery =
    queryKeywords.sip.test(query) && !queryKeywords.sipVsLumpsum.test(query);
  const isSipVsLumpsum = queryKeywords.sipVsLumpsum.test(query);
  const isRiskQuery = queryKeywords.risk.test(query);
  const isTaxQuery = queryKeywords.tax.test(query);
  const isReturnQuery = queryKeywords.returns.test(query);
  const isExpenseQuery = queryKeywords.expense.test(query);
  const isNavQuery = queryKeywords.nav.test(query);
  const isBestFund = queryKeywords.best.test(query) && /fund/i.test(query);
  const isPortfolio = queryKeywords.portfolio.test(query);
  const isHowToStart = queryKeywords.howToStart.test(query);
  const isWhichFund = queryKeywords.whichFund.test(query);
  const isInvestAmount = queryKeywords.investAmount.test(query);
  const isMarketImpact =
    queryKeywords.marketImpact.test(query) &&
    /(stock|market|mutual\s*fund|investment|economy)/i.test(query);

  console.log('🔍 Query categories:', {
    isSipQuery,
    isSipVsLumpsum,
    isRiskQuery,
    isTaxQuery,
    isReturnQuery,
    isExpenseQuery,
    isNavQuery,
    isBestFund,
    isPortfolio,
    isHowToStart,
    isWhichFund,
    isInvestAmount,
    isMarketImpact,
  });

  // Handle market impact/global news questions FIRST
  if (isMarketImpact) {
    console.log('✅ Matched: Market Impact/Global News Query');
    return `🌍 **How Global Events Impact Stock Markets & Mutual Funds:**

**Direct Market Impacts:**

📉 **Negative Events:**
• **Geopolitical Tensions/War** → Market falls 5-15% (Ukraine war -12%)
• **Interest Rate Hikes** → Growth stocks fall, debt funds lose value
• **Global Recession** → FII outflows, market correction 20-30%
• **Banking Crisis** → Financial sector mutual funds crash 15-25%
• **Oil Price Shock** → Indian markets fall (we import 85% oil)

📈 **Positive Events:**
• **FII Inflows** → Market rallies, especially large-caps
• **Strong Global Growth** → Export-focused funds gain 10-20%
• **Rate Cuts** → Liquidity boost, debt funds rally
• **Technology Boom** → IT sector funds surge

**Mutual Fund Specific Impacts:**

🎯 **Fund Type Reactions:**

**Large-Cap Funds:** 60-70% correlation with global markets
• Follow MSCI World Index closely
• FII-driven (foreigners hold 40% Indian stocks)

**Mid/Small-Cap Funds:** 30-40% global correlation
• More domestic-driven, less volatile to global news
• Local economy matters more

**Debt Funds:** Highly sensitive to Fed rates
• US rate hike → India raises rates → Bond prices fall
• 1% rate change = 5-7% impact on long-duration funds

**Sector Funds:**
• IT Funds: +30% correlation (export-driven)
• Pharma: -20% correlation (defensive)
• Banking: +50% correlation (global liquidity)

**Real Examples:**

💥 **2008 Global Financial Crisis:**
• Sensex fell 60% (21,000 → 8,000)
• Large-cap funds lost 55%
• Recovery took 2 years

🦠 **2020 COVID Pandemic:**
• Initial fall: 38% in 1 month
• Full recovery: 6 months (V-shaped)
• IT/Pharma funds gained 50%+

⚔️ **2022 Russia-Ukraine War:**
• Nifty fell 12% initially
• Commodity/Energy funds gained 25%
• Global diversified funds lost 15%

**What Should Investors Do?**

✅ **During Global Crisis:**
1. **Don't Panic Sell** - Markets always recover long-term
2. **Continue SIPs** - Buy more units at lower NAV (rupee cost averaging)
3. **Rebalance Portfolio** - Move 10-20% to defensive sectors (Pharma, FMCG)
4. **Avoid New Lumpsum** - Use STP (Systematic Transfer Plan) instead

📊 **Historical Truth:**
• Every 20%+ fall has been followed by 100%+ recovery
• 2008 crash → 2014: +150%
• 2020 crash → 2021: +100%
• **Long-term investors always win**

🛡️ **Defensive Strategy:**
• Keep 20-30% in debt funds (cushion)
• Diversify across sectors (not just IT/Banking)
• Global diversified funds for hedge (10-15%)
• Avoid high-beta funds if you panic easily

💡 **Key Insight:** Global events create **short-term volatility** but **long-term opportunity**. Indian economy is growing at 6-7% - temporary global shocks don't change fundamentals.

**Want specific advice?** Ask:
• "Which funds are safe during recession?"
• "Should I stop SIP during market crash?"
• "How to protect portfolio from global risks?"`;
  }

  // Handle beginner/getting started questions FIRST
  if (isHowToStart) {
    console.log('✅ Matched: How to Start/Beginner Query');
    return `👋 **Welcome to Mutual Fund Investing! Here's Your Getting Started Guide:**

**Step 1: Complete KYC** 📋
• One-time process required by SEBI  
• Aadhaar + PAN card needed
• Can be done online in 10 minutes

**Step 2: Set Your Goals** 🎯
• Emergency fund (3-6 months expenses)
• Short-term (1-3 years): Vacation, gadgets → Debt funds
• Medium-term (3-5 years): Car, wedding → Hybrid funds
• Long-term (5+ years): House, retirement → Equity funds

**Step 3: Start with Small Amount** 💰
• Begin with ₹500-1,000 per month SIP
• Choose 2-3 funds maximum
• **Recommended starter portfolio:**
  - ₹500 in Nifty 50 Index Fund (Large-cap)
  - ₹500 in Flexi-cap Fund
  - ₹500 in Liquid Fund (emergency)

**Step 4: Choose Platform** 📱
• Direct plans save 1% annually
• Use MF portals like ours to compare and invest

**Step 5: Automate & Forget** 🔄
• Set up auto-debit for SIP
• Review once every 6 months
• Don't panic during market falls!

💡 **Next Steps:** "Show me best index funds" or "Calculate SIP for ₹5000"`;
  }

  // Handle "which fund" questions - need more context
  if (isWhichFund && !isBestFund) {
    console.log('✅ Matched: Which Fund Query');
    return `🤔 **To recommend the right fund, I need to know:**

1️⃣ **Investment Goal?** (Emergency/Short-term/Retirement/Tax-saving)
2️⃣ **Your Age?** (Risk capacity varies by age)
3️⃣ **Monthly Investment?** (₹500 or ₹50,000?)
4️⃣ **Risk Tolerance?** (Safe/Balanced/Aggressive)

**General Recommendations:**

**🛡️ Low Risk:** Liquid Funds, Debt Funds
**⚖️ Moderate Risk:** Large-cap Index Funds, Hybrid Funds
**🚀 High Risk:** Flexi-cap, Mid-cap, Small-cap Funds

💡 **Tell me:** "I'm 25, want ₹5000/month SIP for retirement" and I'll suggest specific funds!`;
  }

  // Handle investment amount queries
  if (isInvestAmount && !isSipQuery && !isBestFund) {
    console.log('✅ Matched: Investment Amount Query');
    const amountMatch = query.match(
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees|rs|₹|inr)?/i
    );
    const amount = amountMatch
      ? parseInt(amountMatch[1].replace(/,/g, ''))
      : null;

    if (amount && amount >= 500) {
      return `💰 **Perfect! ₹${amount.toLocaleString('en-IN')}/month Investment Plan:**

**Recommended Allocation (5+ years goal):**
• ₹${Math.round(amount * 0.4).toLocaleString('en-IN')} → Nifty 50 Index Fund
• ₹${Math.round(amount * 0.3).toLocaleString('en-IN')} → Flexi-cap Fund
• ₹${Math.round(amount * 0.2).toLocaleString('en-IN')} → Mid-cap Fund
• ₹${Math.round(amount * 0.1).toLocaleString('en-IN')} → Liquid Fund

**10-Year Projection @ 12%:**
• Invested: ₹${(amount * 120).toLocaleString('en-IN')}
• Final Value: ₹${Math.round(amount * 230).toLocaleString('en-IN')}
• Gain: ₹${Math.round(amount * 110).toLocaleString('en-IN')} 🎉

💡 **Want specific fund names?** Tell me your goal and timeframe!`;
    }
  }

  // SIP Related Queries
  if (isSipVsLumpsum) {
    console.log('✅ Matched: SIP vs Lumpsum');
    return `⚖️ **SIP vs Lumpsum - Which is Better?**

**Choose SIP when:**
✅ You have regular income but no large corpus
✅ Markets are at all-time highs (reduces timing risk)
✅ You want to build discipline
✅ You're new to investing

**Choose Lumpsum when:**
✅ You have a large amount to invest (bonus, inheritance, etc.)
✅ Markets are in correction/crash (great entry point)
✅ You have 7+ years investment horizon
✅ You can handle short-term volatility

**Pro Tip:** Many experts recommend a 70:30 combination - 70% via SIP and 30% lumpsum when markets correct. This balances consistency with opportunistic investing!

📈 **Historical Data:** SIP has historically outperformed lumpsum in volatile markets but lumpsum wins in consistently rising markets.`;
  }

  if (isSipQuery) {
    console.log('✅ Matched: SIP Query');
    if (lowerQuery.includes('how') || lowerQuery.includes('work')) {
      return `📊 **How SIP Works:**

SIP (Systematic Investment Plan) lets you invest a fixed amount regularly in mutual funds. Here's the magic:

🎯 **Key Benefits:**
1. **Rupee Cost Averaging** - When markets are down, you buy more units; when up, fewer units. This averages out your cost
2. **Power of Compounding** - Your returns generate more returns over time
3. **Disciplined Investing** - Automates your savings habit
4. **No Market Timing** - No need to predict market highs/lows

💰 **Example:**
₹5,000/month SIP for 10 years @ 12% return:
• Amount Invested: ₹6,00,000
• Final Value: ₹11,61,695
• Wealth Gained: ₹5,61,695 (93% return!)

🚀 **Getting Started:**
Start with an amount you're comfortable with (even ₹500 is fine). You can increase it by 10-15% annually as your income grows.`;
    }

    if (
      lowerQuery.includes('vs') ||
      lowerQuery.includes('lumpsum') ||
      lowerQuery.includes('better')
    ) {
      return `⚖️ **SIP vs Lumpsum - Which is Better?**

**Choose SIP when:**
✅ You have regular income but no large corpus
✅ Markets are at all-time highs (reduces timing risk)
✅ You want to build discipline
✅ You're new to investing

**Choose Lumpsum when:**
✅ You have a large amount to invest (bonus, inheritance, etc.)
✅ Markets are in correction/crash (great entry point)
✅ You have 7+ years investment horizon
✅ You can handle short-term volatility

**Pro Tip:** Many experts recommend a 70:30 combination - 70% via SIP and 30% lumpsum when markets correct. This balances consistency with opportunistic investing!

📈 **Historical Data:** SIP has historically outperformed lumpsum in volatile markets but lumpsum wins in consistently rising markets.`;
    }

    if (lowerQuery.includes('amount') || lowerQuery.includes('much')) {
      return `💵 **How Much SIP Amount to Invest?**

Follow the **50-30-20 Rule:**
• 50% for necessities (rent, food, bills)
• 30% for wants (entertainment, dining)
• 20% for savings & investments

📊 **Investment Breakdown from 20% savings:**
• 40% Emergency Fund (liquid funds) = 6 months expenses
• 40% Goal-based SIPs (equity/hybrid funds)
• 20% Retirement (ELSS/equity funds)

**Example:** If you earn ₹50,000/month:
• Total Investment Capacity: ₹10,000 (20%)
• SIP Allocation: ₹6,000-7,000
• Liquid/Emergency: ₹3,000-4,000

🎯 **Smart Strategy:** Start with what's comfortable, then increase by 10-15% annually. Even ₹500-1,000/month SIP can create significant wealth over 20 years!`;
    }

    // Default SIP response if no specific match
    return `📊 **About SIP (Systematic Investment Plan):**

SIP is a disciplined way to invest regularly in mutual funds. It helps you build wealth through:

✅ **Rupee Cost Averaging** - Buy more units when prices are low, fewer when high
✅ **Power of Compounding** - Your returns generate more returns
✅ **Disciplined Saving** - Automated monthly investments
✅ **Flexibility** - Start/stop/increase anytime

💡 **Pro Tip:** Start with whatever amount is comfortable for you and increase it by 10-15% annually as your income grows.

Want to know more? Ask me:
• "How does SIP work?"
• "SIP vs lumpsum?"
• "How much should I invest in SIP?"`;
  }

  // Fund Selection Queries
  if (isBestFund) {
    console.log('✅ Matched: Best Fund Query');
    if (queryKeywords.largeCap.test(query)) {
      console.log('  → Large Cap Funds');
      return `🏆 **Best Large-Cap Funds - Selection Criteria:**

**What Makes a Great Large-Cap Fund?**

📊 **Key Metrics to Check:**
1. **Sharpe Ratio** - Look for >1.5 (risk-adjusted returns)
2. **3Y & 5Y Returns** - Consistent 12-15% CAGR
3. **Expense Ratio** - <1% for direct plans
4. **Fund Size** - ₹5,000-50,000 Cr (not too small, not too large)
5. **Fund Manager Tenure** - 5+ years with same fund

✅ **Characteristics of Top Performers:**
• Beat Nifty 50 by 2-3% annually
• Low standard deviation (<15%)
• Diversified across 10+ sectors
• Max 10% in any single stock
• Experienced fund house (20+ years)

🎯 **Investment Strategy:**
• Allocate 40-50% of equity portfolio to large-caps
• Hold for minimum 3-5 years
• Best for conservative investors
• Suitable as core portfolio holdings

💡 Use our **Compare Tool** to evaluate specific funds side-by-side with these metrics!`;
    }

    if (queryKeywords.midCap.test(query)) {
      console.log('  → Mid Cap Funds');
      return `🚀 **Mid-Cap Funds - Growth with Moderate Risk:**

**Why Mid-Caps?**
• Companies ranked 101-250 by market cap
• Higher growth potential than large-caps
• Lower risk than small-caps
• Expected returns: 12-16% CAGR

**Selection Criteria:**
📈 **Performance Metrics:**
• 3Y returns > 15% and beating Nifty Midcap 150
• Sharpe ratio > 1 (risk-adjusted returns)
• Maximum drawdown < 35%
• Consistency across market cycles

⚠️ **Risk Factors:**
• Higher volatility (25-30% standard deviation)
• Can fall 40-50% in bear markets
• Some stocks may have liquidity issues
• Need longer holding period (7+ years)

👥 **Who Should Invest?**
• Aggressive investors with 7+ year horizon
• Those who can stomach 30-40% volatility
• As satellite holdings (20-30% of portfolio)
• Investors in 25-40 age group

🎯 **Pro Tip:** Never invest lumpsum in mid-caps. Always use SIP to average out volatility!`;
    }

    if (queryKeywords.elss.test(query)) {
      console.log('  → ELSS/Tax Saving Funds');
      return `💸 **ELSS - Best Tax-Saving Mutual Funds:**

**Why ELSS Wins:**
✅ **Tax Benefits:**
• ₹1.5 lakh deduction under Section 80C
• Save up to ₹46,800 tax (30% bracket)
• No TDS on gains

✅ **Better than Other 80C Options:**
• **PPF:** 7-8% return, 15-year lock-in
• **Tax-saver FD:** 6% return, 5-year lock-in
• **ELSS:** 12-15% return, just 3-year lock-in! 🏆

📊 **ELSS Selection Criteria:**
• 5Y returns > 15%
• Low expense ratio (<1.5%)
• Large fund size (₹1,000+ Cr)
• Experienced fund manager

💡 **Smart Strategy:**
1. Start SIP in January (claim 80C benefit for 3 years)
2. Invest ₹12,500/month to max out ₹1.5L limit
3. Continue SIP even after 3-year lock-in
4. Treat it as long-term wealth creation

⚡ **Tax Impact:** If you invest ₹1.5L in ELSS and you're in 30% bracket, you save ₹46,800 in taxes immediately!`;
    }

    return `🎯 **How to Choose the Best Mutual Funds:**

**Step 1: Define Your Goal & Timeframe**
• <3 years → Debt/Liquid funds
• 3-5 years → Hybrid/Balanced funds
• 5-7 years → Large-cap equity funds  
• 7+ years → Mid-cap, small-cap, multi-cap funds

**Step 2: Check These 5 Key Metrics**
1. **Returns:** 3Y & 5Y track record (not just 1Y)
2. **Sharpe Ratio:** >1 (risk-adjusted returns)
3. **Expense Ratio:** <1% for equity, <0.5% for debt
4. **Consistency:** Quartile ranking (top 25% each year)
5. **AUM:** Neither too small (<₹500 Cr) nor too large (>₹50,000 Cr)

**Step 3: Fund Manager Quality**
• Same manager for 5+ years
• Proven track record across market cycles
• Clear investment philosophy

**Step 4: Compare with Benchmark**
• Fund should beat benchmark by 2-3%
• Lower volatility than benchmark

💡 **Use our Smart Score feature** to get AI-powered ratings for any fund based on these criteria!`;
  }

  // Risk Related Queries
  if (isRiskQuery) {
    console.log('✅ Matched: Risk Query');
    if (
      lowerQuery.includes('reduce') ||
      lowerQuery.includes('minimize') ||
      lowerQuery.includes('lower')
    ) {
      return `🛡️ **How to Reduce Risk in Mutual Fund Investing:**

**1. Diversification (Most Important!)**
📊 Spread across:
• Different categories (large/mid/small-cap)
• Different sectors (IT, Banking, Pharma, etc.)
• Different fund houses (2-3 AMCs)
• Asset classes (60% equity + 40% debt for moderate risk)

**2. Increase Debt Allocation**
• Age-based rule: Equity% = 100 - Age
• 30 years old → 70% equity, 30% debt
• 50 years old → 50% equity, 50% debt

**3. Use SIP Instead of Lumpsum**
• Rupee cost averaging reduces timing risk
• Invests across market cycles
• Removes emotional decision-making

**4. Longer Investment Horizon**
• <3 years = High risk
• 5-7 years = Moderate risk
• 10+ years = Low risk (time smooths volatility)

**5. Choose Low-Volatility Funds**
📈 Look for:
• Beta < 1 (less volatile than market)
• Standard deviation < 15%
• Low maximum drawdown (< 25%)

**6. Regular Rebalancing**
• Review portfolio every 6 months
• Rebalance if any fund > 25% of portfolio
• Book profits and shift to debt when goals approach

⚡ **Risk vs Return Trade-off:** Higher returns always come with higher risk. The key is finding the RIGHT risk level for YOUR goals and temperament!`;
    }

    if (
      lowerQuery.includes('types') ||
      lowerQuery.includes('what') ||
      lowerQuery.includes('different')
    ) {
      return `📊 **Types of Risks in Mutual Funds:**

**1. Market Risk (Systematic Risk)**
• Entire market falls due to economic factors
• Affects all stocks/funds
• **Cannot be diversified away**
• Mitigation: Long investment horizon (7-10+ years)

**2. Credit Risk (Debt Funds)**
• Issuer defaults on bond payments
• Common in corporate bond funds
• **Check credit ratings:** AAA/AA is safer
• Mitigation: Stick to govt securities or high-rated bonds

**3. Liquidity Risk**
• Difficulty selling units quickly
• Common in small-cap/sector funds
• **Exit load** adds to cost (1-2% if sold before 1 year)
• Mitigation: Invest only surplus money, maintain emergency fund

**4. Interest Rate Risk (Debt Funds)**
• When interest rates rise → bond prices fall
• Long-duration debt funds most affected
• Mitigation: Choose short-duration funds in rising rate scenario

**5. Concentration Risk**
• Over-exposure to few stocks/sectors
• Magnifies losses if that sector crashes
• Mitigation: Diversify across sectors and market caps

**6. Currency Risk (International Funds)**
• Rupee appreciation reduces returns
• Rupee depreciation increases returns
• Mitigation: Limit international exposure to 10-15%

🎯 **Risk Assessment Tools:**
• **Beta:** Volatility vs market (<1 = less risky)
• **Standard Deviation:** Price fluctuations
• **Sharpe Ratio:** Return per unit of risk
• **Maximum Drawdown:** Worst historical decline

💡 Use our **Risk Analysis Tool** to check the risk profile of any fund!`;
    }

    // Default risk response if no specific match
    return `🛡️ **Managing Investment Risk:**

Mutual fund investments come with different types of risks:

📊 **Main Risk Types:**
• **Market Risk** - Market fluctuations affect fund value
• **Credit Risk** - Default risk in debt funds
• **Liquidity Risk** - Difficulty in selling quickly
• **Concentration Risk** - Too much in one stock/sector

✅ **Risk Reduction Strategies:**
1. Diversify across fund categories
2. Mix equity, debt, and hybrid funds
3. Invest for long term (5+ years)
4. Use SIP instead of lumpsum
5. Review and rebalance annually

Want to know more? Ask me:
• "How to reduce risk in mutual funds?"
• "What are different types of risks?"`;
  }

  // Tax Related Queries
  if (isTaxQuery) {
    console.log('✅ Matched: Tax Query');
    return `💰 **Mutual Fund Taxation - Complete Guide:**

**EQUITY FUNDS (>65% equity allocation)**

📊 **Long-Term Capital Gains (LTCG):**
• Holding Period: More than 1 year
• Tax Rate: 10% on gains above ₹1 lakh per year
• Example: Gain of ₹2L → Tax on ₹1L @ 10% = ₹10,000

📊 **Short-Term Capital Gains (STCG):**
• Holding Period: Less than 1 year
• Tax Rate: 15% flat (plus surcharge + cess)
• Example: Gain of ₹50K → Tax = ₹7,500

**DEBT FUNDS (<65% equity allocation)**

📊 **Long-Term Capital Gains:**
• Holding Period: More than 3 years
• Tax Rate: 20% with indexation benefit
• Indexation reduces taxable gains by inflation
• Much better than bank FD taxation!

📊 **Short-Term Capital Gains:**
• Holding Period: Less than 3 years
• Tax Rate: Added to your income, taxed at slab rate
• 30% bracket → 30% tax on gains

**HYBRID FUNDS:**
• Taxed as equity if equity portion >65%
• Taxed as debt if equity portion <65%

**DIVIDEND TAXATION:**
• TDS: 10% if annual dividend > ₹5,000
• Added to your income, taxed at slab rate
• Growth option is more tax-efficient!

**TAX-SAVING (ELSS):**
• 3-year lock-in
• ₹1.5L deduction under Section 80C
• LTCG rules apply after 3 years

🎯 **Tax-Saving Strategies:**
1. Hold equity funds for >1 year to get LTCG benefit
2. Use ₹1L LTCG exemption annually (sell & reinvest)
3. Choose growth option over dividend
4. For debt, use indexation benefit (hold 3+ years)
5. Harvest losses to offset gains

⚠️ **Important:** Always consult a tax advisor for personalized advice based on your tax bracket and financial situation.`;
  }

  // Return / Performance Queries
  if (isReturnQuery && !isBestFund) {
    console.log('✅ Matched: Return/Performance Query');
    return `📈 **Understanding Mutual Fund Returns:**

**Types of Returns:**

1. **Absolute Return** - Total gain/loss
   • Formula: (Current NAV - Initial NAV) / Initial NAV × 100
   • Example: Invested at ₹100, now ₹130 = 30% absolute return

2. **CAGR (Compounded Annual Growth Rate)**
   • Smoothed annual return over period
   • More accurate for long-term evaluation
   • Example: 30% over 3 years = 9.1% CAGR

3. **Point-to-Point Return**
   • Return between two specific dates
   • Can be misleading (depends on market timing)

4. **Rolling Returns**
   • Average of all possible period returns
   • Most accurate measure of consistency
   • Check 3Y and 5Y rolling returns

**Realistic Return Expectations:**

🎯 **Large-Cap Equity:** 10-13% CAGR
🎯 **Mid-Cap Equity:** 12-16% CAGR  
🎯 **Small-Cap Equity:** 15-20% CAGR (with high volatility)
🎯 **Debt Funds:** 6-8% CAGR
🎯 **Hybrid Funds:** 8-11% CAGR
🎯 **Index Funds:** 10-12% CAGR (matches market)

**Don't Chase High Returns!**
⚠️ Past performance doesn't guarantee future returns
⚠️ Higher returns = Higher risk always
⚠️ Focus on risk-adjusted returns (Sharpe ratio)

**Better Metrics than Returns:**
✅ Beat benchmark by 2-3% consistently
✅ Sharpe ratio > 1.5
✅ Top quartile performance across cycles
✅ Low downside capture ratio

💡 **Use our Performance Prediction tool** to see expected returns based on historical patterns!`;
  }

  // Expense Ratio Queries
  if (isExpenseQuery) {
    console.log('✅ Matched: Expense Ratio Query');
    return `💸 **Expense Ratio - The Silent Wealth Killer:**

**What is Expense Ratio?**
Annual fee (% of AUM) charged by fund house for managing your money.

📊 **Components:**
• Fund manager fees
• Administrative costs
• Marketing expenses (for regular plans)
• Registrar & transfer agent fees
• Custodian fees

**SEBI Maximum Limits:**
• Equity Funds: 2.25%
• Debt Funds: 2.00%
• Index Funds: 1.00%

**Direct vs Regular Plans:**
💎 **Direct Plans:** 0.5-1% lower expense ratio
💎 **Regular Plans:** Includes distributor commission

**The Shocking Impact:**
📈 Invested: ₹10 lakh for 20 years @ 12% return

| Expense Ratio | Final Corpus | Difference |
|--------------|--------------|------------|
| 0.5% | ₹89.85 lakh | - |
| 1.0% | ₹80.62 lakh | -₹9.2 lakh |
| 1.5% | ₹72.45 lakh | -₹17.4 lakh |
| 2.0% | ₹65.20 lakh | -₹24.6 lakh |

**1% higher expense ratio = 25% lower wealth over 25 years!**

**Golden Rules:**
✅ Always choose direct plans (use MF platforms directly)
✅ Look for expense ratios <1% in equity, <0.5% in debt
✅ Index funds should be <0.3%
✅ Avoid funds with expenses above SEBI average

⚡ **Pro Tip:** Even a 0.5% difference compounds to lakhs over decades. Always factor in expense ratio when choosing funds!`;
  }

  // Portfolio / Allocation Queries
  if (isPortfolio) {
    console.log('✅ Matched: Portfolio/Allocation Query');
    return `🎯 **Portfolio Allocation Strategy:**

**Age-Based Allocation Rule:**
📊 Equity % = 100 - Your Age

**Examples:**
• Age 25 → 75% Equity, 25% Debt
• Age 35 → 65% Equity, 35% Debt
• Age 45 → 55% Equity, 45% Debt
• Age 55 → 45% Equity, 55% Debt

**Detailed Portfolio Models:**

**🚀 AGGRESSIVE (Age 20-35)**
• 80% Equity:
  - 40% Large-cap
  - 30% Mid-cap
  - 10% Small-cap
• 20% Debt (liquid + short-term)

**⚖️ MODERATE (Age 35-50)**
• 60% Equity:
  - 35% Large-cap
  - 20% Mid-cap
  - 5% Small-cap
• 40% Debt (short + medium duration)

**🛡️ CONSERVATIVE (Age 50+)**
• 30-40% Equity (mostly large-cap)
• 60-70% Debt (balanced mix)
• Focus shifts to capital preservation

**Golden Rules:**
1️⃣ **Emergency Fund First:** 6 months expenses in liquid funds
2️⃣ **Don't Over-Diversify:** 6-8 funds maximum
3️⃣ **Goal-Based Allocation:**
   • <3 years goals → 100% debt
   • 3-5 years → 50-50 hybrid
   • 5+ years → 70% equity minimum
4️⃣ **Rebalance Annually:** Bring back to target allocation
5️⃣ **Increase Debt as Goals Approach**

**Sample ₹20,000/month SIP Portfolio (Moderate):**
• ₹6,000 - Large-cap index fund
• ₹4,000 - Flexi-cap fund
• ₹3,000 - Mid-cap fund
• ₹2,000 - ELSS (tax-saving)
• ₹3,000 - Corporate bond fund
• ₹2,000 - Liquid fund (emergency)

💡 Need personalized allocation? Use our **Portfolio Builder tool**!`;
  }

  // NAV Related Queries
  if (isNavQuery) {
    console.log('✅ Matched: NAV Query');
    return `📊 **NAV (Net Asset Value) - Complete Explanation:**

**What is NAV?**
NAV is the per-unit price of a mutual fund, calculated at the end of each trading day.

**Formula:**
NAV = (Total Assets - Total Liabilities) / Total Outstanding Units

**Example:**
• Fund Assets: ₹100 crore
• Fund Liabilities: ₹5 crore
• Outstanding Units: 1 crore
• NAV = (₹100 Cr - ₹5 Cr) / 1 Cr = **₹95**

**Common Myths Debunked:**

❌ **MYTH:** Lower NAV = Cheaper fund, better to buy
✅ **TRUTH:** NAV doesn't indicate fund quality or future performance

❌ **MYTH:** High NAV funds are expensive
✅ **TRUTH:** A ₹200 NAV fund can give same returns as ₹50 NAV fund

**What Actually Matters:**

✅ **Fund Returns:** 3Y and 5Y CAGR
✅ **Risk-Adjusted Returns:** Sharpe ratio
✅ **Consistency:** Performance across cycles
✅ **Expense Ratio:** Lower is better
✅ **Fund Manager:** Experience and track record

**When NAV Changes:**
• 📈 When underlying stocks/bonds gain value → NAV increases
• 📉 When markets fall → NAV decreases
• 💰 On dividend payout → NAV reduces by dividend amount
• 🔄 Daily at end of trading (by 9 PM for most funds)

**Example Comparison:**

Fund A: NAV ₹50, Returns 15%, Sharpe 1.8
Fund B: NAV ₹200, Returns 12%, Sharpe 1.2

**Fund A is BETTER** despite lower NAV!

🎯 **Key Takeaway:** Focus on returns, risk metrics, and consistency - NOT the NAV value. NAV is just the current price, not an indicator of value or future performance!`;
  }

  // Default response with better context from semantic search
  if (sources.length > 0) {
    console.log('✅ Using semantic search result from:', sources[0].title);
    const topSource = sources[0];

    // Create a contextual introduction based on the query
    let intro = '';
    if (lowerQuery.includes('what') || lowerQuery.includes('explain')) {
      intro = `📚 **${topSource.title}**\n\n`;
    } else if (lowerQuery.includes('how')) {
      intro = `💡 **Here's what you need to know:**\n\n`;
    } else if (lowerQuery.includes('best') || lowerQuery.includes('which')) {
      intro = `🎯 **Based on your question, here's relevant information:**\n\n`;
    } else {
      intro = `📖 **${topSource.title}**\n\n`;
    }

    return `${intro}${topSource.content}\n\n${
      sources.length > 1
        ? `\n📚 **Related Topics Available:**\n${sources
            .slice(1, 3)
            .map((s) => `• ${s.title}`)
            .join('\n')}\n\n`
        : ''
    }💡 **Need more specific help?** Ask me about:\n• Specific fund recommendations\n• Comparison between fund types\n• Investment calculations\n• Portfolio strategy for your goals`;
  }

  return (
    `I'd be happy to help with your mutual fund question! To give you the most relevant answer, could you please clarify:\n\n` +
    `• Are you asking about a specific fund category (equity/debt/hybrid)?\n` +
    `• Do you want to know about returns, risks, or investment strategy?\n` +
    `• Are you planning for short-term (<3 years) or long-term (5+ years) goals?\n\n` +
    `💬 **Popular Topics:**\n` +
    `• "Explain SIP vs lumpsum"\n` +
    `• "Best large-cap funds"\n` +
    `• "How to reduce investment risk"\n` +
    `• "ELSS vs PPF for tax saving"\n` +
    `• "Portfolio allocation strategy"`
  );
}

/**
 * Generate best fund response
 */
function generateBestFundResponse(
  query: string,
  context?: ChatContext
): string {
  let category = 'equity';

  if (query.includes('large cap') || query.includes('large-cap')) {
    category = 'large-cap equity';
  } else if (query.includes('mid cap') || query.includes('mid-cap')) {
    category = 'mid-cap equity';
  } else if (query.includes('small cap') || query.includes('small-cap')) {
    category = 'small-cap equity';
  } else if (query.includes('debt') || query.includes('bond')) {
    category = 'debt';
  } else if (query.includes('hybrid') || query.includes('balanced')) {
    category = 'hybrid';
  }

  let timeframe = '3-year';
  if (query.includes('1 year') || query.includes('1-year')) {
    timeframe = '1-year';
  } else if (query.includes('5 year') || query.includes('5-year')) {
    timeframe = '5-year';
  }

  return (
    `To find the best ${category} funds based on ${timeframe} performance, I recommend looking at:\n\n` +
    `1. **Sharpe Ratio**: Higher values indicate better risk-adjusted returns\n` +
    `2. **Consistency**: Funds with steady performance across market cycles\n` +
    `3. **Expense Ratio**: Lower costs mean higher returns for you\n` +
    `4. **Fund Manager Track Record**: Experienced managers with proven results\n\n` +
    `You can use our comparison tool to evaluate multiple funds side-by-side. ` +
    `Would you like me to help you compare specific funds?`
  );
}

/**
 * Generate follow-up questions
 */
function generateFollowUpQuestions(query: string): string[] {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('sip')) {
    return [
      'What is the ideal SIP amount for a beginner?',
      'How does SIP compare to lumpsum investment?',
      'Can I increase my SIP amount over time?',
    ];
  }

  if (lowerQuery.includes('risk')) {
    return [
      'What are the different risk categories in mutual funds?',
      'How do I assess my own risk tolerance?',
      'What is the relationship between risk and returns?',
    ];
  }

  if (lowerQuery.includes('best') || lowerQuery.includes('fund')) {
    return [
      'How do I compare two mutual funds?',
      'What metrics should I look at when selecting a fund?',
      'How often should I review my fund portfolio?',
    ];
  }

  return [
    'What are the key factors to consider before investing?',
    'How do mutual funds differ from direct stocks?',
    'What is the minimum investment period recommended?',
  ];
}

/**
 * Search for relevant funds based on query
 */
export async function searchFundsForQuery(
  query: string,
  allFunds: any[]
): Promise<Array<{ id: string; name: string; reason: string }>> {
  const lowerQuery = query.toLowerCase();
  const results: Array<{ id: string; name: string; reason: string }> = [];

  // Simple keyword matching (can be enhanced with ML)
  for (const fund of allFunds) {
    let score = 0;
    let reasons: string[] = [];

    // Category match
    if (
      lowerQuery.includes('large cap') &&
      fund.category?.toLowerCase().includes('large')
    ) {
      score += 10;
      reasons.push('Large-cap category match');
    }

    // Risk match
    if (
      lowerQuery.includes('low risk') &&
      fund.riskLevel?.toLowerCase().includes('low')
    ) {
      score += 10;
      reasons.push('Low risk profile');
    }

    // Performance keywords
    if (lowerQuery.includes('high return') && fund.returns3Y > 15) {
      score += 10;
      reasons.push(`Strong 3Y returns: ${fund.returns3Y}%`);
    }

    if (score > 0 && results.length < 5) {
      results.push({
        id: fund.id,
        name: fund.name,
        reason: reasons.join(', '),
      });
    }
  }

  return results;
}
