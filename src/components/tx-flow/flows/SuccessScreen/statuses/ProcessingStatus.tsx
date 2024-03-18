// Extract status handling into separate components
import { Box, Typography } from '@mui/material'
import { SpeedUpMonitor } from '@/features/speedup/components/SpeedUpMonitor'
import { type TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { type PendingTx } from '@/store/pendingTxsSlice'

type Props = {
  txDetails: undefined | TransactionDetails
  txId: string
  pendingTx: PendingTx
}
export const ProcessingStatus = ({ txDetails, txId, pendingTx }: Props) => (
  <Box paddingX={3} mt={3}>
    <Typography data-testid="transaction-status" variant="h6" marginTop={2} fontWeight={700}>
      Transaction is now processing
    </Typography>
    <Typography variant="body2" mb={3}>
      The transaction was confirmed and is now being processed.
    </Typography>
    <Box>
      <SpeedUpMonitor txDetails={txDetails} txId={txId} pendingTx={pendingTx} modalTrigger={'alertBox'} />
    </Box>
  </Box>
)
