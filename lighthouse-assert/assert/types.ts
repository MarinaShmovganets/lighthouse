export interface IResult {
  initialUrl?: string;
  url: string;
  audits: IActualAudits;
}

export interface IExpectation {
  initialUrl?: string;
  url: string;
  audits: IExpectedAudits;
}

interface IActualAudits {
  [key: string]: IActualAudit
}

export interface IActualAudit {
  [key: string]: any;
}

export interface INoneObjectActualAudit {
  score: string|number;
  [key: string]: string|number;
}

export interface IBooleanActualAudit {
  score: boolean;
  [key: string]: boolean;
}

interface IExpectedAudits {
  [key: string]: IExpectedAudit;
}

export interface IExpectedAudit {
  score: IExpectedScore;
  [key: string]: IExpectedScore;
}

export interface INoneObjectExpectedAudit {
  score: IExpectedScore;
  [key: string]: IExpectedScore;
}

export interface IBooleanExpectedAudit {
  score: boolean;
  [key: string]: boolean;
}

interface IExpectedScore {
  error: string;
  warn: string;
  [key: string]: string;
}

export interface INormalizedExpectedScore {
  error: number;
  warn: number;
}

export interface ICollatedResult {
  finalUrl: {category: string; actual: string; expected: string; equal: boolean;};
  audits: Array<ICollatedAudit>;
}

export interface ICollatedAudit {
  category: string;
  actual: IActualAudit;
  expected: IExpectedAudit;
  equal: boolean;
  diff: IDiff|Object;
}

export interface IDiff extends Object {
  path?: string;
  actual?: string|number|boolean;
  expected?: IExpectedScore|boolean;
}

export interface IStatusCounts extends Object {
  passed: number;
  failed: number;
}
