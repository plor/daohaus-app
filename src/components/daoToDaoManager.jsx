import React, { useEffect, useState } from 'react';
import { RiLoginBoxLine } from 'react-icons/ri';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Link,
  Spinner,
} from '@chakra-ui/react';

import { useInjectedProvider } from '../contexts/InjectedProviderContext';
import { useOverlay } from '../contexts/OverlayContext';
import TextBox from './TextBox';
import ContentBox from './ContentBox';
import DaoToDaoUberAlly from './daoToDaoUberAllyLink';
import DaoToDaoMemberInfo from './daoToDaoMemberInfo';
import { UBERHAUS_DATA } from '../utils/uberhaus';
import { chainByName } from '../utils/chain';
import {
  pendingUberHausStakingProposal,
  pendingUberHausStakingProposalChildDao,
} from '../utils/proposalUtils';
import { createContract } from '../utils/contract';
import { LOCAL_ABI } from '../utils/abi';

import DAOHaus from '../assets/img/Daohaus__Castle--Dark.svg';
import UberHausProposals from './uberHausProposals';

const DaoToDaoManager = ({
  daoOverview,
  daoMetaData,
  isMember,
  uberProposals,
  uberMembers,
  daoProposals,
  refetchAllies,
}) => {
  const { daochain, daoid } = useParams();
  const { injectedChain } = useInjectedProvider();
  const { setD2dProposalTypeModal, setGenericModal } = useOverlay();
  const [uberHausMinion, setUberHausMinion] = useState(null);
  const [loading, setLoading] = useState(true);
  const userNetworkMismatchOrNotMember =
    injectedChain?.chain_id !== daochain || !isMember;
  const daoNotOnUberNetwork = daochain !== UBERHAUS_DATA.NETWORK;
  const isUberHausMember = uberHausMinion && uberHausMinion.uberHausMembership;
  const needDelegateKeySet =
    isUberHausMember &&
    uberHausMinion.uberHausDelegate !==
      uberHausMinion.uberHausMembership.delegateKey;
  const uberAlly = daoMetaData?.allies.find(
    ally => ally.allyType === 'uberHausBurner' && ally.isParent,
  );
  const uberParent = daoMetaData?.allies.find(
    ally => ally.allyType === 'uberHausBurner' && !ally.isParent,
  );

  useEffect(() => {
    const setup = async () => {
      const uberHausMinionData = daoOverview.minions.find(
        minion =>
          minion.minionType === 'UberHaus minion' &&
          minion.uberHausAddress === UBERHAUS_DATA.ADDRESS,
      );
      if (uberHausMinionData) {
        const uberHausMembership = uberMembers.find(member => {
          return (
            member.memberAddress.toLowerCase() ===
            uberHausMinionData.minionAddress.toLowerCase()
          );
        });

        const activeMembershipProposal =
          (!uberHausMembership &&
            daoProposals.find(prop =>
              pendingUberHausStakingProposalChildDao(prop),
            )) ||
          uberProposals.find(prop =>
            pendingUberHausStakingProposal(
              prop,
              uberHausMinionData.minionAddress.toLowerCase(),
            ),
          );

        const openChildProposals = daoProposals
          ? daoProposals.filter(
              p =>
                p.applicant.toLowerCase() ===
                  uberHausMinionData.minionAddress.toLowerCase() &&
                !p.cancelled &&
                !p.processed,
            )
          : [];

        const openUberProposals = uberProposals
          ? uberProposals.filter(p => !p.cancelled && !p.processed)
          : [];

        const whitelistedStakingToken = daoOverview.tokenBalances.find(bal => {
          return (
            bal.token.tokenAddress.toLowerCase() ===
            UBERHAUS_DATA.STAKING_TOKEN.toLowerCase()
          );
        });
        const tokenContract = createContract({
          address: UBERHAUS_DATA.STAKING_TOKEN,
          abi: LOCAL_ABI.ERC_20,
          chainID: daochain,
        });
        const tokenBalance = await tokenContract.methods
          .balanceOf(uberHausMinionData.minionAddress)
          .call();

        setUberHausMinion({
          ...uberHausMinionData,
          balance: tokenBalance,
          uberHausMembership,
          activeMembershipProposal,
          openChildProposals,
          openUberProposals,
          whitelistedStakingToken,
        });
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    if (daoOverview && uberMembers && uberProposals && daoProposals) {
      setLoading(true);
      setup();
    }
  }, [daoOverview, uberMembers, uberProposals, daoProposals]);

  const openUberMinionModal = () => {
    setGenericModal({ uberMinionLaunch: true });
  };

  const openModal = () => setD2dProposalTypeModal(prevState => !prevState);

  if (daoid === UBERHAUS_DATA.ADDRESS) {
    return (
      <>
        <TextBox size='xs' mb={2}>
          DAO On DAO Memberships
        </TextBox>
        <ContentBox w='100%' maxWidth='40rem' position='relative'>
          <Flex align='center'>
            <>
              <Image src={DAOHaus} w='50px' h='50px' mr={4} />
              <Box
                fontFamily='heading'
                fontSize='xl'
                fontWeight={900}
                flexGrow='2'
              >
                This is UberHAUS
              </Box>
            </>
          </Flex>
        </ContentBox>
      </>
    );
  }

  return (
    <>
      <TextBox size='xs' mb={2}>
        DAO On DAO Memberships
      </TextBox>
      <ContentBox w='100%' maxWidth='40rem' position='relative'>
        <Flex align='center'>
          <>
            <Image src={DAOHaus} w='50px' h='50px' mr={4} />
            <Box
              fontFamily='heading'
              fontSize='xl'
              fontWeight={900}
              flexGrow='2'
            >
              UberHAUS
            </Box>
            <RouterLink
              to={`/dao/${UBERHAUS_DATA.NETWORK}/${UBERHAUS_DATA.ADDRESS}`}
            >
              <Icon
                as={RiLoginBoxLine}
                color='secondary.500'
                h='25px'
                w='25px'
              />
            </RouterLink>
          </>
        </Flex>

        {loading && <Spinner />}

        {!loading && (
          <>
            {daoNotOnUberNetwork ? (
              <>
                {uberAlly ? (
                  <Box mt={5}>
                    <DaoToDaoUberAlly
                      dao={{
                        name: `Manange membership in the ${UBERHAUS_DATA.NETWORK_NAME} burner dao`,
                        link: `/dao/${
                          chainByName(uberAlly.allyNetwork).chain_id
                        }/${uberAlly.ally}/allies`,
                      }}
                    />
                  </Box>
                ) : (
                  <>
                    {!userNetworkMismatchOrNotMember ? (
                      <>
                        <Box fontSize='md' my={2} position='relative'>
                          {`UberHAUS is on the ${UBERHAUS_DATA.NETWORK_NAME} network. Summon a clone of your DAO to that network to join.`}
                        </Box>
                        <Box my={2} h={100} position='relative'>
                          <Button
                            w='50%'
                            as={RouterLink}
                            to={`/dao/${daochain}/${daoid}/uberhaus/clone`}
                          >
                            Summon Clone
                          </Button>
                        </Box>
                      </>
                    ) : (
                      <Box fontSize='md' my={2}>
                        Are you a member of this DAO and on the correct network?
                      </Box>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {!uberHausMinion && (
                  <>
                    <Box fontSize='md' my={2}>
                      {`${daoMetaData?.name} is not a member of UberHAUS`}
                    </Box>
                    <Box fontSize='md' my={2}>
                      The 1st step to join is to summon a minion to help with
                      membership duties.
                    </Box>
                    {userNetworkMismatchOrNotMember ? (
                      <Box fontSize='md' my={2}>
                        Are you a member of this DAO and on the correct network?
                      </Box>
                    ) : (
                      <Box my={2} h={100} position='relative'>
                        <Button w='50%' onClick={openUberMinionModal}>
                          Summon Minion
                        </Button>
                      </Box>
                    )}
                  </>
                )}

                {isUberHausMember ? (
                  <>
                    <DaoToDaoMemberInfo
                      membership={uberHausMinion?.uberHausMembership}
                      delegate={uberHausMinion?.uberHausDelegate}
                      needDelegateKeySet={needDelegateKeySet}
                      openModal={openModal}
                      userNetworkMismatchOrNotMember={
                        userNetworkMismatchOrNotMember
                      }
                      isMember={isMember}
                      refetchAllies={refetchAllies}
                    />

                    <UberHausProposals
                      uberHausMinion={uberHausMinion}
                      uberMembers={uberMembers}
                      uberDelegate={uberHausMinion?.uberHausDelegate}
                    />

                    {uberHausMinion.openChildProposals.length ? (
                      <Flex
                        justifyContent='space-between'
                        alignItems='center'
                        mt={10}
                      >
                        <TextBox mb={2} size='sm'>
                          {`${uberHausMinion.openChildProposals.length} Active Proposals for UberHAUS`}
                        </TextBox>
                        <RouterLink to={`/dao/${daochain}/${daoid}/proposals`}>
                          <Icon
                            as={RiLoginBoxLine}
                            color='secondary.500'
                            h='25px'
                            w='25px'
                          />
                        </RouterLink>
                      </Flex>
                    ) : null}

                    {uberHausMinion.openUberProposals.length ? (
                      <Flex
                        justifyContent='space-between'
                        alignItems='center'
                        mt={10}
                      >
                        <TextBox mb={2} size='sm'>
                          {`${uberHausMinion.openUberProposals.length} Active Proposals in UberHAUS`}
                        </TextBox>
                        <RouterLink
                          to={`/dao/${UBERHAUS_DATA.NETWORK}/${UBERHAUS_DATA.ADDRESS}/proposals`}
                        >
                          <Icon
                            as={RiLoginBoxLine}
                            color='secondary.500'
                            h='25px'
                            w='25px'
                          />
                        </RouterLink>
                      </Flex>
                    ) : null}
                  </>
                ) : null}

                {uberParent ? (
                  <Box mt={10} borderTop='1px' py={5}>
                    <DaoToDaoUberAlly
                      dao={{
                        bodyText: `Your UberHAUS membership is managed here in this ${UBERHAUS_DATA.NETWORK_NAME} clone DAO`,
                        name: 'Visit your home dao',
                        link: `/dao/${
                          chainByName(uberParent.allyNetwork).chain_id
                        }/${uberParent.ally}/allies`,
                      }}
                    />
                  </Box>
                ) : null}
              </>
            )}
          </>
        )}
        {!isUberHausMember ? (
          <Box mt={7} mb={2} fontSize='sm'>
            <Link
              href='https://discord.gg/daohaus'
              target='_blank'
              rel='noreferrer noopener'
              color='secondary.500'
              my={3}
            >
              Need a hand? Get help in our Discord.
            </Link>
          </Box>
        ) : null}
      </ContentBox>
    </>
  );
};

export default DaoToDaoManager;
