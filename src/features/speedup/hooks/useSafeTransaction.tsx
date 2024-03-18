import type { TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { useSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import useChainId from '@/hooks/useChainId'
import useSafeAddress from '@/hooks/useSafeAddress'
import { useEffect, useState } from 'react'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { createExistingTx } from '@/services/tx/tx-sender'

export const useSafeTransaction = (txDetails: TransactionDetails | undefined) => {
  const safeSdk = useSafeSDK()
  const chainId = useChainId()
  const safeAddress = useSafeAddress()
  const [safeTx, setSafeTx] = useState<SafeTransaction>()

  useEffect(() => {
    if (!txDetails || !safeSdk) {
      return
    }
    createExistingTx(chainId, safeAddress, txDetails.txId).then(setSafeTx)
  }, [chainId, safeAddress, txDetails, safeSdk])

  return safeTx
}
