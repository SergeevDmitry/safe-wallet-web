import { Alert, AlertTitle, Box, Button, SvgIcon, Typography } from '@mui/material'
import { SpeedUpModal } from '@/features/speedup/components/SpeedUpModal'
import Rocket from '@/public/images/common/rocket.svg'
import { useCounter } from '@/components/common/Notifications/useCounter'
import { useState } from 'react'
import { type TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { type PendingTx } from '@/store/pendingTxsSlice'

type Props = {
  txDetails: undefined | TransactionDetails
  txId: string
  pendingTx: PendingTx
  modalTrigger: 'alertBox' | 'alertButton'
}

const SPEED_UP_THRESHOLD_IN_SECONDS = 15

export function SpeedUpMonitor({ txDetails, txId, pendingTx, modalTrigger = 'alertBox' }: Props) {
  const [openSpeedUpModal, setOpenSpeedUpModal] = useState(false)
  const counter = useCounter(pendingTx?.submittedAt)

  if (!counter || counter < SPEED_UP_THRESHOLD_IN_SECONDS) {
    return null
  }

  return (
    <>
      <Box>
        <SpeedUpModal
          open={openSpeedUpModal}
          handleClose={() => setOpenSpeedUpModal(false)}
          txDetails={txDetails}
          txId={txId}
          signerAddress={pendingTx.signerAddress}
          signerNonce={pendingTx.signerNonce}
        />
        {modalTrigger === 'alertBox' ? (
          <Alert
            severity="warning"
            icon={<SvgIcon component={Rocket} />}
            action={<Button onClick={() => setOpenSpeedUpModal(true)}>{`Speed up >`}</Button>}
          >
            <AlertTitle>
              <Typography textAlign={'left'}>Taking too long?</Typography>
            </AlertTitle>
            Try to speed up with better gas parameters.
          </Alert>
        ) : (
          <Button variant="outlined" size="small" sx={{ py: 0.6 }} onClick={() => setOpenSpeedUpModal(true)}>
            Speed up
          </Button>
        )}
      </Box>
    </>
  )
}
