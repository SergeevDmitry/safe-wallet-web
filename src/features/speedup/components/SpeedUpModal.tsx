import useGasPrice from '@/hooks/useGasPrice'
import useGasLimit from '@/hooks/useGasLimit'
import ModalDialog from '@/components/common/ModalDialog'
import DialogContent from '@mui/material/DialogContent'
import { Box, Button, SvgIcon, Tooltip, Typography } from '@mui/material'
import RocketSpeedup from '@/public/images/common/ic-rocket-speedup.svg'
import DialogActions from '@mui/material/DialogActions'
import { useSafeTransaction } from '@/features/speedup/hooks/useSafeTransaction'
import useWallet from '@/hooks/wallets/useWallet'
import useOnboard from '@/hooks/wallets/useOnboard'
import useChainId from '@/hooks/useChainId'
import useSafeAddress from '@/hooks/useSafeAddress'
import { useAppDispatch } from '@/store'
import { dispatchTxSpeedUp } from '@/services/tx/tx-sender'
import { showNotification } from '@/store/notificationsSlice'
import { useCallback, useMemo, useState } from 'react'
import GasParams from '@/components/tx/GasParams'
import { type TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { asError } from '@/services/exceptions/utils'

type Props = {
  open: boolean
  handleClose: () => void
  txDetails: undefined | TransactionDetails
  txId: string
  signerAddress: string | undefined
  signerNonce: number | undefined | null
}
export const SpeedUpModal = ({ open, handleClose, txDetails, txId, signerAddress, signerNonce }: Props) => {
  const [gasPrice] = useGasPrice()
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false)
  const safeTx = useSafeTransaction(txDetails)
  const { gasLimit } = useGasLimit(safeTx)

  const wallet = useWallet()
  const onboard = useOnboard()
  const chainId = useChainId()
  const safeAddress = useSafeAddress()
  const hasActions = signerAddress && signerNonce !== undefined && signerAddress === wallet?.address
  const dispatch = useAppDispatch()

  const isDisabled = waitingForConfirmation || !wallet || !safeTx || !gasPrice || !txDetails || !onboard

  const speedUpFee = useMemo(
    () => ({
      ...gasPrice,
      maxFeePerGas: BigInt(gasPrice?.maxFeePerGas ?? 10n) + BigInt(gasPrice?.maxPriorityFeePerGas ?? 1n),
      maxPriorityFeePerGas: BigInt(gasPrice?.maxPriorityFeePerGas ?? 1n) * 2n,
    }),
    [gasPrice],
  )

  const onSubmit = useCallback(async () => {
    if (!wallet || !safeTx || !gasPrice || !txDetails || !onboard) {
      return null
    }

    try {
      setWaitingForConfirmation(true)
      await dispatchTxSpeedUp(
        safeTx,
        {
          nonce: signerNonce ?? undefined,
          gasLimit: gasLimit?.toString(),
          maxFeePerGas: speedUpFee.maxFeePerGas.toString(),
          maxPriorityFeePerGas: speedUpFee.maxPriorityFeePerGas.toString(),
        },
        txDetails.txId,
        onboard,
        chainId,
        safeAddress,
      )

      setWaitingForConfirmation(false)
      handleClose()
    } catch (e) {
      setWaitingForConfirmation(false)
      dispatch(
        showNotification({
          message: 'Speed up failed',
          variant: 'error',
          detailedMessage: asError(e).message,
          groupKey: txDetails.txId,
        }),
      )
    }
  }, [
    speedUpFee,
    gasLimit,
    safeTx,
    signerNonce,
    wallet,
    txDetails,
    onboard,
    chainId,
    safeAddress,
    dispatch,
    gasPrice,
    handleClose,
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
                nonce: safeTx?.data?.nonce,
                userNonce: signerNonce,
                gasLimit: gasLimit,
                maxFeePerGas: speedUpFee.maxFeePerGas,
                maxPriorityFeePerGas: speedUpFee.maxPriorityFeePerGas,
              }}
              isExecution={true}
              isEIP1559={true}
              willRelay={false}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>

        <Tooltip title="Speed up transaction">
          <Button color="primary" disabled={isDisabled} onClick={onSubmit} variant={'contained'} disableElevation>
            Confirm
          </Button>
        </Tooltip>
      </DialogActions>
    </ModalDialog>
  )
}
