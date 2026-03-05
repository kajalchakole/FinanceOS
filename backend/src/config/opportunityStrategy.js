const opportunityStrategy = {
  thresholds: [
    { drop: 10, deploy: 0.2 },
    { drop: 20, deploy: 0.3 },
    { drop: 35, deploy: 0.5 }
  ],
  allocationPlan: {
    NIFTY_ETF: 0.6,
    MIDCAP_ETF: 0.25,
    GOLD_ETF: 0.15
  }
};

export default opportunityStrategy;
