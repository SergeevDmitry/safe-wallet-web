import useGasPrice from '@/hooks/useGasPrice'
import ModalDialog from '@/components/common/ModalDialog'
import DialogContent from '@mui/material/DialogContent'
import { Box, Button, SvgIcon, Tooltip, Typography } from '@mui/material'
import RocketSpeedup from '@/public/images/common/ic-rocket-speedup.svg'
import DialogActions from '@mui/material/DialogActions'
import useWallet from '@/hooks/wallets/useWallet'
import useOnboard from '@/hooks/wallets/useOnboard'
import useSafeAddress from '@/hooks/useSafeAddress'
import { useAppDispatch } from '@/store'
import { dispatchTxSpeedUp } from '@/services/tx/tx-sender'
import { showNotification } from '@/store/notificationsSlice'
import { useCallback, useState } from 'react'
import GasParams from '@/components/tx/GasParams'
import { asError } from '@/services/exceptions/utils'
import { getTxOptions } from '@/utils/transactions'
import { useCurrentChain, useHasFeature } from '@/hooks/useChains'
import { SimpleTxWatcher } from '@/utils/SimpleTxWatcher'
import { FEATURES } from '@/utils/chains'
import { isWalletRejection } from '@/utils/wallets'
import { type TransactionResponse } from 'ethers'

type Props = {
  open: boolean
  handleClose: () => void
  tx: TransactionResponse
  txId: string
  txHash: string
  signerAddress: string | undefined
  signerNonce: number | undefined | null
}
export const SpeedUpModal = ({ open, handleClose, tx, txId, txHash, signerAddress, signerNonce }: Props) => {
  const [speedUpFee] = useGasPrice(true)
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false)
  const { gasLimit } = tx
  const isEIP1559 = useHasFeature(FEATURES.EIP1559)

  const wallet = useWallet()
  const onboard = useOnboard()
  const chainInfo = useCurrentChain()
  const safeAddress = useSafeAddress()
  const hasActions = signerAddress && signerNonce !== undefined && signerAddress === wallet?.address
  const dispatch = useAppDispatch()

  const isDisabled = waitingForConfirmation || !wallet || !speedUpFee || !onboard

  const onSubmit = useCallback(async () => {
    if (!wallet || !speedUpFee || !onboard || !chainInfo || !tx.to) {
      return null
    }

    const txOptions = getTxOptions(
      {
        ...speedUpFee,
        userNonce: signerNonce ?? undefined,
        gasLimit: gasLimit,
      },
      chainInfo,
    )

    try {
      setWaitingForConfirmation(true)
      await dispatchTxSpeedUp(txOptions, txId, tx.to, tx.data, onboard, chainInfo?.chainId, safeAddress)

      if (txHash) {
        SimpleTxWatcher.getInstance().stopWatchingTxHash(txHash)
      }

      setWaitingForConfirmation(false)
      handleClose()
    } catch (e) {
      const error = asError(e)
      setWaitingForConfirmation(false)
      if (!isWalletRejection(error)) {
        dispatch(
          showNotification({
            message: 'Speed up failed',
            variant: 'error',
            detailedMessage: error.message,
            groupKey: txHash,
          }),
        )
      }
    }
  }, [
    wallet,
    speedUpFee,
    onboard,
    chainInfo,
    signerNonce,
    gasLimit,
    safeAddress,
    txHash,
    handleClose,
    dispatch,
    tx,
    txId,
  ])

  if (!hasActions) {
    return null
  }

  return (
    <ModalDialog open={open} onClose={handleClose} dialogTitle="Speed up transaction">
      <DialogContent sx={{ p: '24px !important' }}>
        <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
          <SvgIcon inheritViewBox component={RocketSpeedup} sx={{ width: 90, height: 90 }} />
        </Box>
        <Typography data-testid="speedup-summary">
          This will speed up the pending transaction by{' '}
          <Typography component={'span'} fontWeight={700}>
            replacing
          </Typography>{' '}
          the original gas parameters with new ones.
        </Typography>
        <Box mt={2}>
          {speedUpFee && signerNonce && (
            <GasParams
              params={{
                // nonce: safeTx?.data?.nonce,
                userNonce: signerNonce,
                gasLimit: gasLimit,
                maxFeePerGas: speedUpFee.maxFeePerGas,
                maxPriorityFeePerGas: speedUpFee.maxPriorityFeePerGas,
              }}
              isExecution={true}
              isEIP1559={isEIP1559}
              willRelay={false}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>

        <Tooltip title="Speed up transaction">
          <Button color="primary" disabled={isDisabled} onClick={onSubmit} variant={'contained'} disableElevation>
            {isDisabled ? 'Waiting on confirmation in wallet...' : 'Confirm'}
          </Button>
        </Tooltip>
      </DialogActions>
    </ModalDialog>
  )
}
