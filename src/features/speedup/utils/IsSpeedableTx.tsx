import { PendingStatus, type PendingTx } from '@/store/pendingTxsSlice'
import { type TransactionResponse } from 'ethers'
import { sameAddress } from '@/utils/addresses'

export const isSpeedableTx = (
  pendingTx: PendingTx,
  onChainTx: TransactionResponse | null | undefined,
  isSmartContract: boolean | undefined,
  walletAddress: string,
) => {
  return (
    pendingTx.status === PendingStatus.PROCESSING &&
    !!pendingTx?.txHash &&
    onChainTx &&
    sameAddress(pendingTx.signerAddress, walletAddress) &&
    !isSmartContract
  )
}
