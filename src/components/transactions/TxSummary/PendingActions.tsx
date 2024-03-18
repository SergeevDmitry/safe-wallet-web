import { Box } from '@mui/material'
import { getTransactionDetails, type TransactionSummary } from '@safe-global/safe-gateway-typescript-sdk'
import TxStatusLabel from '@/components/transactions/TxStatusLabel'
import { SpeedUpMonitor } from '@/features/speedup/components/SpeedUpMonitor'
import useAsync from '@/hooks/useAsync'
import { useAppSelector } from '@/store'
import { selectPendingTxById } from '@/store/pendingTxsSlice'

export const PendingActions = ({ tx }: { tx: TransactionSummary }) => {
  const pendingTx = useAppSelector((state) => selectPendingTxById(state, tx.id))

  const [txDetails, txDetailsLoading, txDetailError] = useAsync(() => {
    if (!pendingTx) return Promise.resolve(undefined)

    return getTransactionDetails(pendingTx.chainId, tx.id)
  }, [pendingTx, tx.id])

  return (
    <Box my={-1} mr={1} display={'flex'} flexDirection={'row'} alignItems={'center'} justifyContent={'center'}>
      {pendingTx && (
        <Box mr={2}>
          <SpeedUpMonitor txDetails={txDetails} txId={tx.id} pendingTx={pendingTx} modalTrigger={'alertButton'} />
        </Box>
      )}
      <TxStatusLabel tx={tx} />
    </Box>
  )
}
