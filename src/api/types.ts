import type { components } from './schema'

type S = components['schemas']

export type ChatIn = S['ChatIn']
export type MainTurn = S['MainTurn']
export type CheckResult = S['CheckResult']
export type RuleHit = S['RuleHit']
export type CustomerBrief = S['CustomerBrief']
export type CustomerDetail = S['CustomerDetail']
export type LoanItem = S['LoanItem']
export type Willingness = S['Willingness']
export type SessionDetail = S['SessionDetail']
export type SessionRow = S['SessionRow']
export type SessionListItem = S['SessionListItem']
export type Message = S['Message']
export type MemoryItem = S['MemoryItem']
export type PostTask = S['PostTask']
export type Artifact = S['Artifact']
export type Todo = S['Todo']
export type CaseRow = S['CaseRow']
export type CaseDetail = S['CaseDetail']
export type AuditRow = S['AuditRow']
export type ConfigBrief = S['ConfigBrief']
export type ConfigDoc = S['ConfigDoc']
export type ConfigVersion = S['ConfigVersion']
export type RuleRow = S['RuleRow']
export type TemplateRow = S['TemplateRow']
export type RegistryGroup = S['RegistryGroup']

export interface TraceEvent {
  step: string
  name: string
  status: string
  detail: Record<string, unknown>
  ms: number
}

export type ChatRole = 'operator' | 'customer' | 'agent' | 'human_agent'

export const MODE_OPERATOR = '运营模式'
export const MODE_COLLECTION = '催收对话模式'
export const MODE_HANDOFF = '人工接管'
