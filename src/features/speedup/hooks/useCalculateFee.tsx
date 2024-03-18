import { type GasPriceFixedEIP1559 } from '@safe-global/safe-gateway-typescript-sdk/dist/types/chains'

export const useCalculateFee = (gasPrice: GasPriceFixedEIP1559) => {
  const calculateFee = () => {
    if (!gasPrice) {
      return null
    }

    const spedUpGasPrice = {
      ...gasPrice,
      maxFeePerGas: BigInt(gasPrice.maxFeePerGas ?? 10n) + BigInt(gasPrice.maxPriorityFeePerGas ?? 1n),
      maxPriorityFeePerGas: BigInt(gasPrice.maxPriorityFeePerGas ?? 1n) * 2n,
    }

    return spedUpGasPrice
  }

  return { calculateFee }
}