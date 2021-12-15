export const propStatusText = {
  Unsponsored:
    'A member of the DAO can sponsor this proposal, moving it into the Voting Queue.',
  Cancelled:
    'This proposal has been struck down, and now it lay beneath the earth, putrifying as the insects feast.',
  approve: symbol =>
    symbol
      ? `You need to approve ${symbol} in order to sponsor it`
      : `You need to approve ${symbol} in order to sponsor this proposal`,
  noFunds: symbol =>
    symbol
      ? `You don't have enough ${symbol} to sponsor this proposal`
      : `You don't have enough deposit token to sponsor this proposal`,
};
