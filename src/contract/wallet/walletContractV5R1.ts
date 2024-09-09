import BN from "bn.js";

import { Cell } from "../../boc/cell";
import TonHttpProvider from "../../providers/httpProvider";
import { Options } from "../contract";
import { WalletContract } from "./walletContract";

export class WalletV5ContractR1 extends WalletContract {
  constructor(provider: TonHttpProvider, options: Options) {
    options.code = Cell.oneFromBoc(
      "b5ee9c7241021401000281000114ff00f4a413f4bcf2c80b01020120020d020148030402dcd020d749c120915b8f6320d70b1f2082106578746ebd21821073696e74bdb0925f03e082106578746eba8eb48020d72101d074d721fa4030fa44f828fa443058bd915be0ed44d0810141d721f4058307f40e6fa1319130e18040d721707fdb3ce03120d749810280b99130e070e2100f020120050c020120060902016e07080019adce76a2684020eb90eb85ffc00019af1df6a2684010eb90eb858fc00201480a0b0017b325fb51341c75c875c2c7e00011b262fb513435c280200019be5f0f6a2684080a0eb90fa02c0102f20e011e20d70b1f82107369676ebaf2e08a7f0f01e68ef0eda2edfb218308d722028308d723208020d721d31fd31fd31fed44d0d200d31f20d31fd3ffd70a000af90140ccf9109a28945f0adb31e1f2c087df02b35007b0f2d0845125baf2e0855036baf2e086f823bbf2d0882292f800de01a47fc8ca00cb1f01cf16c9ed542092f80fde70db3cd81003f6eda2edfb02f404216e926c218e4c0221d73930709421c700b38e2d01d72820761e436c20d749c008f2e09320d74ac002f2e09320d71d06c712c2005230b0f2d089d74cd7393001a4e86c128407bbf2e093d74ac000f2e093ed55e2d20001c000915be0ebd72c08142091709601d72c081c12e25210b1e30f20d74a111213009601fa4001fa44f828fa443058baf2e091ed44d0810141d718f405049d7fc8ca0040048307f453f2e08b8e14038307f45bf2e08c22d70a00216e01b3b0f2d090e2c85003cf1612f400c9ed54007230d72c08248e2d21f2e092d200ed44d0d2005113baf2d08f54503091319c01810140d721d70a00f2e08ee2c8ca0058cf16c9ed5493f2c08de20010935bdb31e1d74cd0b4d6c35e"
    );
    super(provider, options);
    if (!this.options.walletId)
      this.options.walletId = 698983191 + this.options.wc!;
  }

  public getName() {
    return "w5";
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
}
