// import StatusMessage from './StatusMessage'
import StatusStepper from './StatusStepper'
import { Box, Button, Container, Divider, Grid, Paper, Typography, Alert, AlertTitle, SvgIcon } from '@mui/material'
import classnames from 'classnames'
import Link from 'next/link'
import css from './styles.module.css'
import { useAppSelector } from '@/store'
import { PendingStatus, selectPendingTxById } from '@/store/pendingTxsSlice'
import { useEffect, useState, useCallback, useContext } from 'react'
import { getTxLink } from '@/hooks/useTxNotifications'
import { useCurrentChain } from '@/hooks/useChains'
import { TxEvent, txSubscribe } from '@/services/tx/txEvents'
import useSafeInfo from '@/hooks/useSafeInfo'
import { TxModalContext } from '../..'
import classNames from 'classnames'
import { isTimeoutError } from '@/utils/ethers-utils'
import LoadingSpinner, { SpinnerStatus } from '@/components/new-safe/create/steps/StatusStep/LoadingSpinner'
import { useCounter } from '@/components/common/Notifications/useCounter'
import { SpeedupTxButton } from '@/components/common/Notifications/SpeedupTxButton'
import useAsync from '@/hooks/useAsync'
import { getTransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { RocketLaunchOutlined } from '@mui/icons-material'
import Rocket from '@/public/images/common/rocket.svg'
import ModalDialog from '@/components/common/ModalDialog'
import DialogContent from '@mui/material/DialogContent'
import ExternalLink from '@/components/common/ExternalLink'
import { HelpCenterArticle } from '@/config/constants'
import DialogActions from '@mui/material/DialogActions'
import RocketSpeedup from '@/public/images/common/ic-rocket-speedup.svg'
import GasParams from '@/components/tx/GasParams'
// import css from './styles.module.css'

const getStep = (status: PendingStatus, error?: Error) => {
  switch (status) {
    case PendingStatus.PROCESSING:
    case PendingStatus.RELAYING:
      return {
        description: 'Transaction is now processing',
        instruction: 'The transaction was confirmed and is now being processed.',

        classNames: '',
      }
    case PendingStatus.INDEXING:
      return {
        description: 'Transaction was processed',
        instruction: 'It is now being indexed.',
        classNames: classNames(css.instructions, error ? css.errorBg : css.infoBg),
      }
    default:
      return {
        description: error ? 'Transaction failed' : 'Transaction was successful',
        instruction: error ? (isTimeoutError(error) ? 'Transaction timed out' : error.message) : '',
        classNames: classNames(css.instructions, error ? css.errorBg : css.infoBg),
      }
  }
}

const StatusMessage = ({ status, error }: { status: PendingStatus; error?: Error }) => {
  const stepInfo = getStep(status, error)

  const isSuccess = status === undefined
  const spinnerStatus = error ? SpinnerStatus.ERROR : isSuccess ? SpinnerStatus.SUCCESS : SpinnerStatus.PROCESSING

  return (
    <>
      <Box paddingX={3} mt={3}>
        <LoadingSpinner status={spinnerStatus} />
        <Typography data-testid="transaction-status" variant="h6" marginTop={2} fontWeight={700}>
          {stepInfo.description}
        </Typography>
      </Box>
      {stepInfo.instruction && (
        <Box className={stepInfo.classNames}>
          <Typography variant="body2">{stepInfo.instruction}</Typography>
        </Box>
      )}
    </>
  )
}
const StatusMessageForStep = (step, spinner) => {
  return (
    <>
      <Box paddingX={3} mt={3}>
        {/*<LoadingSpinner status={spinnerStatus} />*/}
        <Typography data-testid="transaction-status" variant="h6" marginTop={2} fontWeight={700}>
          {step.description}
        </Typography>
      </Box>
      {step.instruction && (
        <Box className={step.classNames}>
          <Typography variant="body2">{step.instruction}</Typography>
        </Box>
      )}
      {step.customComponent && <Box>{step.customComponent}</Box>}
    </>
  )
}

const SpeedUpModal = ({ open, handleClose, txDetails, txId, signerAddress, signerNonce }) => {

  // const { nonce, userNonce, safeTxGas, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = params

  return (
    <ModalDialog open={open} onClose={handleClose} dialogTitle="Speed up transaction">

      <DialogContent sx={{ p: '24px !important' }}>
        <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
          <SvgIcon inheritViewBox component={RocketSpeedup} />
        </Box>
        <Typography data-testid="speedup-summary">
          This will speed up the pending transaction by <Typography component={'span'}
                                                                    fontWeight={700}>replacing</Typography> the original
          gas parameters with new ones.
        </Typography>

      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>

        <SpeedupTxButton signerAddress={signerAddress} signerNonce={signerNonce} txDetails={txDetails}
          buttonProps={{
            title: 'Confirm',
            variant: 'contained',
            disableElevation: true,
          }}/>
      </DialogActions>
    </ModalDialog>
  )
}
const SuccessScreen = ({ txId }: { txId: string }) => {
  const [localTxHash, setLocalTxHash] = useState<string>()
  const [error, setError] = useState<Error>()
  const [speedUpError, setSpeedUpError] = useState<Error>()
  const { setTxFlow } = useContext(TxModalContext)
  const chain = useCurrentChain()
  const pendingTx = useAppSelector((state) => selectPendingTxById(state, txId))
  const { safeAddress } = useSafeInfo()
  const { txHash = '', status } = pendingTx || {}
  const txLink = chain && getTxLink(txId, chain, safeAddress)

  const [openSpeedUpModal, setOpenSpeedUpModal] = useState(false)

  const [txDetails, txDetailsLoading, txDetailError] = useAsync(
    () => {
      if (!pendingTx) return Promise.resolve(undefined)

      return getTransactionDetails(pendingTx.chainId, txId)
    },
    [pendingTx, txId],
  )

  useEffect(() => {
    if (!txHash) return

    setLocalTxHash(txHash)
  }, [txHash])

  console.log('pending tx', pendingTx, status)
  useEffect(() => {
    const unsubFns: Array<() => void> = ([TxEvent.FAILED, TxEvent.REVERTED, TxEvent.SPEEDUP_FAILED] as const).map(
      (event) =>
        txSubscribe(event, (detail) => {
          if (detail.txId === txId) {
            if (event === TxEvent.SPEEDUP_FAILED) {
              setSpeedUpError(detail.error)
            } else {
              setError(detail.error)
            }
          }
        }),
    )

    return () => unsubFns.forEach((unsubscribe) => unsubscribe())
  }, [txId])

  const onClose = useCallback(() => {
    setTxFlow(undefined)
  }, [setTxFlow])

  const isSuccess = status === undefined
  const spinnerStatus = error ? SpinnerStatus.ERROR : isSuccess ? SpinnerStatus.SUCCESS : SpinnerStatus.PROCESSING

  const counter = useCounter(pendingTx?.submittedAt)

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
            </Box>
            <Box>
              <Typography variant="body2"> The transaction was confirmed and is now being processed.</Typography>
            </Box>
            {counter > 5 && (
              <>
                <Box mt={3}>
                  <SpeedUpModal
                    open={openSpeedUpModal}
                    handleClose={() => setOpenSpeedUpModal(false)}
                    txDetails={txDetails}
                    txId={txId}
                    signerAddress={pendingTx.signerAddress}
                    signerNonce={pendingTx.signerNonce}
                  />
                  <Alert
                    severity="warning"
                    icon={<SvgIcon component={Rocket} />}
                    action={
                      <Button onClick={() => setOpenSpeedUpModal(true)}>Speed up ></Button>
                      // <SpeedupTxButton
                      //   signerAddress={pendingTx.signerAddress}
                      //   signerNonce={pendingTx.signerNonce}
                      //   txDetails={txDetails}
                      // />
                    }
                  >
                    <AlertTitle>
                      <Typography textAlign={'left'}>Taking too long?</Typography>
                    </AlertTitle>
                    Try to speed up with better gas parameters.
                  </Alert>
                </Box>
              </>
            )}
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
            {error && (<Box className={classNames(css.instructions, error ? css.errorBg : css.infoBg)}>
              <Typography variant="body2">
                {error ? (isTimeoutError(error) ? 'Transaction timed out' : error.message) : ''}
              </Typography>
            </Box>)}

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
