import BN from "bn.js";

import { Cell } from "../../boc/cell";
import TonHttpProvider from "../../providers/httpProvider";
import Address from "../../utils/address";
import { bytesToHex, toNano } from "../../utils/utils";
import { Contract, Options } from "../contract";
import { WalletContract } from "./walletContract";

interface DeployAndInstallPlugin {
  secretKey: Uint8Array;
  seqno: number;
  pluginWc: number;
  amount: BN;
  stateInit: Cell;
  body: Cell;
}

interface PluginParams {
  secretKey: Uint8Array;
  seqno: number;
  pluginAddress: string | Address;
  amount?: BN;
  queryId?: number;
}

export class WalletV4ContractR2 extends WalletContract {
  constructor(provider: TonHttpProvider, options: Options) {
    options.code = Cell.oneFromBoc(
      "B5EE9C72410214010002D4000114FF00F4A413F4BCF2C80B010201200203020148040504F8F28308D71820D31FD31FD31F02F823BBF264ED44D0D31FD31FD3FFF404D15143BAF2A15151BAF2A205F901541064F910F2A3F80024A4C8CB1F5240CB1F5230CBFF5210F400C9ED54F80F01D30721C0009F6C519320D74A96D307D402FB00E830E021C001E30021C002E30001C0039130E30D03A4C8CB1F12CB1FCBFF1011121302E6D001D0D3032171B0925F04E022D749C120925F04E002D31F218210706C7567BD22821064737472BDB0925F05E003FA403020FA4401C8CA07CBFFC9D0ED44D0810140D721F404305C810108F40A6FA131B3925F07E005D33FC8258210706C7567BA923830E30D03821064737472BA925F06E30D06070201200809007801FA00F40430F8276F2230500AA121BEF2E0508210706C7567831EB17080185004CB0526CF1658FA0219F400CB6917CB1F5260CB3F20C98040FB0006008A5004810108F45930ED44D0810140D720C801CF16F400C9ED540172B08E23821064737472831EB17080185005CB055003CF1623FA0213CB6ACB1FCB3FC98040FB00925F03E20201200A0B0059BD242B6F6A2684080A06B90FA0218470D4080847A4937D29910CE6903E9FF9837812801B7810148987159F31840201580C0D0011B8C97ED44D0D70B1F8003DB29DFB513420405035C87D010C00B23281F2FFF274006040423D029BE84C600201200E0F0019ADCE76A26840206B90EB85FFC00019AF1DF6A26840106B90EB858FC0006ED207FA00D4D422F90005C8CA0715CBFFC9D077748018C8CB05CB0222CF165005FA0214CB6B12CCCCC973FB00C84014810108F451F2A7020070810108D718FA00D33FC8542047810108F451F2A782106E6F746570748018C8CB05CB025006CF165004FA0214CB6A12CB1FCB3FC973FB0002006C810108D718FA00D33F305224810108F459F2A782106473747270748018C8CB05CB025005CF165003FA0213CB6ACB1F12CB3FC973FB00000AF400C9ED54696225E5"
    );
    super(provider, options);
    if (!this.options.walletId)
      this.options.walletId = 698983191 + this.options.wc!;
  }

  public deployAndInstallPlugin = (params: DeployAndInstallPlugin) =>
    Contract.createMethod(
      this.provider,
      this.deployAndInstallPluginImp(params)
    );

  public installPlugin = (params: PluginParams) =>
    Contract.createMethod(this.provider, this.installPluginImp(params));

  public getName() {
    return "v4R2";
  }

  /**
   * @override
   * @private
   * @param   seqno?   {number}
   * @param   withoutOp? {boolean}
   * @return {Cell}
   */
  protected createSigningMessage(seqno?: number, withoutOp?: boolean) {
    seqno = seqno || 0;
    const message = new Cell();
    message.bits.writeUint(this.options.walletId, 32);
    if (seqno === 0) {
      // message.bits.writeInt(-1, 32);// todo: dont work
      for (let i = 0; i < 32; i++) {
        message.bits.writeBit(1);
      }
    } else {
      const date = new Date();
      const timestamp = Math.floor(date.getTime() / 1e3);
      message.bits.writeUint(timestamp + 60, 32);
    }
    message.bits.writeUint(seqno, 32);
    if (!withoutOp) {
      message.bits.writeUint(0, 8); // op
    }
    return message;
  }

  /**
   * @override
   * @return {Cell} cell contains wallet data
   */
  protected createDataCell() {
    const cell = new Cell();
    cell.bits.writeUint(0, 32); // seqno
    cell.bits.writeUint(this.options.walletId, 32);
    cell.bits.writeBytes(this.options.publicKey);
    cell.bits.writeUint(0, 1); // plugins dict empty
    return cell;
  }

  /**
   * @param   params {{secretKey: Uint8Array, seqno: number, pluginWc: number, amount: BN, stateInit: Cell, body: Cell}}
   */
  private async deployAndInstallPluginImp(params: DeployAndInstallPlugin) {
    const { secretKey, seqno, pluginWc, amount, stateInit, body } = params;

    const signingMessage = this.createSigningMessage(seqno, true);
    signingMessage.bits.writeUint(1, 8); // op
    signingMessage.bits.writeInt(pluginWc, 8);
    signingMessage.bits.writeGrams(amount);
    signingMessage.refs.push(stateInit);
    signingMessage.refs.push(body);
    return this.createExternalMessage(signingMessage, secretKey, seqno, false);
  }

  /**
   * @private
   * @param   params {{secretKey: Uint8Array, seqno: number, pluginAddress: string | Address, amount?: BN, queryId?: number}}
   * @param   isInstall {boolean} install or uninstall
   */
  private async _setPlugin(params: PluginParams, isInstall: boolean) {
    const { secretKey, seqno, amount, queryId } = params;
    const pluginAddress = new Address(params.pluginAddress);

    const signingMessage = this.createSigningMessage(seqno, true);
    signingMessage.bits.writeUint(isInstall ? 2 : 3, 8); // op
    signingMessage.bits.writeInt(pluginAddress.wc, 8);
    signingMessage.bits.writeBytes(pluginAddress.hashPart);
    signingMessage.bits.writeGrams(amount || toNano("0.1"));
    signingMessage.bits.writeUint(queryId || 0, 64);

    return this.createExternalMessage(signingMessage, secretKey, seqno, false);
  }

  private async installPluginImp(params: PluginParams) {
    return this._setPlugin(params, true);
  }

  async removePlugin(params: PluginParams) {
    return this._setPlugin(params, false);
  }

  /**
   * @return {Promise<number>}
   */
  public getWalletId = async () => {
    const myAddress = await this.getAddress();
    const id: BN = await this.provider.call2(
      myAddress.toString(),
      "get_subwallet_id"
    );
    return id.toNumber();
  };

  /**
   * @return {Promise<BN>}
   */
  public getPublicKey = async () => {
    const myAddress = await this.getAddress();
    return this.provider.call2(myAddress.toString(), "get_public_key");
  };

  /**
   * @param pluginAddress {string | Address}
   * @return {Promise<boolean>}
   */
  public isPluginInstalled = async (pluginAddress: string | Address) => {
    pluginAddress = new Address(pluginAddress);
    const hashPart = "0x" + bytesToHex(pluginAddress.hashPart);

    const myAddress = await this.getAddress();
    const result = await this.provider.call2(
      myAddress.toString(),
      "is_plugin_installed",
      [
        ["num", pluginAddress.wc],
        ["num", hashPart],
      ]
    );
    return !result.isZero();
  };

  /**
   * @return {Promise<string[]>} plugins addresses
   */
  public getPluginsList = async () => {
    const parseAddress = (tuple: [BN, any]) =>
      tuple[0].toNumber() + ":" + tuple[1].toString(16);

    const myAddress = await this.getAddress();
    const result: [BN, any][] = await this.provider.call2(
      myAddress.toString(),
      "get_plugin_list"
    );
    return result.map(parseAddress);
  };
}
