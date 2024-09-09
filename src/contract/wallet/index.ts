import { WalletV2ContractR1, WalletV2ContractR2 } from "./walletContractV2";
import { WalletV3ContractR1, WalletV3ContractR2 } from "./walletContractV3";
import { WalletV4ContractR1 } from "./walletContractV4";
import { WalletV4ContractR2 } from "./walletContractV4R2";
import { WalletV5ContractR1 } from "./walletContractV5R1";

export * from "./walletContract";
export {
  WalletV2ContractR1,
  WalletV2ContractR2,
  WalletV3ContractR1,
  WalletV3ContractR2,
  WalletV4ContractR2,
  WalletV5ContractR1,
};

export const ALL = {
  v2R1: WalletV2ContractR1,
  v2R2: WalletV2ContractR2,
  v3R1: WalletV3ContractR1,
  v3R2: WalletV3ContractR2,
  v4R2: WalletV4ContractR2,
  w5: WalletV5ContractR1,
};

export const LIST = [
  WalletV2ContractR1,
  WalletV2ContractR2,
  WalletV3ContractR1,
  WalletV3ContractR2,
  WalletV4ContractR2,
  WalletV5ContractR1,
];

export const defaultVersion = "v4R2";
