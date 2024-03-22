import { Alert, AlertTitle, Box, Button, SvgIcon, Typography } from '@mui/material'
import { SpeedUpModal } from '@/features/speedup/components/SpeedUpModal'
import Rocket from '@/public/images/common/rocket.svg'
import { useCounter } from '@/components/common/Notifications/useCounter'
import { useState } from 'react'
import { PendingStatus, type PendingTx } from '@/store/pendingTxsSlice'
import useAsync from '@/hooks/useAsync'
import { isSmartContract, useWeb3ReadOnly } from '@/hooks/wallets/web3'
import useWallet from '@/hooks/wallets/useWallet'
import { sameAddress } from '@/utils/addresses'

type SpeedUpMonitorProps = {
  txId: string
  pendingTx: PendingTx
  modalTrigger: 'alertBox' | 'alertButton'
}

const SPEED_UP_THRESHOLD_IN_SECONDS = 15

export const SpeedUpMonitor = ({ txId, pendingTx, modalTrigger = 'alertBox' }: SpeedUpMonitorProps) => {
  const [openSpeedUpModal, setOpenSpeedUpModal] = useState(false)
  const wallet = useWallet()
  const counter = useCounter(pendingTx.submittedAt)
  const web3ReadOnly = useWeb3ReadOnly()
  const [transaction] = useAsync(async () => {
    if (!pendingTx.txHash || !web3ReadOnly) return null
    return web3ReadOnly?.getTransaction(pendingTx.txHash)
  }, [pendingTx.txHash, web3ReadOnly])

  const [smartContract] = useAsync(async () => {
    if (!pendingTx.signerAddress || !web3ReadOnly) return false
    return await isSmartContract(web3ReadOnly, pendingTx.signerAddress)
  }, [pendingTx.signerAddress, web3ReadOnly])

  // We only care about processing txs, for everything else we don't show the speed up button
  if (
    pendingTx.status !== PendingStatus.PROCESSING ||
    !pendingTx.txHash ||
    !transaction ||
    !sameAddress(pendingTx.signerAddress, wallet?.address) ||
    smartContract
  ) {
    return null
  }

  if (!counter || counter < SPEED_UP_THRESHOLD_IN_SECONDS) {
    return null
  }

  return (
    <>
      <Box>
        <SpeedUpModal
          open={openSpeedUpModal}
          handleClose={() => setOpenSpeedUpModal(false)}
          tx={transaction}
          txId={txId}
          txHash={pendingTx.txHash}
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
