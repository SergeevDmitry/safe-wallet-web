import { isSpeedableTx } from '../IsSpeedableTx'
import { PendingStatus } from '@/store/pendingTxsSlice'
import { type TransactionResponse } from 'ethers'

describe('isSpeedableTx', () => {
  it('returns true when all conditions are met', () => {
    const pendingTx = {
      status: PendingStatus.PROCESSING,
      txHash: '0x123',
      signerAddress: '0xabc',
      chainId: '1',
      safeAddress: '0xdef',
    }
    const onChainTx = {
      hash: '0x123',
      from: '0xabc',
    } as TransactionResponse
    const isSmartContract = false
    const walletAddress = '0xabc'

    const result = isSpeedableTx(pendingTx, onChainTx, isSmartContract, walletAddress)

    expect(result).toBe(true)
  })

  it('returns false when one of the conditions is not met', () => {
    const pendingTx = {
      status: PendingStatus.PROCESSING,
      // txHash: undefined,
      signerAddress: '0xabc',
      chainId: '1',
      safeAddress: '0xdef',
    }
    const onChainTx = {
      hash: '0x123',
      from: '0xabc',
    } as TransactionResponse
    const isSmartContract = false
    const walletAddress = '0xabc'

    const result = isSpeedableTx(pendingTx, onChainTx, isSmartContract, walletAddress)

    expect(result).toBe(false)
  })
})
