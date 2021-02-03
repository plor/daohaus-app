import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Icon,
  Skeleton,
  Tooltip,
  // Text,
} from '@chakra-ui/react';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import { RiErrorWarningLine, RiQuestionLine } from 'react-icons/ri';
import { isAfter, isBefore } from 'date-fns';
import { motion } from 'framer-motion';

import { useDao } from '../contexts/DaoContext';
import { useDaoMember } from '../contexts/DaoMemberContext';
import { useInjectedProvider } from '../contexts/InjectedProviderContext';
import { useUser } from '../contexts/UserContext';
import { TokenService } from '../services/tokenService';
import { useTX } from '../contexts/TXContext';
import { useOverlay } from '../contexts/OverlayContext';
import { createPoll } from '../services/pollService';
import { MolochService } from '../services/molochService';
import ContentBox from './ContentBox';
import TextBox from './TextBox';
import { memberVote } from '../utils/proposalUtils';
import { supportedChains } from '../utils/chain';
import { getCopy } from '../utils/metadata';
import { capitalize } from '../utils/general';
import { useMetaData } from '../contexts/MetaDataContext';

// import { MinionService } from '../../utils/minion-service';
// import Web3 from 'web3';
// import { getRpcUrl } from '../../utils/helpers';

const MotionBox = motion.custom(Box);

const ProposalVote = ({ proposal }) => {
  const [nextProposalToProcess, setNextProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const { daoOverview, daoProposals } = useDao();
  const { daoMember } = useDaoMember();
  const { daochain, daoid } = useParams();
  const { address, injectedProvider, injectedChain } = useInjectedProvider();
  const { cachePoll, resolvePoll } = useUser();
  const { errorToast, successToast } = useOverlay();
  const { refreshDao } = useTX();
  const { daoMetaData } = useMetaData();

  // const [minionDeets, setMinionDeets] = useState();

  const currentlyVoting = (proposal) => {
    return (
      isBefore(Date.now(), new Date(+proposal?.votingPeriodEnds * 1000)) &&
      isAfter(Date.now(), new Date(+proposal?.votingPeriodStarts * 1000))
    );
  };

  const daoConnectedAndSameChain = () => {
    return address && daochain && injectedChain?.chainId === daochain;
  };

  const NetworkOverlay = ({ children }) => (
    <Flex
      position='absolute'
      top='0px'
      left='0px'
      bottom='0px'
      right='0px'
      zIndex='3'
      fontFamily='heading'
      fontSize='xl'
      fontWeight={700}
      align='center'
      justify='center'
      style={{ backdropFilter: 'blur(6px)' }}
    >
      {`Connect to ${capitalize(supportedChains[daochain]?.network)}
      for ${getCopy(daoMetaData, 'proposal')} actions`}
    </Flex>
  );

  const cancelProposal = async (id) => {
    setLoading(true);
    try {
      console.log(id);
      const poll = createPoll({ action: 'cancelProposal', cachePoll })({
        daoID: daoid,
        chainID: daochain,
        proposalId: id,
        actions: {
          onError: (error, txHash) => {
            errorToast({
              title: `There was an error.`,
            });
            resolvePoll(txHash);
            console.error(`Could not find a matching proposal: ${error}`);
            setLoading(false);
          },
          onSuccess: (txHash) => {
            successToast({
              title: 'Cancelled proposal. Queued for voting!',
            });
            refreshDao();
            resolvePoll(txHash);
            setLoading(false);
          },
        },
      });
      MolochService({
        web3: injectedProvider,
        daoAddress: daoid,
        chainID: daochain,
        version: daoOverview.version,
      })('cancelProposal')([id], address, poll);
    } catch (err) {
      setLoading(false);
      console.log('error: ', err);
    }
  };

  const unlock = async (token) => {
    setLoading(true);
    console.log(token);
    // TODO change to unlimited
    const tokenAmount = (100 * 10 ** 18).toString();
    // ? multiply times decimals
    try {
      const poll = createPoll({ action: 'unlockToken', cachePoll })({
        daoID: daoid,
        chainID: daochain,
        tokenAddress: token,
        userAddress: address,
        unlockAmount: tokenAmount,
        actions: {
          onError: (error, txHash) => {
            errorToast({
              title: `Failed to unlock token`,
            });
            resolvePoll(txHash);
            console.error(`Could not unlock token: ${error}`);
            setLoading(false);
          },
          onSuccess: (txHash) => {
            successToast({
              // ? update to token symbol or name
              title: `Tribute token ${daoOverview?.depositToken?.symbol} unlocked`,
            });
            refreshDao();
            resolvePoll(txHash);
            setLoading(false);
          },
        },
      });
      TokenService({
        web3: injectedProvider,
        chainID: daochain,
        tokenAddress: token,
      })('approve')([daoid, tokenAmount], address, poll);
      // setUnlocked(true);
    } catch (err) {
      console.log('error:', err);
      setLoading(false);
    }
  };

  const sponsorProposal = async (id) => {
    setLoading(true);
    console.log('sponsor ', id);
    try {
      const poll = createPoll({ action: 'sponsorProposal', cachePoll })({
        daoID: daoid,
        chainID: daochain,
        proposalId: id,
        actions: {
          onError: (error, txHash) => {
            errorToast({
              title: `There was an error.`,
            });
            resolvePoll(txHash);
            console.error(`Could not find a matching proposal: ${error}`);
            setLoading(false);
          },
          onSuccess: (txHash) => {
            successToast({
              title: 'Sponsored proposal. Queued for voting!',
            });
            refreshDao();
            resolvePoll(txHash);
            setLoading(false);
          },
        },
      });
      MolochService({
        web3: injectedProvider,
        daoAddress: daoid,
        chainID: daochain,
        version: daoOverview.version,
      })('sponsorProposal')([id], address, poll);
    } catch (err) {
      setLoading(false);
      console.log('error: ', err);
    }
  };

  const submitVote = async (proposal, vote) => {
    setLoading(true);
    try {
      const poll = createPoll({ action: 'submitVote', cachePoll })({
        daoID: daoid,
        chainID: daochain,
        proposalId: proposal.proposalId,
        userAddress: address,
        actions: {
          onError: (error, txHash) => {
            errorToast({
              title: `There was an error.`,
            });
            resolvePoll(txHash);
            console.error(`Could not find a matching proposal: ${error}`);
          },
          onSuccess: (txHash) => {
            successToast({
              title: 'Sponsored proposal. Queued for voting!',
            });
            refreshDao();
            resolvePoll(txHash);
            setLoading(false);
          },
        },
      });
      MolochService({
        web3: injectedProvider,
        daoAddress: daoid,
        chainID: daochain,
        version: daoOverview.version,
      })('submitVote')([proposal.proposalIndex, vote], address, poll);
    } catch (err) {
      setLoading(false);
      console.log('error: ', err);
    }
  };

  const processProposal = async (proposal) => {
    setLoading(true);
    let proposalType = 'other';
    let processFn = 'processProposal';

    if (proposal.whitelist) {
      proposalType = 'whitelist';
      processFn = 'processWhitelistProposal';
    } else if (proposal.guildkick) {
      proposalType = 'guildkick';
      processFn = 'processWhitelistProposal';
    }
    console.log('proposalType :>> ', proposalType);
    console.log('processFn :>> ', processFn);

    try {
      const poll = createPoll({ action: 'processProposal', cachePoll })({
        daoID: daoid,
        chainID: daochain,
        proposalType: proposalType,
        proposalIndex: proposal.proposalIndex,
        actions: {
          onError: (error, txHash) => {
            errorToast({
              title: `There was an error.`,
            });
            resolvePoll(txHash);
            console.error(`Could not find a matching proposal: ${error}`);
            setLoading(false);
          },
          onSuccess: (txHash) => {
            successToast({
              title: 'Sponsored proposal. Queued for voting!',
            });
            refreshDao();
            resolvePoll(txHash);
            setLoading(false);
          },
        },
      });
      MolochService({
        web3: injectedProvider,
        daoAddress: daoid,
        chainID: daochain,
        version: daoOverview.version,
      })(processFn)([proposal.proposalIndex], address, poll);
    } catch (err) {
      setLoading(false);
      console.log('error: ', err);
    }
  };

  // const executeMinion = async (proposal) => {
  //   // TODO: will nedd to check if it has been executed yet
  //   const web3 = web3Connect?.web3
  //     ? web3Connect.web3
  //     : new Web3(new Web3.providers.HttpProvider(getRpcUrl(network)));
  //   const setupValues = {
  //     minion: proposal.minionAddress,
  //   };

  //   const minionService = new MinionService(web3, user?.username, setupValues);

  //   try {
  //     minionService.executeAction(proposal.proposalId, txCallBack);
  //   } catch (err) {
  //     console.log('error: ', err);
  //   }
  // };

  // useEffect(() => {
  //   let action;
  //   const getMinionDeets = async () => {
  //     // if (!proposal) {
  //     //   return;
  //     // }
  //     const setupValues = {
  //       minion: proposal.minionAddress,
  //     };
  //     const web3 = web3Connect?.web3
  //       ? web3Connect.web3
  //       : new Web3(new Web3.providers.HttpProvider(getRpcUrl(network)));

  //     const minionService = new MinionService(
  //       web3,
  //       user?.username,
  //       setupValues,
  //     );

  //     try {
  //       action = await minionService.getAction(proposal.proposalId);
  //     } catch (err) {
  //       console.log('error: ', err);
  //     }

  //     setMinionDeets(action);
  //   };
  //   if (proposal?.proposalId) {
  //     getMinionDeets();
  //   }

  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [proposal, user]);

  useEffect(() => {
    if (daoProposals) {
      const proposalsToProcess = daoProposals
        .filter((p) => p.status === 'ReadyForProcessing')
        .sort((a, b) => a.gracePeriodEnds - b.gracePeriodEnds);

      console.log(proposalsToProcess);
      if (proposalsToProcess.length > 0) {
        setNextProposal(proposalsToProcess[0]);
      }
    }
  }, [daoProposals]);

  return (
    <>
      <ContentBox position='relative'>
        {!daoConnectedAndSameChain() &&
          ((proposal?.status === 'Unsponsored' && !proposal?.proposalIndex) ||
            proposal?.status === 'ReadyForProcessing') && <NetworkOverlay />}
        {proposal?.status === 'Unsponsored' && !proposal?.proposalIndex && (
          <Flex justify='center' direction='column'>
            <Flex justify='center' mb={4}>
              <Flex justify='center' direction='column'>
                <TextBox size='xs'>
                  Deposit to Sponsor{' '}
                  <Tooltip
                    hasArrow
                    shouldWrapChildren
                    placement='bottom'
                    label='Deposits discourage spam, and are returned after a proposal is processed. Minus the reward for processing, if one has been selected'
                  >
                    <Icon mt='-4px' as={RiQuestionLine} />
                  </Tooltip>
                </TextBox>
                <TextBox variant='value' size='xl' textAlign='center'>
                  {daoOverview?.proposalDeposit /
                    10 ** daoOverview?.depositToken.decimals}{' '}
                  {daoOverview?.depositToken?.symbol}
                  {+daoMember?.tokenBalance <
                  +daoOverview?.proposalDeposit /
                    10 ** daoOverview?.depositToken.decimals ? (
                    <Tooltip
                      shouldWrapChildren
                      placement='bottom'
                      label={
                        'Insufficient Funds: You only have ' +
                        daoMember?.tokenBalance +
                        ' ' +
                        daoOverview?.depositToken?.symbol
                      }
                    >
                      <Icon
                        color='red.500'
                        as={RiErrorWarningLine}
                        ml={2}
                        mt='-4px'
                      />
                    </Tooltip>
                  ) : null}
                </TextBox>
              </Flex>
            </Flex>
            <Flex justify='space-around'>
              {+daoMember?.allowance *
                10 ** daoOverview?.depositToken?.decimals >
                +daoOverview?.proposalDeposit ||
              +daoOverview?.proposalDeposit === 0 ? (
                <Button
                  onClick={() => sponsorProposal(proposal?.proposalId)}
                  isLoading={loading}
                >
                  Sponsor
                </Button>
              ) : (
                <Button
                  onClick={() => unlock(daoOverview.depositToken.tokenAddress)}
                  isLoading={loading}
                >
                  Unlock
                </Button>
              )}
              {proposal?.proposer === address?.toLowerCase() && (
                <Button
                  variant='outline'
                  onClick={() => cancelProposal(proposal?.proposalId)}
                  isLoading={loading}
                >
                  Cancel
                </Button>
              )}
            </Flex>
          </Flex>
        )}
        {(proposal?.status !== 'Unsponsored' || proposal?.proposalIndex) &&
          proposal?.status !== 'Cancelled' && (
            <>
              <Flex mb={6} w='100%'>
                <Skeleton
                  isLoaded={proposal}
                  w='100%'
                  display='flex'
                  flexDirection='row'
                >
                  {currentlyVoting(proposal) ? (
                    <>
                      {daoMember && memberVote(proposal, address) === null && (
                        <Flex w='48%' justify='space-around'>
                          <Flex
                            p={3}
                            borderWidth='1px'
                            borderColor='green.500'
                            borderStyle='solid'
                            borderRadius='40px'
                            justiy='center'
                            align='center'
                          >
                            <Icon
                              as={FaThumbsUp}
                              color='green.500'
                              w='25px'
                              h='25px'
                              _hover={{ cursor: 'pointer' }}
                              onClick={() => submitVote(proposal, 1)}
                            />
                          </Flex>
                          <Flex
                            p={3}
                            borderWidth='1px'
                            borderColor='red.500'
                            borderStyle='solid'
                            borderRadius='40px'
                            justiy='center'
                            align='center'
                          >
                            <Icon
                              as={FaThumbsDown}
                              color='red.500'
                              w='25px'
                              h='25px'
                              transform='rotateY(180deg)'
                              _hover={{ cursor: 'pointer' }}
                              onClick={() => submitVote(proposal, 2)}
                            />
                          </Flex>
                        </Flex>
                      )}
                      <Flex
                        justify={
                          daoMember && memberVote(proposal, address) === null
                            ? 'flex-end'
                            : 'center'
                        }
                        align='center'
                        w={
                          daoMember && memberVote(proposal, address) === null
                            ? '50%'
                            : '100%'
                        }
                      >
                        <Box
                          as='i'
                          fontSize={
                            daoMember && memberVote(proposal, address) === null
                              ? 'xs'
                              : 'md'
                          }
                        >
                          {+proposal?.noShares > +proposal?.yesShares &&
                            'Not Passing'}
                          {+proposal?.yesShares > +proposal?.noShares &&
                            'Currently Passing'}
                          {+proposal?.yesShares === 0 &&
                            +proposal?.noShares === 0 &&
                            'Awaiting Votes'}
                        </Box>
                      </Flex>
                    </>
                  ) : (
                    <>
                      <Flex justify='center' align='center' w='100%'>
                        <TextBox size='xl' variant='value'>
                          {proposal?.status === 'Failed' && 'Failed'}
                          {proposal?.status === 'Passed' && 'Passed'}
                          {(proposal?.status === 'GracePeriod' ||
                            proposal?.status === 'ReadyForProcessing') &&
                            proposal.yesShares > proposal.noShares &&
                            'Passed'}
                          {(proposal?.status === 'GracePeriod' ||
                            proposal?.status === 'ReadyForProcessing') &&
                            proposal.noShares > proposal.yesShares &&
                            'Failed'}
                        </TextBox>
                      </Flex>
                    </>
                  )}
                </Skeleton>
              </Flex>
              <Flex
                w='100%'
                h='20px'
                borderRadius='999px'
                backgroundColor='whiteAlpha.500'
                overflow='hidden'
                justify='space-between'
              >
                {+proposal?.yesShares > 0 && (
                  <MotionBox
                    h='100%'
                    backgroundColor='green.500'
                    borderRight={
                      proposal?.noShares > 0
                        ? '1px solid white'
                        : '0px solid transparent'
                    }
                    animate={{
                      width: [
                        '0%',
                        `${(+proposal?.yesShares /
                          (+proposal.yesShares + +proposal.noShares)) *
                          100}%`,
                      ],
                    }}
                    transition={{ duration: 0.5 }}
                  />
                )}
                {+proposal?.noShares > 0 && (
                  <MotionBox
                    h='100%'
                    backgroundColor='red.500'
                    animate={{
                      width: [
                        '0%',
                        `${(+proposal?.noShares /
                          (+proposal.yesShares + +proposal.noShares)) *
                          100}%`,
                      ],
                    }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </Flex>
              <Flex justify='space-between' mt={3}>
                <Skeleton isLoaded={proposal?.yesShares}>
                  <TextBox variant='value' size='xl'>
                    {proposal?.yesShares || '0'} Yes
                  </TextBox>
                </Skeleton>
                <Skeleton isLoaded={proposal?.noShares}>
                  <TextBox variant='value' size='xl'>
                    {proposal?.noShares || '0'} No
                  </TextBox>
                </Skeleton>
              </Flex>
            </>
          )}

        {daoMember &&
          proposal?.status === 'ReadyForProcessing' &&
          (nextProposalToProcess?.proposalId === proposal?.proposalId ? (
            <Flex justify='center' pt='10px'>
              <Flex direction='column'>
                <Button
                  onClick={() => processProposal(proposal)}
                  isLoading={loading}
                >
                  Process
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex justify='center' pt='10px'>
              <Flex direction='column'>
                <Button
                  as={Link}
                  to={`/dao/${daochain}/${daoid}/proposals/${nextProposalToProcess?.proposalId}`}
                  variant='outline'
                  onClick={() => setNextProposal(nextProposalToProcess)}
                >
                  Proposal {nextProposalToProcess?.proposalId} Needs Processing
                  Next
                </Button>
              </Flex>
            </Flex>
          ))}
        {/* {proposal?.status === 'Passed' && proposal?.minionAddress && (
          <Flex justify='center' pt='10px'>
            <Flex direction='column'>
              {minionDeets?.executed ? (
                <Text>Executed</Text>
              ) : (
                <Button onClick={() => executeMinion(proposal)}>
                  Execute Minion
                </Button>
              )}
            </Flex>
          </Flex>
        )} */}
      </ContentBox>
    </>
  );
};

export default ProposalVote;
