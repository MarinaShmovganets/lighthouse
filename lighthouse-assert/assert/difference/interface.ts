import { IDiff } from "../types";

export interface IDifference {
  getDiff: () => IDiff;
  matchesExpectation: () => boolean;
}
