import { Cell } from "../boc/cell";
import { Contract } from "../contract/contract";
import Address from "./address";
import { bytesToHex } from "./utils";

export async function contractAddress(source: {
  workchain: number;
  initialCode: Cell;
  initialData: Cell;
}) {
  const stateInit = Contract.createStateInit(
    source.initialCode,
    source.initialData
  );
  const stateInitHash = await stateInit.hash();
  return new Address(source.workchain + ":" + bytesToHex(stateInitHash));
}
