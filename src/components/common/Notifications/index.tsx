import type { ReactElement, SyntheticEvent } from 'react'
import { useCallback, useEffect } from 'react'
import groupBy from 'lodash/groupBy'
import { useAppDispatch, useAppSelector } from '@/store'
import type { Notification } from '@/store/notificationsSlice'
import { closeNotification, readNotification, selectNotifications } from '@/store/notificationsSlice'
import type { AlertColor, CircularProgressProps, SnackbarCloseReason } from '@mui/material'
import { Alert, Box, CircularProgress, Link, Snackbar, Stack, Typography } from '@mui/material'
import css from './styles.module.css'
import NextLink from 'next/link'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { OVERVIEW_EVENTS } from '@/services/analytics/events/overview'
import Track from '../Track'
import { isRelativeUrl } from '@/utils/url'
import { PendingStatus, PendingTx, selectActivePendingTxsBySafe } from '@/store/pendingTxsSlice'
import useChainId from '@/hooks/useChainId'
import useSafeAddress from '@/hooks/useSafeAddress'
import { getTransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync from '@/hooks/useAsync'
import { isMultisigDetailedExecutionInfo } from '@/utils/transaction-guards'
import { STATUS_LABELS } from '@/hooks/useTransactionStatus'
import { useCounter } from './useCounter'
import { SpeedupTxButton } from './SpeedupTxButton'

const toastStyle = { position: 'static', margin: 1 }

const CircularProgressWithLabel = (props: CircularProgressProps & { value: number }) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress {...props} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" component="div">{`
          ${props.value}s`}</Typography>
      </Box>
    </Box>
  )
}

const TxStatusLabel = ({ txStatus, seconds }: { txStatus: PendingStatus; seconds: number }) => {
  const statusLabel = STATUS_LABELS[txStatus]
  return (
    <Typography
      variant="caption"
      fontWeight="bold"
      display="flex"
      alignItems="center"
      gap={1}
      color={({ palette }) => (seconds > 30 ? palette.warning.light : palette.primary.main)}
    >
      <CircularProgressWithLabel size={32} color="inherit" value={seconds} />
      {statusLabel}
    </Typography>
  )
}

export const NotificationLink = ({
  link,
  onClick,
}: {
  link: Notification['link']
  onClick: (_: Event | SyntheticEvent) => void
}): ReactElement | null => {
  if (!link) {
    return null
  }

  const isExternal =
    typeof link.href === 'string' ? !isRelativeUrl(link.href) : !!(link.href.host || link.href.hostname)

  return (
    <Track {...OVERVIEW_EVENTS.NOTIFICATION_INTERACTION} label={link.title} as="span">
      <NextLink href={link.href} passHref legacyBehavior>
        <Link
          className={css.link}
          onClick={onClick}
          {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {link.title} <ChevronRightIcon />
        </Link>
      </NextLink>
    </Track>
  )
}

const PendingTx = ({
  tx,
  onClose,
}: {
  onClose: () => void
} & { tx: PendingTx & { txId: string } }) => {
  const [txDetails, txDetailsLoading, txDetailError] = useAsync(
    () => getTransactionDetails(tx.chainId, tx.txId),
    [tx.chainId, tx.txId],
  )

  const counter = useCounter(tx.submittedAt)

  const detailedExecutionInfo = txDetails?.detailedExecutionInfo
  const txNonce = isMultisigDetailedExecutionInfo(detailedExecutionInfo) ? detailedExecutionInfo.nonce : undefined

  return (
    <Snackbar open onClose={onClose} sx={toastStyle}>
      <Alert severity="info" onClose={onClose} elevation={1} sx={{ width: '420px' }}>
        <Typography variant="body2" fontWeight="700">
          {txDetails?.txInfo.humanDescription ?? 'Transaction'} {txNonce !== undefined && `#${txNonce}`}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" width="100%" justifyContent={'space-between'}>
          {txDetails?.txStatus && <TxStatusLabel txStatus={tx.status} seconds={counter ?? 0} />}
          {tx.status === PendingStatus.PROCESSING && counter !== undefined && counter > 30 && (
            <SpeedupTxButton signerAddress={tx.signerAddress} signerNonce={tx.signerNonce} txDetails={txDetails} />
          )}
        </Stack>
      </Alert>
    </Snackbar>
  )
}

const Toast = ({
  title,
  message,
  detailedMessage,
  variant,
  link,
  onClose,
  id,
}: {
  variant: AlertColor
  onClose: () => void
} & Notification) => {
  const dispatch = useAppDispatch()

  const handleClose = (_: Event | SyntheticEvent, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') return

    // Manually closed
    if (!reason) {
      dispatch(readNotification({ id }))
    }

    onClose()
  }

  const autoHideDuration = variant === 'info' || variant === 'success' ? 5000 : undefined

  return (
    <Snackbar open onClose={handleClose} sx={toastStyle} autoHideDuration={autoHideDuration}>
      <Alert severity={variant} onClose={handleClose} elevation={3} sx={{ width: '340px' }}>
        {title && (
          <Typography variant="body2" fontWeight="700">
            {title}
          </Typography>
        )}

        {message}

        {detailedMessage && (
          <details>
            <Link component="summary">Details</Link>
            <pre>{detailedMessage}</pre>
          </details>
        )}
        <NotificationLink link={link} onClick={handleClose} />
      </Alert>
    </Snackbar>
  )
}

const getVisibleNotifications = (notifications: Notification[]) => {
  return notifications.filter((notification) => !notification.isDismissed)
}

const Notifications = (): ReactElement | null => {
  const notifications = useAppSelector(selectNotifications)
  const dispatch = useAppDispatch()
  const chainId = useChainId()
  const safeAddress = useSafeAddress()
  const pendingTxs = useAppSelector((state) => selectActivePendingTxsBySafe(state, chainId, safeAddress))

  const visible = getVisibleNotifications(notifications)

  const visibleItems = visible.length + pendingTxs.length

  const handleClose = useCallback(
    (item: Notification) => {
      dispatch(closeNotification(item))
      item.onClose?.()
    },
    [dispatch],
  )

  // Close previous notifications in the same group
  useEffect(() => {
    const groups: Record<string, Notification[]> = groupBy(notifications, 'groupKey')

    Object.values(groups).forEach((items) => {
      const previous = getVisibleNotifications(items).slice(0, -1)
      previous.forEach(handleClose)
    })
  }, [notifications, handleClose])

  if (visibleItems === 0) {
    return null
  }

  return (
    <div className={css.container}>
      {visible.map((item) => (
        <div className={css.row} key={item.id}>
          <Toast {...item} onClose={() => handleClose(item)} />
        </div>
      ))}
      {pendingTxs.map((pendingTx) => (
        <div className={css.row} key={pendingTx.txId}>
          <PendingTx tx={pendingTx} onClose={() => {}} />
        </div>
      ))}
    </div>
  )
}

export default Notifications
