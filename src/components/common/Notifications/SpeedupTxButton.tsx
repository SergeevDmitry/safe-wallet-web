import { useSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import useChainId from '@/hooks/useChainId'
import useGasLimit from '@/hooks/useGasLimit'
import useGasPrice from '@/hooks/useGasPrice'
import useSafeAddress from '@/hooks/useSafeAddress'
import useOnboard from '@/hooks/wallets/useOnboard'
import useWallet from '@/hooks/wallets/useWallet'
import { createExistingTx, dispatchTxExecution } from '@/services/tx/tx-sender'
import { RocketLaunch } from '@mui/icons-material'
import { Tooltip, IconButton } from '@mui/material'
import { type SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { type TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { useEffect, useState } from 'react'

export const SpeedupTxButton = ({
  txDetails,
  signerAddress,
  signerNonce,
}: {
  txDetails: TransactionDetails | undefined
  signerAddress: string | undefined
  signerNonce: number | undefined | null
}) => {
  const wallet = useWallet()
  const onboard = useOnboard()
  const safeSdk = useSafeSDK()
  const chainId = useChainId()
  const safeAddress = useSafeAddress()
  const hasActions = signerAddress && signerNonce !== undefined && signerAddress === wallet?.address

  const [gasPrice] = useGasPrice()

  const [safeTx, setSafeTx] = useState<SafeTransaction>()

  const { gasLimit } = useGasLimit(safeTx)

  useEffect(() => {
    if (!txDetails || !safeSdk) {
      return
    }
    createExistingTx(chainId, safeAddress, txDetails.txId).then(setSafeTx)
  }, [chainId, safeAddress, txDetails, safeSdk])

  const isDisabled = !wallet || !safeTx || !gasPrice || !txDetails || !onboard

  const onSubmit = async () => {
    if (!wallet || !safeTx || !gasPrice || !txDetails || !onboard) {
      return null
    }

    const spedUpGasPrice = {
      ...gasPrice,
      maxFeePerGas: (gasPrice.maxFeePerGas ?? 10n) + (gasPrice.maxPriorityFeePerGas ?? 1n),
      maxPriorityFeePerGas: (gasPrice.maxPriorityFeePerGas ?? 1n) * 2n,
    }

    dispatchTxExecution(
      safeTx,
      {
        nonce: signerNonce ?? undefined,
        gasLimit: gasLimit?.toString(),
        maxFeePerGas: spedUpGasPrice.maxFeePerGas.toString(),
        maxPriorityFeePerGas: spedUpGasPrice.maxPriorityFeePerGas.toString(),
      },
      txDetails.txId,
      onboard,
      chainId,
      safeAddress,
    )
  }

  if (!hasActions) {
    return null
  }
  return (
    <Tooltip title="Speed up transaction">
      <IconButton color="primary" disabled={isDisabled} onClick={onSubmit}>
        <RocketLaunch />
      </IconButton>
    </Tooltip>
  )
}
