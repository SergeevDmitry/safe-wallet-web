import { Box } from '@mui/material'
import { type TransactionSummary } from '@safe-global/safe-gateway-typescript-sdk'
import TxStatusLabel from '@/components/transactions/TxStatusLabel'
import { SpeedUpMonitor } from '@/features/speedup/components/SpeedUpMonitor'
import { useAppSelector } from '@/store'
import { selectPendingTxById } from '@/store/pendingTxsSlice'

export const PendingActions = ({ tx }: { tx: TransactionSummary }) => {
  const pendingTx = useAppSelector((state) => selectPendingTxById(state, tx.id))

  return (
    <Box my={-1} mr={2} display="flex" flexDirection="row" alignItems="center" justifyContent="flex-end">
      <TxStatusLabel tx={tx} />
      {pendingTx && (
        <Box ml={2}>
          <SpeedUpMonitor txId={tx.id} pendingTx={pendingTx} modalTrigger="alertButton" />
        </Box>
      )}
    </Box>
  )
}
