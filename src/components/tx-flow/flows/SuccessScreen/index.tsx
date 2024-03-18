import StatusStepper from './StatusStepper'
import { Box, Button, Container, Divider, Paper, Typography } from '@mui/material'
import classnames from 'classnames'
import classNames from 'classnames'
import Link from 'next/link'
import css from './styles.module.css'
import { useAppSelector } from '@/store'
import { PendingStatus, selectPendingTxById } from '@/store/pendingTxsSlice'
import { useCallback, useContext, useEffect, useState } from 'react'
import { getTxLink } from '@/hooks/useTxNotifications'
import { useCurrentChain } from '@/hooks/useChains'
import { TxEvent, txSubscribe } from '@/services/tx/txEvents'
import useSafeInfo from '@/hooks/useSafeInfo'
import { TxModalContext } from '../..'
import { isTimeoutError } from '@/utils/ethers-utils'
import LoadingSpinner, { SpinnerStatus } from '@/components/new-safe/create/steps/StatusStep/LoadingSpinner'
import useAsync from '@/hooks/useAsync'
import { getTransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { SpeedUpMonitor } from '@/features/speedup/components/SpeedUpMonitor'

const SuccessScreen = ({ txId }: { txId: string }) => {
  const [localTxHash, setLocalTxHash] = useState<string>()
  const [error, setError] = useState<Error>()
  const { setTxFlow } = useContext(TxModalContext)
  const chain = useCurrentChain()
  const pendingTx = useAppSelector((state) => selectPendingTxById(state, txId))
  const { safeAddress } = useSafeInfo()
  const { txHash = '', status } = pendingTx || {}
  const txLink = chain && getTxLink(txId, chain, safeAddress)

  const [txDetails, txDetailsLoading, txDetailError] = useAsync(() => {
    if (!pendingTx) return Promise.resolve(undefined)

    return getTransactionDetails(pendingTx.chainId, txId)
  }, [pendingTx, txId])

  useEffect(() => {
    if (!txHash) return

    setLocalTxHash(txHash)
  }, [txHash])

  useEffect(() => {
    const unsubFns: Array<() => void> = ([TxEvent.FAILED, TxEvent.REVERTED] as const).map((event) =>
      txSubscribe(event, (detail) => {
        if (detail.txId === txId) setError(detail.error)
      }),
    )

    return () => unsubFns.forEach((unsubscribe) => unsubscribe())
  }, [txId])

  const onClose = useCallback(() => {
    setTxFlow(undefined)
  }, [setTxFlow])

  const isSuccess = status === undefined
  const spinnerStatus = error ? SpinnerStatus.ERROR : isSuccess ? SpinnerStatus.SUCCESS : SpinnerStatus.PROCESSING

  return (
    <Container
      component={Paper}
      disableGutters
      sx={{
        textAlign: 'center',
        maxWidth: `${900 - 75}px`, // md={11}
      }}
      maxWidth={false}
    >
      <div className={css.row}>
        <LoadingSpinner status={spinnerStatus} />
        {(status == PendingStatus.PROCESSING || status == PendingStatus.RELAYING) && (
          <>
            <Box paddingX={3} mt={3}>
              <Typography data-testid="transaction-status" variant="h6" marginTop={2} fontWeight={700}>
                Transaction is now processing
              </Typography>
              <Typography variant="body2" mb={3}>
                {' '}
                The transaction was confirmed and is now being processed.
              </Typography>
              {status == PendingStatus.PROCESSING && (
                <Box>
                  <SpeedUpMonitor txDetails={txDetails} txId={txId} pendingTx={pendingTx} modalTrigger={'alertBox'} />
                </Box>
              )}
            </Box>
          </>
        )}
        {status == PendingStatus.INDEXING && (
          <>
            <Box paddingX={3} mt={3}>
              <Typography data-testid="transaction-status" variant="h6" marginTop={2} fontWeight={700}>
                Transaction was processed
              </Typography>
            </Box>
            <Box className={classNames(css.instructions, error ? css.errorBg : css.infoBg)}>
              <Typography variant="body2"> It is now being indexed.</Typography>
            </Box>
          </>
        )}
        {![PendingStatus.PROCESSING, PendingStatus.RELAYING, PendingStatus.INDEXING].includes(status) && (
          <>
            <Box paddingX={3} mt={3}>
              <Typography data-testid="transaction-status" variant="h6" marginTop={2} fontWeight={700}>
                {error ? 'Transaction failed' : 'Transaction was successful'}
              </Typography>
            </Box>
            {error && (
              <Box className={classNames(css.instructions, error ? css.errorBg : css.infoBg)}>
                <Typography variant="body2">
                  {error ? (isTimeoutError(error) ? 'Transaction timed out' : error.message) : ''}
                </Typography>
              </Box>
            )}
          </>
        )}
      </div>

      {!error && (
        <>
          <Divider />
          <div className={css.row}>
            <StatusStepper status={status} txHash={localTxHash} />
          </div>
        </>
      )}

      <Divider />

      <div className={classnames(css.row, css.buttons)}>
        {txLink && (
          <Link {...txLink} passHref target="_blank" rel="noreferrer" legacyBehavior>
            <Button data-testid="view-transaction-btn" variant="outlined" size="small" onClick={onClose}>
              View transaction
            </Button>
          </Link>
        )}

        <Button data-testid="finish-transaction-btn" variant="contained" size="small" onClick={onClose}>
          Finish
        </Button>
      </div>
    </Container>
  )
}

export default SuccessScreen
